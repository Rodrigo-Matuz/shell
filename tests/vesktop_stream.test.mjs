import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const script = readFileSync(new URL("../services/VesktopStream.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(script, context);
const findPlayback = context.findVesktopPlayback;

test("selects Vesktop output playback, never its microphone capture", () => {
    const capture = { properties: { "application.name": "vesktop", "media.class": "Stream/Input/Audio" } };
    const playback = { properties: { "application.name": "vesktop", "media.class": "Stream/Output/Audio" } };
    assert.equal(findPlayback([capture, playback]), playback);
    assert.equal(findPlayback([capture]), null);
    assert.equal(findPlayback([{ properties: { "application.name": "Other", "media.class": "Stream/Output/Audio" } }]), null);
});
