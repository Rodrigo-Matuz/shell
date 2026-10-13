import assert from "node:assert/strict";
import { test } from "node:test";
import { readVoiceSnapshot } from "./readState.ts";

test("reads a connected guild call and resolves its server icon", () => {
    const snapshot = readVoiceSnapshot({
        selected: { getVoiceChannelId: () => "vc-1" },
        rtc: { isConnected: () => true, getChannelId: () => "vc-1" },
        channels: { getChannel: () => ({ id: "vc-1", type: 2, name: "General", guild_id: "guild-1" }) },
        guilds: { getGuild: () => ({ id: "guild-1", name: "My server", icon: "icon-hash" }) },
        users: { getUser: () => undefined },
        icons: { getGuildIconURL: () => "https://cdn.example/guild.png", getChannelIconURL: () => undefined },
    });
    assert.deepEqual(snapshot, {
        connected: true,
        call: { kind: "guild", id: "vc-1", name: "General", contextName: "My server", icon: "https://cdn.example/guild.png" },
    });
});

test("reads a connected private call without using the current user's avatar", () => {
    const snapshot = readVoiceSnapshot({
        selected: { getVoiceChannelId: () => "dm-1" },
        rtc: { isConnected: () => true, getChannelId: () => "dm-1" },
        channels: { getChannel: () => ({ id: "dm-1", type: 1, recipients: ["friend-1"] }) },
        guilds: { getGuild: () => undefined },
        users: { getUser: id => ({ id, globalName: "Friend", username: "friend", getAvatarURL: () => "https://cdn.example/friend.png" }) },
        icons: { getGuildIconURL: () => undefined, getChannelIconURL: () => undefined },
    });
    assert.deepEqual(snapshot, {
        connected: true,
        call: { kind: "private", id: "dm-1", name: "Friend", contextName: null, icon: "https://cdn.example/friend.png" },
    });
});

test("reads a group DM's custom icon", () => {
    const snapshot = readVoiceSnapshot({
        selected: { getVoiceChannelId: () => "group-1" },
        rtc: { isConnected: () => true, getChannelId: () => "group-1" },
        channels: { getChannel: () => ({ id: "group-1", type: 3, name: "Friends", icon: "group-hash" }) },
        guilds: { getGuild: () => undefined },
        users: { getUser: () => undefined },
        icons: { getGuildIconURL: () => undefined, getChannelIconURL: () => "https://cdn.example/group.png" },
    });
    assert.deepEqual(snapshot, {
        connected: true,
        call: { kind: "group", id: "group-1", name: "Friends", contextName: null, icon: "https://cdn.example/group.png" },
    });
});

test("reads self mute and deafen from Discord's media engine", () => {
    const snapshot = readVoiceSnapshot({
        selected: { getVoiceChannelId: () => "vc-1" },
        rtc: { isConnected: () => true, getChannelId: () => "vc-1" },
        channels: { getChannel: () => ({ id: "vc-1", type: 2, name: "General", guild_id: "guild-1" }) },
        guilds: { getGuild: () => ({ id: "guild-1", name: "My server" }) },
        users: { getUser: () => undefined },
        icons: { getGuildIconURL: () => undefined, getChannelIconURL: () => undefined },
        media: { isSelfMute: () => true, isSelfDeaf: () => false },
    });
    assert.deepEqual(snapshot.self, { muted: true, deafened: false });
});

test("guild roster includes connected voice states with Discord per-person volume", () => {
    const user = id => ({ id, globalName: id === "me" ? "Me" : "Friend", username: id, getAvatarURL: () => `https://cdn.discordapp.com/avatars/${id}/avatar.png` });
    const snapshot = readVoiceSnapshot({
        selected: { getVoiceChannelId: () => "vc-1" },
        rtc: { isConnected: () => true, getChannelId: () => "vc-1" },
        channels: { getChannel: () => ({ id: "vc-1", type: 2, name: "General", guild_id: "guild-1" }) },
        guilds: { getGuild: () => ({ id: "guild-1", name: "My server" }) },
        users: { getCurrentUser: () => user("me"), getUser: user },
        icons: { getGuildIconURL: () => undefined, getChannelIconURL: () => undefined },
        media: { isSelfMute: () => false, isSelfDeaf: () => false, getLocalVolume: () => 75 },
        voiceStates: { getVoiceStatesForChannel: () => ({
            me: { userId: "me", channelId: "vc-1", mute: false, deaf: false, selfMute: false, selfDeaf: false },
            friend: { userId: "friend", channelId: "vc-1", mute: false, deaf: false, selfMute: true, selfDeaf: false },
            stale: { userId: "stale", channelId: "vc-old", mute: false, deaf: false, selfMute: false, selfDeaf: false },
        }) },
        participants: { getParticipants: () => [{ type: 2, user: user("friend"), speaking: true }] },
    });
    assert.deepEqual(snapshot.participants, [
        { id: "me", name: "Me", avatar: "https://cdn.discordapp.com/avatars/me/avatar.png", speaking: false, muted: false, deafened: false, localVolume: null },
        { id: "friend", name: "Friend", avatar: "https://cdn.discordapp.com/avatars/friend/avatar.png", speaking: true, muted: true, deafened: false, localVolume: 75 },
    ]);
});

test("private RTC roster includes only joined user tiles with avatars and remote volume", () => {
    const user = id => ({ id, globalName: id, username: id, getAvatarURL: () => `https://cdn.discordapp.com/avatars/${id}/a.png` });
    const snapshot = readVoiceSnapshot({
        selected: { getVoiceChannelId: () => "dm-1" },
        rtc: { isConnected: () => true, getChannelId: () => "dm-1" },
        channels: { getChannel: () => ({ id: "dm-1", type: 1, recipients: ["friend"] }) },
        guilds: { getGuild: () => undefined },
        users: { getCurrentUser: () => user("me"), getUser: user },
        icons: { getGuildIconURL: () => undefined, getChannelIconURL: () => undefined },
        media: { isSelfMute: () => false, isSelfDeaf: () => false, getLocalVolume: () => 125 },
        participants: { getParticipants: () => [
            { type: 2, user: user("me"), speaking: true, voiceState: null },
            { type: 2, user: user("friend"), speaking: true, voiceState: { channelId: "dm-1", selfMute: true, selfDeaf: false, mute: false, deaf: false } },
            { type: 2, user: user("ringing"), ringing: true, voiceState: null },
            { type: 2, user: user("stale"), voiceState: { channelId: "other" } },
            { type: 3, user: user("stream"), speaking: true },
        ] },
    });
    assert.deepEqual(snapshot.participants, [
        { id: "me", name: "me", avatar: "https://cdn.discordapp.com/avatars/me/a.png", speaking: true, muted: false, deafened: false, localVolume: null },
        { id: "friend", name: "friend", avatar: "https://cdn.discordapp.com/avatars/friend/a.png", speaking: true, muted: true, deafened: false, localVolume: 125 },
    ]);
});

test("group RTC roster excludes CallStore ringing users and duplicate tiles", () => {
    const user = id => ({ id, username: id, getAvatarURL: () => `https://cdn.discordapp.com/avatars/${id}/a.png` });
    const snapshot = readVoiceSnapshot({
        selected: { getVoiceChannelId: () => "group-1" },
        rtc: { isConnected: () => true, getChannelId: () => "group-1" },
        channels: { getChannel: () => ({ id: "group-1", type: 3 }) },
        guilds: { getGuild: () => undefined },
        users: { getCurrentUser: () => user("me"), getUser: user },
        icons: { getGuildIconURL: () => undefined, getChannelIconURL: () => undefined },
        media: { isSelfMute: () => false, isSelfDeaf: () => false, getLocalVolume: id => id === "friend" ? 201 : 50 },
        calls: { getCall: () => ({ channelId: "group-1", ringing: ["ringing"] }) },
        participants: { getParticipants: () => [
            { type: 2, user: user("ringing"), speaking: true },
            { type: 2, user: user("friend"), speaking: true, voiceState: { channelId: "group-1", deaf: true } },
            { type: 3, user: user("friend") },
            { type: 2, user: user("friend"), speaking: false },
        ] },
    });
    assert.deepEqual(snapshot.participants, [
        { id: "friend", name: "friend", avatar: "https://cdn.discordapp.com/avatars/friend/a.png", speaking: true, muted: false, deafened: true, localVolume: null },
    ]);
});

test("disconnected DM never reads or emits a cached RTC roster", () => {
    const snapshot = readVoiceSnapshot({
        selected: { getVoiceChannelId: () => "dm-1" },
        rtc: { isConnected: () => false, getChannelId: () => "dm-1" },
        channels: { getChannel: () => ({ id: "dm-1", type: 1, recipients: ["friend"] }) },
        guilds: { getGuild: () => undefined },
        users: { getUser: id => ({ id, username: id, getAvatarURL: () => "https://cdn.discordapp.com/a.png" }) },
        icons: { getGuildIconURL: () => undefined, getChannelIconURL: () => undefined },
        participants: { getParticipants: () => { throw new Error("stale roster read"); } },
    });
    assert.deepEqual(snapshot, { connected: false, call: null });
});

test("mismatched selected channel does not read a different RTC roster", () => {
    const snapshot = readVoiceSnapshot({
        selected: { getVoiceChannelId: () => "dm-1" },
        rtc: { isConnected: () => true, getChannelId: () => "dm-1" },
        channels: { getChannel: () => ({ id: "dm-other", type: 1, recipients: ["friend"] }) },
        guilds: { getGuild: () => undefined },
        users: { getUser: () => undefined },
        icons: { getGuildIconURL: () => undefined, getChannelIconURL: () => undefined },
        participants: { getParticipants: () => { throw new Error("wrong channel roster read"); } },
    });
    assert.deepEqual(snapshot, { connected: false, call: null });
});
