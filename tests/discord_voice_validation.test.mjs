import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const script = readFileSync(new URL("../services/DiscordVoiceValidation.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(script, context);
const validate = text => JSON.parse(JSON.stringify(context.validateSnapshot(text)));

const call = { kind: "guild", id: "123", name: "General", contextName: "Server", icon: "https://cdn.discordapp.com/icons/1/a.png" };
const person = { id: "234", name: "Friend", avatar: "https://cdn.discordapp.com/avatars/2/a.png", muted: false, deafened: false, speaking: true, localVolume: 90 };

test("normalizes a connected call, self state and bounded guild roster", () => {
    assert.deepEqual(validate(JSON.stringify({ version: 1, connected: true, call, self: { muted: true, deafened: false }, participants: [person] })), {
        version: 1, connected: true, call, self: { muted: true, deafened: false }, participants: [person],
    });
});

test("private and group call rosters retain joined participants", () => {
    for (const kind of ["private", "group"]) {
        const frame = { version: 1, connected: true, call: { ...call, kind }, participants: [person] };
        assert.deepEqual(validate(JSON.stringify(frame)).participants, [person]);
    }
});

test("validator accepts a bounded action capability and call epoch", () => {
    const connected = validate(JSON.stringify({ version: 1, connected: true, call, epoch: "0123456789abcdef0123456789abcdef", controlsAvailable: true }));
    assert.equal(connected.controlsAvailable, true);
    assert.equal(connected.epoch, "0123456789abcdef0123456789abcdef");
    assert.equal(validate(JSON.stringify({ version: 1, connected: true, call, epoch: "bad", controlsAvailable: true })), null);
    assert.equal(validate(JSON.stringify({ version: 1, connected: true, call, controlsAvailable: "true" })), null);
});

test("disconnected response clears previously shown call data", () => {
    assert.deepEqual(validate('{"version":1,"connected":false,"call":null}'), { version: 1, connected: false, call: null, self: null, participants: [] });
});

test("rejects invalid, oversized and unsafe frames instead of retaining a call", () => {
    for (const frame of [
        "broken", "x".repeat(32769), JSON.stringify({ version: 2, connected: true, call }),
        JSON.stringify({ version: 1, connected: true, call: { ...call, name: "" } }),
        JSON.stringify({ version: 1, connected: true, call: { ...call, icon: "file:///etc/passwd" } }),
        JSON.stringify({ version: 1, connected: true, call, participants: [{ ...person, localVolume: 500 }] }),
        JSON.stringify({ version: 1, connected: true, call, participants: Array(65).fill(person) }),
    ]) assert.equal(validate(frame), null);
});
