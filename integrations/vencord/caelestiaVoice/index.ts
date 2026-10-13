/*
 * Caelestia voice integration for Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import definePlugin, { PluginNative } from "@utils/types";
import { findByProps } from "@webpack";
import { CallStore, ChannelRTCStore, ChannelStore, GuildStore, IconUtils, MediaEngineStore, RTCConnectionStore, SelectedChannelStore, UserStore, VoiceStateStore } from "@webpack/common";

import { executeVoiceCommand, resolveVoiceActions } from "./commands";
import { observeVoiceState } from "./observer";
import { readVoiceSnapshot } from "./readState";

const logger = new Logger("CaelestiaVoice");
const Native = VencordNative.pluginHelpers.CaelestiaVoice as PluginNative<typeof import("./native")>;
let stopObserving: (() => void) | undefined;
let commandPoll: ReturnType<typeof setInterval> | undefined;
let snapshot: ReturnType<typeof readVoiceSnapshot> = { connected: false, call: null };

export default definePlugin({
    name: "CaelestiaVoice",
    description: "Reports active voice calls to Caelestia and exposes guarded call controls",
    authors: [],
    enabledByDefault: true,

    getSnapshot() {
        return snapshot;
    },

    start() {
        if (!SelectedChannelStore || !RTCConnectionStore || !ChannelStore || !GuildStore || !UserStore || !MediaEngineStore || !VoiceStateStore || !ChannelRTCStore || !IconUtils) {
            logger.warn("Voice stores are not ready; call reporting is unavailable");
            return;
        }
        const read = () => readVoiceSnapshot({
            selected: SelectedChannelStore,
            rtc: RTCConnectionStore,
            channels: ChannelStore,
            guilds: GuildStore,
            users: UserStore,
            media: MediaEngineStore,
            voiceStates: VoiceStateStore,
            participants: ChannelRTCStore,
            calls: CallStore,
            icons: IconUtils,
        });
        // The pinned Discord bundle may rename/minify these exports; expose
        // controls only when loaded high-level action signatures are verified.
        const actions = resolveVoiceActions(findByProps);
        stopObserving = observeVoiceState(
            [SelectedChannelStore, RTCConnectionStore, ChannelStore, GuildStore, UserStore, MediaEngineStore, VoiceStateStore, ChannelRTCStore, CallStore].filter(Boolean),
            read,
            next => {
                const previous = snapshot;
                snapshot = next;
                void Native.publishSnapshot({ ...next, controlsAvailable: !!actions }).catch((error: unknown) => logger.error("Could not publish voice state", error));
                if (previous.connected !== next.connected || previous.call?.kind !== next.call?.kind) {
                    // Never log channel/user names or IDs.
                    logger.info(next.connected ? `Call active (${next.call?.kind})` : "No active call");
                }
            },
        );
        // No write path is activated unless the *loaded* Webpack exports have
        // the explicit high-level signatures; unknown builds stay read-only.
        if (actions) {
            let busy = false;
            commandPoll = setInterval(() => {
                if (busy || !commandPoll) return;
                busy = true;
                void (async () => {
                    const item = await Native.takeVoiceCommand();
                    if (!item || !commandPoll) return;
                    if (!await Native.checkVoiceCommand(item.id) || !commandPoll) return;
                    let result: Awaited<ReturnType<typeof executeVoiceCommand>> = "unavailable";
                    try {
                        // Re-read RTC selection, call and roster immediately before
                        // invoking Discord; the previously published frame may be stale.
                        result = await executeVoiceCommand(item.command, { version: 1, epoch: item.command.epoch, ...read() }, actions, UserStore.getCurrentUser()?.id);
                    } catch { /* No payloads, identities or action errors in logs. */ }
                    await Native.finishVoiceCommand(item.id, result);
                })().catch(() => { /* The socket request has its own bounded timeout. */ }).finally(() => { busy = false; });
            }, 100);
        }
    },

    stop() {
        if (commandPoll) clearInterval(commandPoll);
        commandPoll = undefined;
        stopObserving?.();
        stopObserving = undefined;
        snapshot = { connected: false, call: null };
        void Native.stopBridge().catch((error: unknown) => logger.error("Could not stop voice bridge", error));
    },
});
