import assert from "node:assert/strict";
import { test } from "node:test";
import { observeVoiceState } from "./observer.ts";

test("observer publishes initial and changed states and removes listeners on stop", async () => {
    let active = false;
    const listeners = new Set();
    const store = {
        addChangeListener(callback) { listeners.add(callback); },
        removeChangeListener(callback) { listeners.delete(callback); },
    };
    const published = [];
    const stop = observeVoiceState([store], () => ({ connected: active }), snapshot => published.push(snapshot));
    assert.deepEqual(published, [{ connected: false }]);
    active = true;
    for (const callback of listeners) callback();
    await Promise.resolve();
    assert.deepEqual(published, [{ connected: false }, { connected: true }]);
    stop();
    active = false;
    assert.equal(listeners.size, 0);
    await Promise.resolve();
    assert.deepEqual(published, [{ connected: false }, { connected: true }]);
});
