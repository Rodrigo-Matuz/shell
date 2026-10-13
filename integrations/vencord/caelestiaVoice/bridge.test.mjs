import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { createVoiceServer, validateVoiceMessage } from "./bridge.ts";

async function requestSnapshot(socketPath) {
    return await new Promise((resolve, reject) => {
        const socket = net.connect(socketPath);
        let payload = "";
        socket.setEncoding("utf8");
        socket.on("data", chunk => payload += chunk);
        socket.on("end", () => resolve(JSON.parse(payload)));
        socket.on("error", reject);
    });
}

test("read-only Unix socket reports an updated voice snapshot to a local client", async () => {
    const runtime = await mkdtemp(path.join(process.env.TMPDIR, "caelestia-voice-test-"));
    const socketPath = path.join(runtime, "voice.sock");
    const bridge = await createVoiceServer(socketPath);
    try {
        assert.deepEqual(await requestSnapshot(socketPath), { version: 1, connected: false, call: null });
        bridge.publish({ connected: true, call: { kind: "guild", id: "vc-1", name: "General", contextName: "Guild", icon: null } });
        const connected = await requestSnapshot(socketPath);
        assert.match(connected.epoch, /^[a-f0-9]{32}$/);
        assert.deepEqual(connected, {
            version: 1,
            epoch: connected.epoch,
            connected: true,
            call: { kind: "guild", id: "vc-1", name: "General", contextName: "Guild", icon: null },
        });
        assert.equal((await stat(socketPath)).mode & 0o777, 0o600);
    } finally {
        await bridge.close();
        await rm(runtime, { recursive: true, force: true });
    }
});

test("rejects arbitrary fields and malformed snapshots from the renderer", () => {
    assert.throws(() => validateVoiceMessage({ connected: true, call: null }), /call/i);
    assert.throws(() => validateVoiceMessage({ connected: false, call: null, token: "secret" }), /field/i);
    assert.throws(() => validateVoiceMessage({ connected: true, call: { kind: "guild", id: "a", name: "x".repeat(300), contextName: null, icon: null } }), /name/i);
    assert.deepEqual(validateVoiceMessage({ connected: false, call: null }), { connected: false, call: null });
});

test("voice action support is a bounded renderer capability, not inferred from a call", () => {
    const call = { kind: "guild", id: "vc-1", name: "General", contextName: "Guild", icon: null };
    assert.equal(validateVoiceMessage({ connected: true, call, controlsAvailable: true }).controlsAvailable, true);
    assert.throws(() => validateVoiceMessage({ connected: true, call, controlsAvailable: "true" }), /controls/i);
    assert.equal(validateVoiceMessage({ connected: false, call: null, controlsAvailable: false }).controlsAvailable, false);
});

test("validated bridge preserves self mute state and rejects malformed values", () => {
    const call = { kind: "guild", id: "vc-1", name: "General", contextName: "Guild", icon: null };
    assert.deepEqual(validateVoiceMessage({ connected: true, call, self: { muted: true, deafened: false } }), {
        connected: true, call, self: { muted: true, deafened: false },
    });
    assert.throws(() => validateVoiceMessage({ connected: true, call, self: { muted: "true", deafened: false } }), /self/i);
});

test("accepts bounded participant roster but rejects malformed or excessive data", () => {
    const call = { kind: "guild", id: "vc-1", name: "General", contextName: "Guild", icon: null };
    const person = { id: "friend", name: "Friend", avatar: "https://cdn.discordapp.com/avatars/friend/a.png", speaking: true, muted: false, deafened: false, localVolume: 75 };
    assert.deepEqual(validateVoiceMessage({ connected: true, call, participants: [person] }).participants, [person]);
    assert.throws(() => validateVoiceMessage({ connected: true, call, participants: [{ ...person, token: "secret" }] }), /field/i);
    assert.throws(() => validateVoiceMessage({ connected: true, call, participants: [{ ...person, avatar: "file:///etc/passwd" }] }), /avatar/i);
    assert.throws(() => validateVoiceMessage({ connected: true, call, participants: [{ ...person, localVolume: Infinity }] }), /volume/i);
    assert.throws(() => validateVoiceMessage({ connected: true, call, participants: Array(65).fill(person) }), /participants/i);
    assert.throws(() => validateVoiceMessage({ connected: false, call: null, participants: [person] }), /disconnected/i);
});

test("private and group calls accept bounded read-only rosters", () => {
    const person = { id: "friend", name: "Friend", avatar: "https://media.discordapp.net/avatars/friend/a.png", speaking: false, muted: true, deafened: false, localVolume: 200 };
    for (const kind of ["private", "group"]) {
        const call = { kind, id: "call-1", name: "Friends", contextName: null, icon: null };
        assert.deepEqual(validateVoiceMessage({ connected: true, call, participants: [person] }).participants, [person]);
        assert.throws(() => validateVoiceMessage({ connected: true, call, participants: [{ ...person, localVolume: -1 }] }), /volume/i);
        assert.throws(() => validateVoiceMessage({ connected: true, call, participants: [{ ...person, avatar: "https://example.org/x.png" }] }), /avatar/i);
        assert.throws(() => validateVoiceMessage({ connected: true, call, participants: Array(65).fill(person) }), /participants/i);
    }
});

test("stale socket left by a crashed owner is recovered on next launch", async () => {
    const runtime = await mkdtemp(path.join(process.env.TMPDIR, "stale-v-"));
    const socketPath = path.join(runtime, "voice.sock");
    try {
        const child = spawnSync(process.execPath, ["-e", "require('node:net').createServer().listen(process.argv[1], () => process.exit(0))", socketPath]);
        assert.equal(child.status, 0, child.stderr.toString());
        assert.equal((await stat(socketPath)).isSocket(), true);
        const bridge = await createVoiceServer(socketPath);
        try {
            assert.deepEqual(await requestSnapshot(socketPath), { version: 1, connected: false, call: null });
        } finally {
            await bridge.close();
        }
    } finally {
        await rm(runtime, { recursive: true, force: true });
    }
});
