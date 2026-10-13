export interface CallChannel {
    id: string;
    type: number;
    name?: string;
    guild_id?: string | null;
    icon?: string | null;
    iconUrl?: string | null;
    recipients?: string[];
}

export interface CallGuild {
    id: string;
    name: string;
    iconUrl?: string | null;
}

export interface CallUser {
    id: string;
    name: string;
    avatarUrl?: string | null;
}

export interface CallIdentity {
    kind: "guild" | "private" | "group";
    id: string;
    name: string;
    contextName: string | null;
    icon: string | null;
}

export interface VoiceParticipant {
    id: string;
    name: string;
    avatar: string | null;
    speaking: boolean;
    muted: boolean;
    deafened: boolean;
    localVolume: number | null;
}

export interface VoiceSnapshotInput {
    selectedChannelId?: string | null;
    rtcChannelId?: string | null;
    rtcConnected: boolean;
    channel?: CallChannel | null;
    guild?: CallGuild | null;
    recipient?: CallUser | null;
    self?: { muted: boolean; deafened: boolean; };
    participants?: VoiceParticipant[];
}

export function makeVoiceSnapshot(input: VoiceSnapshotInput): { connected: boolean; call: CallIdentity | null; self?: { muted: boolean; deafened: boolean; }; participants?: VoiceParticipant[]; } {
    if (!input.rtcConnected || !input.selectedChannelId || input.selectedChannelId !== input.rtcChannelId || input.channel?.id !== input.selectedChannelId) {
        return { connected: false, call: null };
    }
    const call = describeCall(input.channel, input.guild, input.recipient);
    return { connected: call !== null, call, ...(call && input.self ? { self: input.self } : {}), ...(call && input.participants ? { participants: input.participants } : {}) };
}

export function describeCall(channel: CallChannel, guild?: CallGuild | null, recipient?: CallUser | null): CallIdentity | null {
    if (channel.type === 2 && guild) {
        return {
            kind: "guild",
            id: channel.id,
            name: channel.name ?? "Voice channel",
            contextName: guild.name,
            icon: guild.iconUrl ?? null,
        };
    }
    if (channel.type === 1 && recipient) {
        return {
            kind: "private",
            id: channel.id,
            name: recipient.name,
            contextName: null,
            icon: recipient.avatarUrl ?? null,
        };
    }
    if (channel.type === 3) {
        return {
            kind: "group",
            id: channel.id,
            name: channel.name || "Group call",
            contextName: null,
            icon: channel.iconUrl ?? null,
        };
    }
    return null;
}
