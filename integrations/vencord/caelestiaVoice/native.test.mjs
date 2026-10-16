import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { publishSnapshot, stopBridge } from "./native.ts";

function readSnapshot(socketPath) {
    return new Promise((resolve, reject) => {
        const socket = net.connect(socketPath);
        let text = "";
        socket.setEncoding("utf8");
        socket.on("data", chunk => text += chunk);
        socket.on("end", () => resolve(JSON.parse(text)));
        socket.on("error", reject);
    });
}

test("native IPC publishes only a validated snapshot on a private runtime socket", async () => {
    const oldRuntime = process.env.XDG_RUNTIME_DIR;
    const runtime = await mkdtemp(path.join(process.env.TMPDIR, "v-"));
    process.env.XDG_RUNTIME_DIR = runtime;
    const socketPath = path.join(runtime, "caelestia-voice", "discord-voice.sock");
    try {
        await assert.rejects(publishSnapshot({}, { connected: false, call: null, token: "not allowed" }), /field/i);
        await publishSnapshot({}, { connected: false, call: null });
        assert.deepEqual(await readSnapshot(socketPath), { version: 1, connected: false, call: null });
        assert.equal((await stat(path.dirname(socketPath))).mode & 0o777, 0o700);
        assert.equal((await stat(socketPath)).mode & 0o777, 0o600);
    } finally {
        await stopBridge({});
        if (oldRuntime === undefined) delete process.env.XDG_RUNTIME_DIR;
        else process.env.XDG_RUNTIME_DIR = oldRuntime;
        await rm(runtime, { recursive: true, force: true });
    }
});
