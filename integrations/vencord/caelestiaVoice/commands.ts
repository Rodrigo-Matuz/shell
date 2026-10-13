import type { VoiceMessage } from "./bridge";

export type VoiceCommand = {
    version: 1;
    epoch: string;
    callId: string;
} & (
    | { action: "selfMute" | "selfDeaf"; value: boolean; }
    | { action: "volume"; userId: string; value: number; }
);

function record(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseVoiceCommand(line: string): VoiceCommand {
    if (typeof line !== "string" || line.length > 1024) throw new Error("Invalid command size");
    let value: unknown;
    try { value = JSON.parse(line); } catch { throw new Error("Invalid command JSON"); }
    if (!record(value) || value.version !== 1 || !/^[0-9a-f]{32}$/.test(String(value.epoch))
        || typeof value.callId !== "string" || value.callId.length === 0 || value.callId.length > 80) throw new Error("Invalid command envelope");
    const keys = Object.keys(value).sort().join(",");
    if (value.action === "selfMute" || value.action === "selfDeaf") {
        if (keys !== "action,callId,epoch,value,version" || typeof value.value !== "boolean") throw new Error("Invalid toggle");
        return value as VoiceCommand;
    }
    if (value.action === "volume") {
        if (keys !== "action,callId,epoch,userId,value,version" || typeof value.userId !== "string" || !/^[0-9A-Za-z_-]{1,80}$/.test(value.userId)
            || typeof value.value !== "number" || !Number.isFinite(value.value) || value.value < 0 || value.value > 200) throw new Error("Invalid volume");
        return value as VoiceCommand;
    }
    throw new Error("Unknown command");
}

type Actions = {
    toggleSelfMute(options: { location: string; }): unknown;
    toggleSelfDeaf(options: { context: string; location: string; }): unknown;
    setLocalVolume(userId: string, volume: number, context: string): unknown;
};

// A Webpack property match alone is not proof of the argument contract. Require
// unminified, named argument lists on the *loaded* functions. A minified or
// changed Discord bundle is unsupported, rather than guessed at.
function hasSignature(value: unknown, name: string, args: RegExp): value is Function {
    if (typeof value !== "function") return false;
    const source = Function.prototype.toString.call(value);
    if (source.includes("[native code]")) return false;
    const header = source.slice(0, source.indexOf(")") + 1).replace(/^(?:async\s+)?function\s+/, "").replace(/^async\s+/, "");
    return new RegExp(`^${name}\\s*\\(`).test(header) && args.test(header);
}

// The live Discord bundle transpiles default parameters into function bodies.
// Require the action event and default context in the *loaded* source, rather
// than assuming a Webpack property match proves its call signature.
function hasTranspiledAction(value: unknown, name: string, event: string, volume = false): value is Function {
    if (typeof value !== "function") return false;
    const source = Function.prototype.toString.call(value).replace(/\s+/g, "");
    if (source.includes("[nativecode]") || !source.startsWith(`${name}(${volume ? "e,t" : ""}){`)) return false;
    return source.includes(volume ? "arguments.length>2" : "arguments.length>0")
        && source.includes("context:") && source.includes(`type:"${event}"`)
        && (!volume || (source.includes("userId:e") && source.includes("volume:")));
}

export function resolveVoiceActions(findByProps: (...props: string[]) => unknown): Actions | null {
    try {
        const toggles = findByProps("toggleSelfMute", "toggleSelfDeaf");
        const volumes = findByProps("setLocalVolume");
        if (!record(toggles) || !record(volumes)) return null;
        if (hasSignature(toggles.toggleSelfMute, "toggleSelfMute", /^toggleSelfMute\s*\(\s*\{\s*location\s*\}\s*\)$/)
            && hasSignature(toggles.toggleSelfDeaf, "toggleSelfDeaf", /^toggleSelfDeaf\s*\(\s*\{\s*context\s*,\s*location\s*\}\s*\)$/)
            && hasSignature(volumes.setLocalVolume, "setLocalVolume", /^setLocalVolume\s*\(\s*userId\s*,\s*volume\s*,\s*context\s*\)$/)) {
            return { toggleSelfMute: toggles.toggleSelfMute as Actions["toggleSelfMute"], toggleSelfDeaf: toggles.toggleSelfDeaf as Actions["toggleSelfDeaf"], setLocalVolume: volumes.setLocalVolume as Actions["setLocalVolume"] };
        }
        if (hasTranspiledAction(toggles.toggleSelfMute, "toggleSelfMute", "AUDIO_TOGGLE_SELF_MUTE")
            && hasTranspiledAction(toggles.toggleSelfDeaf, "toggleSelfDeaf", "AUDIO_TOGGLE_SELF_DEAF")
            && hasTranspiledAction(volumes.setLocalVolume, "setLocalVolume", "AUDIO_SET_LOCAL_VOLUME", true)) {
            const mute = toggles.toggleSelfMute as () => unknown;
            const deaf = toggles.toggleSelfDeaf as () => unknown;
            const setVolume = volumes.setLocalVolume as (userId: string, volume: number) => unknown;
            return {
                toggleSelfMute: () => mute.call(toggles),
                toggleSelfDeaf: () => deaf.call(toggles),
                setLocalVolume: (userId, volume) => setVolume.call(volumes, userId, volume),
            };
        }
        return null;
    } catch { return null; }
}

export type CommandResult = "applied" | "unchanged" | "stale" | "not-participant" | "unavailable";

export async function executeVoiceCommand(command: VoiceCommand, state: VoiceMessage, actions: Actions | null, selfId?: string): Promise<CommandResult> {
    if (!state.connected || !state.call || state.epoch !== command.epoch || state.call.id !== command.callId) return "stale";
    if (!actions) return "unavailable";
    if (command.action === "volume") {
        if (!selfId || command.userId === selfId || !state.participants?.some(person => person.id === command.userId)) return "not-participant";
        if (state.participants.find(person => person.id === command.userId)?.localVolume === command.value) return "unchanged";
        await actions.setLocalVolume(command.userId, command.value, "default");
    } else {
        const previous = command.action === "selfMute" ? state.self?.muted : state.self?.deafened;
        if (previous === undefined) return "unavailable";
        if (previous === command.value) return "unchanged";
        if (command.action === "selfMute") await actions.toggleSelfMute({ location: "default" });
        else await actions.toggleSelfDeaf({ context: "default", location: "default" });
    }
    return "applied";
}
