import assert from "node:assert/strict";
import { test } from "node:test";
import { describeCall, makeVoiceSnapshot } from "./snapshot.ts";

test("guild voice call uses guild identity and channel name", () => {
    assert.deepEqual(
        describeCall(
            { id: "vc-1", type: 2, name: "General", guild_id: "guild-1" },
            { id: "guild-1", name: "My server", iconUrl: "https://cdn.example/guild.png" },
        ),
        {
            kind: "guild",
            id: "vc-1",
            name: "General",
            contextName: "My server",
            icon: "https://cdn.example/guild.png",
        },
    );
});

test("private call uses the other person's name and avatar", () => {
    assert.deepEqual(
        describeCall(
            { id: "dm-1", type: 1, recipients: ["user-2"] },
            null,
            { id: "user-2", name: "A friend", avatarUrl: "https://cdn.example/friend.png" },
        ),
        { kind: "private", id: "dm-1", name: "A friend", contextName: null, icon: "https://cdn.example/friend.png" },
    );
});

test("group call uses its icon and group name", () => {
    assert.deepEqual(
        describeCall({ id: "group-1", type: 3, name: "Project chat", iconUrl: "https://cdn.example/group.png" }),
        { kind: "group", id: "group-1", name: "Project chat", contextName: null, icon: "https://cdn.example/group.png" },
    );
});

test("selected voice channel without a connected RTC session is not a call", () => {
    assert.deepEqual(
        makeVoiceSnapshot({
            selectedChannelId: "vc-1",
            rtcChannelId: "vc-1",
            rtcConnected: false,
            channel: { id: "vc-1", type: 2, name: "General", guild_id: "guild-1" },
            guild: { id: "guild-1", name: "My server" },
            self: { muted: true, deafened: true },
            participants: [{ id: "friend", name: "Friend", avatar: null, speaking: true, muted: false, deafened: false, localVolume: 80 }],
        }),
        { connected: false, call: null },
    );
});

test("a live RTC connection for the selected channel produces a call", () => {
    assert.deepEqual(
        makeVoiceSnapshot({
            selectedChannelId: "vc-1",
            rtcChannelId: "vc-1",
            rtcConnected: true,
            channel: { id: "vc-1", type: 2, name: "General", guild_id: "guild-1" },
            guild: { id: "guild-1", name: "My server" },
        }),
        { connected: true, call: { kind: "guild", id: "vc-1", name: "General", contextName: "My server", icon: null } },
    );
});

test("connected call reports the client's own Discord mute and deaf states", () => {
    const result = makeVoiceSnapshot({
        selectedChannelId: "vc-1",
        rtcChannelId: "vc-1",
        rtcConnected: true,
        channel: { id: "vc-1", type: 2, name: "General", guild_id: "guild-1" },
        guild: { id: "guild-1", name: "My server" },
        self: { muted: true, deafened: false },
    });
    assert.deepEqual(result.self, { muted: true, deafened: false });
});

test("a stale selected channel is ignored after moving to another call", () => {
    assert.deepEqual(
        makeVoiceSnapshot({
            selectedChannelId: "vc-old",
            rtcChannelId: "vc-new",
            rtcConnected: true,
            channel: { id: "vc-old", type: 2, name: "Old", guild_id: "guild-1" },
            guild: { id: "guild-1", name: "My server" },
        }),
        { connected: false, call: null },
    );
});
