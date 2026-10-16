import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { publishSnapshot, stopBridge, takeVoiceCommand, checkVoiceCommand, finishVoiceCommand } from "./native.ts";

test("native handoff gates readback and invalidates commands after stop", async () => {
    const oldRuntime = process.env.XDG_RUNTIME_DIR;
    const runtime = await mkdtemp(path.join(process.env.TMPDIR, "v-command-"));
    process.env.XDG_RUNTIME_DIR = runtime;
    const socketPath = path.join(runtime, "caelestia-voice", "discord-voice.sock");
    const call = { kind: "guild", id: "vc-1", name: "General", contextName: "Guild", icon: null };
    try {
        await publishSnapshot({}, { connected: true, call, self: { muted: false, deafened: false } });
        const socket = net.connect(socketPath);
        const frames = [];
        let text = "";
        socket.setEncoding("utf8");
        socket.on("data", chunk => {
            text += chunk;
            while (text.includes("\n")) {
                const i = text.indexOf("\n");
                frames.push(JSON.parse(text.slice(0, i)));
                text = text.slice(i + 1);
            }
        });
        await new Promise(resolve => socket.once("connect", resolve));
        while (!frames.length) await new Promise(resolve => setTimeout(resolve, 5));
        socket.write(JSON.stringify({ version: 1, epoch: frames[0].epoch, callId: call.id, action: "selfMute", value: true }) + "\n");
        let item;
        while (!(item = await takeVoiceCommand({}))) await new Promise(resolve => setTimeout(resolve, 5));
        assert.equal(await checkVoiceCommand({}, item.id), true);
        await finishVoiceCommand({}, item.id, "applied");
        assert.equal(frames.length, 1);
        await publishSnapshot({}, { connected: true, call, self: { muted: true, deafened: false } });
        await new Promise(resolve => socket.once("end", resolve));
        assert.equal(frames[1].status, "ok");
        assert.equal(await checkVoiceCommand({}, item.id), false);
        await stopBridge({});
        assert.equal(await takeVoiceCommand({}), null);
    } finally {
        await stopBridge({});
        if (oldRuntime === undefined) delete process.env.XDG_RUNTIME_DIR;
        else process.env.XDG_RUNTIME_DIR = oldRuntime;
        await rm(runtime, { recursive: true, force: true });
    }
});
