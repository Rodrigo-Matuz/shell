import type { IpcMainInvokeEvent } from "electron";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

import { createVoiceServer, validateVoiceMessage } from "./bridge";
import type { CommandResult } from "./commands";

let serverPromise: ReturnType<typeof createVoiceServer> | null = null;

async function startBridge() {
    const runtimeDir = process.env.XDG_RUNTIME_DIR;
    if (!runtimeDir) throw new Error("XDG_RUNTIME_DIR is required for Caelestia voice IPC");
    const directory = path.join(runtimeDir, "caelestia-voice");
    await mkdir(directory, { mode: 0o700, recursive: true });
    const details = await stat(directory);
    if (!details.isDirectory() || details.uid !== process.getuid?.() || (details.mode & 0o777) !== 0o700) {
        throw new Error("Unsafe Caelestia voice runtime directory");
    }
    return createVoiceServer(path.join(directory, "vesktop-voice.sock"));
}

export async function publishSnapshot(_event: IpcMainInvokeEvent, next: unknown) {
    const checked = validateVoiceMessage(next);
    serverPromise ??= startBridge();
    try {
        const server = await serverPromise;
        server.publish(checked);
    } catch (error) {
        serverPromise = null;
        throw error;
    }
}

export async function stopBridge(_event: IpcMainInvokeEvent) {
    const current = serverPromise;
    serverPromise = null;
    if (current) await (await current).close();
}

// Only hand off socket-validated, allowlisted commands; never forward arbitrary dispatches.
export async function takeVoiceCommand(_event: IpcMainInvokeEvent) {
    return (await serverPromise?.catch(() => null))?.takeCommand() ?? null;
}

export async function checkVoiceCommand(_event: IpcMainInvokeEvent, id: number) {
    return Number.isSafeInteger(id) && (await serverPromise?.catch(() => null))?.isCommandActive(id) === true;
}

export async function finishVoiceCommand(_event: IpcMainInvokeEvent, id: number, result: CommandResult) {
    if (!Number.isSafeInteger(id) || !["applied", "unchanged", "stale", "not-participant", "unavailable"].includes(result)) return;
    (await serverPromise?.catch(() => null))?.finishCommand(id, result);
}
