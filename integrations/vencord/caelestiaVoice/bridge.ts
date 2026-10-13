import { chmod, lstat, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import net from "node:net";

import { parseVoiceCommand, type CommandResult, type VoiceCommand } from "./commands";
import type { CallIdentity, VoiceParticipant } from "./snapshot";

export interface VoiceMessage {
    version: 1;
    epoch?: string;
    controlsAvailable?: boolean;
    connected: boolean;
    call: CallIdentity | null;
    self?: { muted: boolean; deafened: boolean; };
    participants?: VoiceParticipant[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactFields(value: Record<string, unknown>, allowed: readonly string[]) {
    if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error("Unexpected field in voice snapshot");
}

function boundedText(value: unknown, field: string, max = 256): string {
    if (typeof value !== "string" || value.length === 0 || value.length > max) throw new Error(`Invalid ${field}`);
    return value;
}

function discordImage(value: unknown, field: string): string {
    const url = new URL(boundedText(value, field, 1024));
    if (url.protocol !== "https:" || !["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname)) throw new Error(`Invalid ${field} URL`);
    return url.toString();
}

export function validateVoiceMessage(value: unknown): Omit<VoiceMessage, "version"> {
    if (!isRecord(value)) throw new Error("Invalid voice snapshot");
    exactFields(value, ["connected", "call", "self", "participants", "controlsAvailable"]);
    if (typeof value.connected !== "boolean") throw new Error("Invalid connected state");
    if (value.controlsAvailable !== undefined && typeof value.controlsAvailable !== "boolean") throw new Error("Invalid controls availability");
    const capability = value.controlsAvailable === undefined ? {} : { controlsAvailable: value.controlsAvailable };
    if (!value.connected) {
        if (value.call !== null || value.self !== undefined || value.participants !== undefined) throw new Error("Disconnected state must have no call, self state or participants");
        return { connected: false, call: null, ...capability };
    }
    if (!isRecord(value.call)) throw new Error("Connected state needs a call");
    const call = value.call;
    exactFields(call, ["kind", "id", "name", "contextName", "icon"]);
    if (call.kind !== "guild" && call.kind !== "private" && call.kind !== "group") throw new Error("Invalid call kind");
    const id = boundedText(call.id, "call id", 80);
    const name = boundedText(call.name, "call name");
    const contextName = call.contextName === null ? null : boundedText(call.contextName, "context name");
    const icon = call.icon === null ? null : discordImage(call.icon, "icon");
    let self: VoiceMessage["self"];
    if (value.self !== undefined) {
        if (!isRecord(value.self)) throw new Error("Invalid self state");
        exactFields(value.self, ["muted", "deafened"]);
        if (typeof value.self.muted !== "boolean" || typeof value.self.deafened !== "boolean") throw new Error("Invalid self state");
        self = { muted: value.self.muted, deafened: value.self.deafened };
    }
    let participants: VoiceParticipant[] | undefined;
    if (value.participants !== undefined) {
        if (!Array.isArray(value.participants) || value.participants.length > 64) throw new Error("Invalid participants");
        participants = value.participants.map(entry => {
            if (!isRecord(entry)) throw new Error("Invalid participant");
            exactFields(entry, ["id", "name", "avatar", "speaking", "muted", "deafened", "localVolume"]);
            const id = boundedText(entry.id, "participant id", 80);
            const name = boundedText(entry.name, "participant name");
            const avatar = entry.avatar === null ? null : discordImage(entry.avatar, "avatar");
            if (typeof entry.speaking !== "boolean" || typeof entry.muted !== "boolean" || typeof entry.deafened !== "boolean") throw new Error("Invalid participant state");
            if (entry.localVolume !== null && (typeof entry.localVolume !== "number" || !Number.isFinite(entry.localVolume) || entry.localVolume < 0 || entry.localVolume > 200)) throw new Error("Invalid participant volume");
            return { id, name, avatar, speaking: entry.speaking, muted: entry.muted, deafened: entry.deafened, localVolume: entry.localVolume };
        });
    }
    return { connected: true, call: { kind: call.kind, id, name, contextName, icon }, ...capability, ...(self ? { self } : {}), ...(participants ? { participants } : {}) };
}

async function isSocketReachable(socketPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const probe = net.connect(socketPath);
        probe.setTimeout(500, () => { probe.destroy(); reject(new Error("Could not determine whether voice socket is active")); });
        probe.once("connect", () => { probe.destroy(); resolve(true); });
        probe.once("error", (error: NodeJS.ErrnoException) => {
            if (error.code === "ECONNREFUSED") resolve(false);
            else reject(error);
        });
    });
}

export async function createVoiceServer(socketPath: string) {
    let message: VoiceMessage = { version: 1, connected: false, call: null };
    let epoch = randomBytes(16).toString("hex");
    let serial = 0;
    let closed = false;
    type Pending = { id: number; command: VoiceCommand; socket: net.Socket; timer: ReturnType<typeof setTimeout>; delivered: boolean; applied: boolean; };
    let pending: Pending | null = null;
    const queue: Pending[] = [];
    const satisfied = (command: VoiceCommand) => {
        if (command.action === "volume") return message.participants?.some(person => person.id === command.userId && person.localVolume === command.value) ?? false;
        return command.action === "selfMute" ? message.self?.muted === command.value : message.self?.deafened === command.value;
    };
    const reply = (request: Pending, status: string) => {
        clearTimeout(request.timer);
        if (pending === request) pending = null;
        const at = queue.indexOf(request);
        if (at !== -1) queue.splice(at, 1);
        if (!request.socket.destroyed) {
            request.socket.write(`${JSON.stringify({ version: 1, status })}\n`);
            setTimeout(() => request.socket.end(), 150);
        }
    };
    const server = net.createServer(socket => {
        // Quickshell's QLocalSocket may report PeerClosed before delivering data if
        // the peer ends in the same turn as its write. Give its reader a chance.
        socket.write(`${JSON.stringify(message)}\n`);
        const idle = setTimeout(() => socket.end(), 150);
        let input = "";
        let received = false;
        socket.setEncoding("utf8");
        socket.on("data", chunk => {
            clearTimeout(idle);
            if (received) { socket.end(`${JSON.stringify({ version: 1, status: "invalid" })}\n`); return; }
            input += chunk;
            if (input.length > 1024) { received = true; socket.end(`${JSON.stringify({ version: 1, status: "invalid" })}\n`); return; }
            const end = input.indexOf("\n");
            if (end === -1) return;
            received = true;
            let command: VoiceCommand;
            try {
                if (input.slice(end + 1).trim()) throw new Error("Multiple commands");
                command = parseVoiceCommand(input.slice(0, end));
            } catch { socket.end(`${JSON.stringify({ version: 1, status: "invalid" })}\n`); return; }
            if (!message.connected || command.epoch !== message.epoch || command.callId !== message.call?.id) {
                socket.end(`${JSON.stringify({ version: 1, status: "stale" })}\n`);
            } else if (pending) {
                socket.end(`${JSON.stringify({ version: 1, status: "busy" })}\n`);
            } else {
                const request: Pending = { id: ++serial, command, socket, delivered: false, applied: false,
                    timer: setTimeout(() => reply(request, "timeout"), 3000) };
                pending = request;
                queue.push(request);
            }
        });
        socket.on("close", () => { clearTimeout(idle); if (pending?.socket === socket) reply(pending, "disconnected"); });
    });
    const bind = () => new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(socketPath, () => {
            server.off("error", reject);
            resolve();
        });
    });
    try {
        try {
            await bind();
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error;
            const stale = await lstat(socketPath);
            if (!stale.isSocket() || stale.uid !== process.getuid?.() || await isSocketReachable(socketPath)) throw error;
            await unlink(socketPath);
            await bind();
        }
        await chmod(socketPath, 0o600);
    } catch (error) {
        if (server.listening) server.close();
        throw error;
    }
    return {
        publish(next: unknown) {
            const checked = validateVoiceMessage(next);
            if (message.connected !== checked.connected || (checked.connected && (message.call?.id !== checked.call?.id || message.call?.kind !== checked.call?.kind))) {
                epoch = randomBytes(16).toString("hex");
            }
            message = { version: 1, ...checked, ...(checked.connected ? { epoch } : {}) };
            if (pending) {
                if (pending.command.epoch !== message.epoch || pending.command.callId !== message.call?.id) reply(pending, "stale");
                else if (pending.applied && satisfied(pending.command)) reply(pending, "ok");
            }
        },
        takeCommand() {
            const request = queue.shift();
            if (!request || pending !== request || closed) return null;
            request.delivered = true;
            return { id: request.id, command: request.command };
        },
        isCommandActive(id: number) {
            return !closed && pending?.id === id && !pending.socket.destroyed && pending.command.epoch === message.epoch && pending.command.callId === message.call?.id;
        },
        finishCommand(id: number, result: CommandResult) {
            if (pending?.id !== id || !pending.delivered) return;
            if (result === "applied") {
                pending.applied = true;
                if (satisfied(pending.command)) reply(pending, "ok");
            } else reply(pending, result === "unchanged" ? "ok" : result);
        },
        async close() {
            closed = true;
            if (pending) reply(pending, "disconnected");
            // Node removes a bound Unix-domain socket on server.close().
            await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        },
    };
}
