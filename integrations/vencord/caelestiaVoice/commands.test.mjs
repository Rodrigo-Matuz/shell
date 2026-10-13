import assert from "node:assert/strict";
import { test } from "node:test";
import { parseVoiceCommand, resolveVoiceActions, executeVoiceCommand } from "./commands.ts";

const call = { kind: "guild", id: "vc-1", name: "General", contextName: "Guild", icon: null };
const person = { id: "friend", name: "Friend", avatar: null, speaking: false, muted: false, deafened: false, localVolume: 75 };
const state = { connected: true, call, self: { muted: false, deafened: false }, participants: [person] };
const command = { version: 1, epoch: "0123456789abcdef0123456789abcdef", callId: "vc-1", action: "selfMute", value: true };

test("commands are versioned, exact, bounded and narrowly allowlisted", () => {
    assert.deepEqual(parseVoiceCommand(JSON.stringify(command)), command);
    for (const extra of [
        { ...command, version: 2 }, { ...command, dispatch: "SECRET" }, { ...command, action: "logout" },
        { ...command, epoch: "x" }, { ...command, callId: "x".repeat(81) },
        { ...command, value: "true" }, { ...command, action: "volume", userId: "friend", value: Infinity },
        { ...command, action: "volume", userId: "friend", value: -1 },
        { ...command, action: "volume", userId: "friend", value: 201 },
        { ...command, action: "volume", value: 10 },
        { ...command, action: "selfDeaf", userId: "friend" },
    ]) assert.throws(() => parseVoiceCommand(JSON.stringify(extra)));
    assert.deepEqual(parseVoiceCommand(JSON.stringify({ ...command, action: "volume", userId: "friend", value: 200 })), { ...command, action: "volume", userId: "friend", value: 200 });
    assert.throws(() => parseVoiceCommand("x".repeat(1025)));
});

test("unproven or missing high-level Webpack signatures never execute", async () => {
    let calls = 0;
    const find = () => ({ toggleSelfMute: () => { calls++; }, toggleSelfDeaf: () => { calls++; }, setLocalVolume: () => { calls++; } });
    const actions = resolveVoiceActions(find);
    assert.equal(actions, null);
    assert.equal(await executeVoiceCommand(command, { ...state, epoch: command.epoch }, actions), "unavailable");
    assert.equal(calls, 0);
});

test("named function declarations in loaded source are accepted only with the exact argument contract", () => {
    function toggleSelfMute({ location }) { return location; }
    function toggleSelfDeaf({ context, location }) { return [context, location]; }
    function setLocalVolume(userId, volume, context) { return [userId, volume, context]; }
    const find = (...props) => props.includes("toggleSelfMute") ? { toggleSelfMute, toggleSelfDeaf } : { setLocalVolume };
    assert.ok(resolveVoiceActions(find));
    assert.equal(resolveVoiceActions(() => ({ toggleSelfMute, toggleSelfDeaf, setLocalVolume(userId, volume) { return [userId, volume]; } })), null);
});

test("live transpiled high-level actions with defaulted context are recognized and called without guessing an enum", async () => {
    const calls = [];
    const toggles = {
        toggleSelfMute() { let { context: e = "DEFAULT", location: r } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}; calls.push({ type: "AUDIO_TOGGLE_SELF_MUTE", context: e, location: r }); },
        toggleSelfDeaf() { let { context: e = "DEFAULT", location: r } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}; calls.push({ type: "AUDIO_TOGGLE_SELF_DEAF", context: e, location: r }); },
    };
    const volumes = {
        setLocalVolume(e, t) { let n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : "DEFAULT"; calls.push({ type: "AUDIO_SET_LOCAL_VOLUME", userId: e, volume: t, context: n }); },
    };
    const actions = resolveVoiceActions((...props) => props.includes("toggleSelfMute") ? toggles : volumes);
    assert.ok(actions);
    const current = { ...state, epoch: command.epoch };
    assert.equal(await executeVoiceCommand(command, current, actions), "applied");
    assert.equal(await executeVoiceCommand({ ...command, action: "selfDeaf" }, current, actions), "applied");
    assert.equal(await executeVoiceCommand({ ...command, action: "volume", userId: "friend", value: 90 }, current, actions, "self"), "applied");
    assert.deepEqual(calls, [
        { type: "AUDIO_TOGGLE_SELF_MUTE", context: "DEFAULT", location: undefined },
        { type: "AUDIO_TOGGLE_SELF_DEAF", context: "DEFAULT", location: undefined },
        { type: "AUDIO_SET_LOCAL_VOLUME", userId: "friend", volume: 90, context: "DEFAULT" },
    ]);
});

test("call epoch, call ID, remote membership and toggle idempotence are checked before dispatch", async () => {
    const calls = [];
    const find = (...props) => props.includes("toggleSelfMute")
        ? { toggleSelfMute({ location }) { calls.push(["mute", location]); }, toggleSelfDeaf({ context, location }) { calls.push(["deaf", context, location]); } }
        : { setLocalVolume(userId, volume, context) { calls.push(["volume", userId, volume, context]); } };
    const actions = resolveVoiceActions(find);
    assert.ok(actions);
    const current = { ...state, epoch: command.epoch };
    assert.equal(await executeVoiceCommand({ ...command, epoch: "abcdef0123456789abcdef0123456789" }, current, actions), "stale");
    assert.equal(await executeVoiceCommand({ ...command, callId: "vc-other" }, current, actions), "stale");
    assert.equal(await executeVoiceCommand(command, { ...current, connected: false, call: null }, actions), "stale");
    assert.equal(await executeVoiceCommand({ ...command, action: "volume", userId: "outsider", value: 0 }, current, actions, "self"), "not-participant");
    assert.equal(await executeVoiceCommand({ ...command, action: "volume", userId: "self", value: 0 }, current, actions, "self"), "not-participant");
    assert.equal(await executeVoiceCommand({ ...command, value: false }, current, actions), "unchanged");
    assert.deepEqual(calls, []);
    assert.equal(await executeVoiceCommand(command, current, actions), "applied");
    assert.equal(await executeVoiceCommand({ ...command, action: "selfDeaf" }, current, actions), "applied");
    assert.equal(await executeVoiceCommand({ ...command, action: "volume", userId: "friend", value: 0 }, current, actions, "self"), "applied");
    assert.deepEqual(calls, [["mute", "default"], ["deaf", "default", "default"], ["volume", "friend", 0, "default"]]);
});
