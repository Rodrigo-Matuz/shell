import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { createVoiceServer } from "./bridge.ts";

async function dial(socketPath) {
    const socket = net.connect(socketPath);
    let buffer = "";
    const frames = [];
    socket.setEncoding("utf8");
    socket.on("data", chunk => {
        buffer += chunk;
        while (buffer.includes("\n")) {
            const end = buffer.indexOf("\n");
            frames.push(JSON.parse(buffer.slice(0, end)));
            buffer = buffer.slice(end + 1);
        }
    });
    await new Promise(resolve => socket.once("connect", resolve));
    while (!frames.length) await new Promise(resolve => setTimeout(resolve, 5));
    return { socket, frames };
}

const call = { kind: "guild", id: "vc-1", name: "General", contextName: "Guild", icon: null };
const mute = (epoch, value = true) => ({ version: 1, epoch, callId: "vc-1", action: "selfMute", value });
const send = (socket, command) => socket.write(JSON.stringify(command) + "\n");

test("socket command rejects stale epochs, waits for readback, and closes pending work on disconnect", async () => {
    const runtime = await mkdtemp(path.join(process.env.TMPDIR, "voice-cmd-"));
    const socketPath = path.join(runtime, "voice.sock");
    const bridge = await createVoiceServer(socketPath);
    let closed = false;
    try {
        bridge.publish({ connected: true, call, self: { muted: false, deafened: false } });
        const first = await dial(socketPath);
        const epoch = first.frames[0].epoch;
        assert.match(epoch, /^[a-f0-9]{32}$/);
        send(first.socket, mute("0".repeat(32)));
        await new Promise(resolve => first.socket.once("end", resolve));
        assert.equal(first.frames[1].status, "stale");
        assert.equal(bridge.takeCommand(), null);

        const second = await dial(socketPath);
        send(second.socket, mute(epoch));
        let queued;
        while (!(queued = bridge.takeCommand())) await new Promise(resolve => setTimeout(resolve, 5));
        assert.equal(queued.command.action, "selfMute");
        assert.equal(bridge.isCommandActive(queued.id), true);
        bridge.finishCommand(queued.id, "applied");
        assert.equal(second.frames.length, 1);
        bridge.publish({ connected: true, call, self: { muted: true, deafened: false } });
        await new Promise(resolve => second.socket.once("end", resolve));
        assert.equal(second.frames[1].status, "ok");

        const third = await dial(socketPath);
        send(third.socket, { ...mute(epoch), action: "selfDeaf" });
        while (!(queued = bridge.takeCommand())) await new Promise(resolve => setTimeout(resolve, 5));
        const ended = new Promise(resolve => third.socket.once("end", resolve));
        await bridge.close();
        closed = true;
        await ended;
        assert.equal(third.frames[1].status, "disconnected");
    } finally {
        if (!closed) await bridge.close();
        await rm(runtime, { recursive: true, force: true });
    }
});

test("applied command without a matching readback times out rather than claiming success", async () => {
    const runtime = await mkdtemp(path.join(process.env.TMPDIR, "voice-cmd-"));
    const socketPath = path.join(runtime, "voice.sock");
    const bridge = await createVoiceServer(socketPath);
    try {
        bridge.publish({ connected: true, call, self: { muted: false, deafened: false } });
        const client = await dial(socketPath);
        send(client.socket, mute(client.frames[0].epoch));
        let queued;
        while (!(queued = bridge.takeCommand())) await new Promise(resolve => setTimeout(resolve, 5));
        bridge.finishCommand(queued.id, "applied");
        await new Promise(resolve => client.socket.once("end", resolve));
        assert.equal(client.frames[1].status, "timeout");
    } finally {
        await bridge.close();
        await rm(runtime, { recursive: true, force: true });
    }
});

test("socket rejects malformed commands and stale call transitions without executing", async () => {
    const runtime = await mkdtemp(path.join(process.env.TMPDIR, "voice-cmd-"));
    const socketPath = path.join(runtime, "voice.sock");
    const bridge = await createVoiceServer(socketPath);
    try {
        bridge.publish({ connected: true, call, self: { muted: false, deafened: false } });
        const invalid = await dial(socketPath);
        const oldEpoch = invalid.frames[0].epoch;
        send(invalid.socket, { ...mute(oldEpoch), token: "secret" });
        await new Promise(resolve => invalid.socket.once("end", resolve));
        assert.equal(invalid.frames[1].status, "invalid");
        const next = await dial(socketPath);
        send(next.socket, mute(oldEpoch));
        let queued;
        while (!(queued = bridge.takeCommand())) await new Promise(resolve => setTimeout(resolve, 5));
        bridge.publish({ connected: false, call: null });
        assert.equal(bridge.isCommandActive(queued.id), false);
        await new Promise(resolve => next.socket.once("end", resolve));
        assert.equal(next.frames[1].status, "stale");
        bridge.publish({ connected: true, call, self: { muted: false, deafened: false } });
        const newer = await dial(socketPath);
        assert.notEqual(newer.frames[0].epoch, oldEpoch);
        newer.socket.destroy();
    } finally {
        await bridge.close();
        await rm(runtime, { recursive: true, force: true });
    }
});
