import { makeVoiceSnapshot, type CallChannel, type CallGuild, type CallUser, type VoiceParticipant } from "./snapshot";

interface GuildRecord {
    id: string;
    name: string;
    icon?: string | null;
}

interface UserRecord {
    id: string;
    globalName?: string | null;
    username: string;
    getAvatarURL(guildId?: string | null, size?: number, canAnimate?: boolean): string;
}

export interface VoiceStores {
    selected: { getVoiceChannelId(): string | null | undefined; };
    rtc: { isConnected(): boolean; getChannelId(): string | null | undefined; };
    channels: { getChannel(id: string): CallChannel | null | undefined; };
    guilds: { getGuild(id: string): GuildRecord | null | undefined; };
    users: { getUser(id: string): UserRecord | null | undefined; getCurrentUser?(): UserRecord | null | undefined; };
    media?: { isSelfMute(): boolean; isSelfDeaf(): boolean; getLocalVolume?(id: string): number; };
    voiceStates?: { getVoiceStatesForChannel(id: string): Record<string, { userId: string; channelId?: string | null; mute: boolean; deaf: boolean; selfMute: boolean; selfDeaf: boolean; }>; };
    participants?: { getParticipants(id: string): Array<{ type: number; user?: UserRecord; speaking?: boolean; ringing?: boolean; voiceState?: { channelId?: string | null; mute?: boolean; deaf?: boolean; selfMute?: boolean; selfDeaf?: boolean; } | null; }>; };
    // CallStore is optional until the caller supplies it; ChannelRTCStore's ringing flag still applies.
    calls?: { getCall(id: string): { channelId: string; ringing: string[]; } | null | undefined; };
    icons: {
        getGuildIconURL(data: { id: string; icon?: string; size?: number; }): string | undefined;
        getChannelIconURL(data: { id: string; icon?: string; size?: number; }): string | undefined;
    };
}

export function readVoiceSnapshot(stores: VoiceStores) {
    const selectedChannelId = stores.selected.getVoiceChannelId();
    const rtcChannelId = stores.rtc.getChannelId();
    const rtcConnected = stores.rtc.isConnected();
    if (!rtcConnected || !selectedChannelId || selectedChannelId !== rtcChannelId) {
        return makeVoiceSnapshot({ selectedChannelId, rtcChannelId, rtcConnected });
    }
    const channel = stores.channels.getChannel(selectedChannelId);
    if (channel?.id !== selectedChannelId) {
        return makeVoiceSnapshot({ selectedChannelId, rtcChannelId, rtcConnected, channel });
    }
    let guild: CallGuild | null = null;
    let recipient: CallUser | null = null;
    if (channel?.type === 2 && channel.guild_id) {
        const record = stores.guilds.getGuild(channel.guild_id);
        if (record) guild = { id: record.id, name: record.name, iconUrl: record.icon ? stores.icons.getGuildIconURL({ id: record.id, icon: record.icon, size: 128 }) : null };
    }
    if (channel?.type === 1 && channel.recipients?.length) {
        const user = stores.users.getUser(channel.recipients[0]);
        if (user) recipient = { id: user.id, name: user.globalName || user.username, avatarUrl: user.getAvatarURL(null, 128, true) };
    }
    const callChannel = channel?.type === 3
        ? { ...channel, iconUrl: channel.icon ? stores.icons.getChannelIconURL({ id: channel.id, icon: channel.icon, size: 128 }) : null }
        : channel;
    let roster: VoiceParticipant[] | undefined;
    if ((channel?.type === 1 || channel?.type === 3) && stores.participants) {
        const selfId = stores.users.getCurrentUser?.()?.id;
        const seen = new Set<string>();
        const call = stores.calls?.getCall(channel.id);
        const ringing = new Set(call?.channelId === channel.id ? call.ringing : []);
        roster = stores.participants.getParticipants(channel.id)
            .filter(participant => participant.type === 2 && !participant.ringing && participant.user
                && !ringing.has(participant.user.id)
                && (!participant.voiceState || participant.voiceState.channelId === channel.id))
            .slice(0, 64)
            .flatMap(participant => {
                const user = participant.user!;
                if (seen.has(user.id)) return [];
                seen.add(user.id);
                const state = participant.voiceState;
                const volume = user.id === selfId ? null : stores.media?.getLocalVolume?.(user.id);
                return [{
                    id: user.id,
                    name: user.globalName || user.username,
                    avatar: user.getAvatarURL(null, 64, true),
                    speaking: !!participant.speaking,
                    muted: !!(state?.mute || state?.selfMute),
                    deafened: !!(state?.deaf || state?.selfDeaf),
                    localVolume: typeof volume === "number" && Number.isFinite(volume) && volume >= 0 && volume <= 200 ? volume : null,
                }];
            });
    }
    if (channel?.type === 2 && stores.voiceStates) {
        const selfId = stores.users.getCurrentUser?.()?.id;
        const rtcParticipants = stores.participants?.getParticipants(channel.id) ?? [];
        roster = Object.values(stores.voiceStates.getVoiceStatesForChannel(channel.id))
            .filter(state => state.channelId === channel.id)
            .slice(0, 64)
            .flatMap(state => {
                const user = stores.users.getUser(state.userId);
                if (!user) return [];
                const volume = state.userId === selfId ? null : stores.media?.getLocalVolume?.(state.userId);
                return [{
                    id: user.id,
                    name: user.globalName || user.username,
                    avatar: user.getAvatarURL(null, 64, true),
                    speaking: rtcParticipants.some(participant => participant.type === 2 && participant.user?.id === user.id && !participant.ringing && !!participant.speaking),
                    muted: !!(state.mute || state.selfMute),
                    deafened: !!(state.deaf || state.selfDeaf),
                    localVolume: typeof volume === "number" && Number.isFinite(volume) && volume >= 0 && volume <= 200 ? volume : null,
                }];
            });
    }
    return makeVoiceSnapshot({
        selectedChannelId,
        rtcChannelId,
        rtcConnected,
        channel: callChannel,
        guild,
        recipient,
        self: stores.media ? { muted: stores.media.isSelfMute(), deafened: stores.media.isSelfDeaf() } : undefined,
        participants: roster,
    });
}
