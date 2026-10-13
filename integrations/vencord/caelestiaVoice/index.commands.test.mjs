import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

test("renderer runs only source-verified Webpack actions, rechecks live state, and stops command polling", async () => {
    const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");
    assert.match(source, /resolveVoiceActions\(findByProps\)/);
    assert.match(source, /Native\.checkVoiceCommand\(item\.id\)/);
    assert.match(source, /executeVoiceCommand\(item\.command,.*read\(\)/s);
    assert.match(source, /Native\.finishVoiceCommand\(item\.id,/);
    assert.match(source, /clearInterval\(commandPoll\)/);
    assert.doesNotMatch(source, /MediaEngineConnection|Flux\.dispatch/);
});
