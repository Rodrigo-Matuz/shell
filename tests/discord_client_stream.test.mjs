import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const script = readFileSync(new URL("../services/DiscordClientStream.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(script, context);
const findPlayback = context.findDiscordClientPlayback;

test("selects Vesktop and Equibop output playback, never microphone capture", () => {
    const vesktopCapture = { properties: { "application.name": "vesktop", "media.class": "Stream/Input/Audio" } };
    const vesktopPlayback = { properties: { "application.name": "Vesktop", "media.class": "Stream/Output/Audio" } };
    const equibopCapture = { properties: { "application.name": "equibop", "media.class": "Stream/Input/Audio" } };
    const equibopPlayback = { properties: { "application.name": "Equibop", "media.class": "Stream/Output/Audio" } };

    assert.equal(findPlayback([vesktopCapture, vesktopPlayback]), vesktopPlayback);
    assert.equal(findPlayback([equibopCapture, equibopPlayback]), equibopPlayback);
});

test("falls back to PipeWire process metadata when application name is absent", () => {
    const playback = { properties: { "media.class": "Stream/Output/Audio", "application.process.binary": "equibop" } };
    assert.equal(findPlayback([playback]), playback);
});

test("ignores unrelated output streams", () => {
    assert.equal(findPlayback([{ properties: { "application.name": "Other", "media.class": "Stream/Output/Audio" } }]), null);
});
