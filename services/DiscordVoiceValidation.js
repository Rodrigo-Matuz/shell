// Shared by the Quickshell service and the Node contract test. Never log a frame.
function validateSnapshot(text) {
    if (typeof text !== "string" || text.length > 32768)
        return null;

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        return null;
    }

    const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
    const bounded = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max;
    const image = value => value === null || (bounded(value, 1024) && /^https:\/\/(cdn\.discordapp\.com|media\.discordapp\.net)\//.test(value));
    if (!record(data) || data.version !== 1 || typeof data.connected !== "boolean")
        return null;
    if (data.controlsAvailable !== undefined && typeof data.controlsAvailable !== "boolean")
        return null;
    if (data.epoch !== undefined && (typeof data.epoch !== "string" || !/^[0-9a-f]{32}$/.test(data.epoch)))
        return null;
    if (!data.connected)
        return data.call === null ? { version: 1, connected: false, call: null, self: null, participants: [] } : null;

    const call = data.call;
    if (!record(call) || !["guild", "private", "group"].includes(call.kind)
            || !bounded(call.id, 80) || !bounded(call.name, 256)
            || !(call.contextName === null || bounded(call.contextName, 256)) || !image(call.icon))
        return null;
    const self = data.self;
    if (self !== undefined && (!record(self) || typeof self.muted !== "boolean" || typeof self.deafened !== "boolean"))
        return null;
    const participants = data.participants ?? [];
    if (!Array.isArray(participants) || participants.length > 64)
        return null;
    const roster = [];
    for (const participant of participants) {
        if (!record(participant) || !bounded(participant.id, 80) || !bounded(participant.name, 256)
                || !image(participant.avatar) || typeof participant.speaking !== "boolean"
                || typeof participant.muted !== "boolean" || typeof participant.deafened !== "boolean"
                || !(participant.localVolume === null || (typeof participant.localVolume === "number"
                    && Number.isFinite(participant.localVolume) && participant.localVolume >= 0 && participant.localVolume <= 200)))
            return null;
        roster.push({ id: participant.id, name: participant.name, avatar: participant.avatar,
            speaking: participant.speaking, muted: participant.muted, deafened: participant.deafened,
            localVolume: participant.localVolume });
    }
    const normalized = { version: 1, connected: true,
        call: { kind: call.kind, id: call.id, name: call.name, contextName: call.contextName, icon: call.icon },
        self: self ? { muted: self.muted, deafened: self.deafened } : null, participants: roster };
    if (data.epoch)
        normalized.epoch = data.epoch;
    if (data.controlsAvailable !== undefined)
        normalized.controlsAvailable = data.controlsAvailable;
    return normalized;
}
