pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Io
import "DiscordVoiceValidation.js" as VoiceValidation

Singleton {
    id: root

    readonly property string socketPath: Quickshell.env("XDG_RUNTIME_DIR")
        ? `${Quickshell.env("XDG_RUNTIME_DIR")}/caelestia-voice/discord-voice.sock` : ""
    property bool available: false
    property bool connected: false
    property var call: null
    property var self: null
    property var participants: []
    property string epoch: ""
    property bool controlsAvailable: false
    property bool busy: false
    property string lastCommandStatus: ""
    property var pendingCommand: null
    property bool commandHasSnapshot: false
    property bool inFlight: false
    property bool gotResponse: false

    function clear(): void {
        available = false;
        connected = false;
        call = null;
        self = null;
        participants = [];
        epoch = "";
        controlsAvailable = false;
        inFlight = false;
        watchdog.stop();
        if (pendingCommand)
            finishCommand("stale");
    }

    function accept(line: string): void {
        if (!inFlight)
            return;
        const frame = VoiceValidation.validateSnapshot(line);
        if (!frame) {
            clear();
            return;
        }
        gotResponse = true;
        inFlight = false;
        watchdog.stop();
        available = true;
        connected = frame.connected;
        call = frame.call;
        self = frame.self;
        participants = frame.participants;
        epoch = frame.epoch ?? "";
        controlsAvailable = !!frame.controlsAvailable;
        if (pendingCommand && (!frame.connected || frame.epoch !== pendingCommand.epoch || frame.call?.id !== pendingCommand.callId))
            finishCommand("stale");
        voiceSocket.connected = false;
    }

    function sendCommand(action, value, userId) {
        if (busy || !connected || !controlsAvailable || !/^[0-9a-f]{32}$/.test(epoch) || !call?.id)
            return false;
        const command = { version: 1, epoch, callId: call.id, action, value };
        if (action === "volume") {
            if (!Number.isFinite(value) || value < 0 || value > 200 || !participants.some(p => p.id === userId && p.localVolume !== null))
                return false;
            command.userId = userId;
        } else if ((action !== "selfMute" && action !== "selfDeaf") || typeof value !== "boolean" || !self)
            return false;
        pendingCommand = command;
        commandHasSnapshot = false;
        lastCommandStatus = "";
        busy = true;
        commandWatchdog.restart();
        commandSocket.connected = true;
        return true;
    }

    function finishCommand(status: string): void {
        lastCommandStatus = status;
        pendingCommand = null;
        busy = false;
        commandHasSnapshot = false;
        commandWatchdog.stop();
        commandSocket.connected = false;
    }

    function acceptCommand(line: string): void {
        if (!pendingCommand)
            return;
        if (!commandHasSnapshot) {
            const frame = VoiceValidation.validateSnapshot(line);
            if (!frame?.connected || !frame.controlsAvailable || frame.epoch !== pendingCommand.epoch || frame.call?.id !== pendingCommand.callId) {
                finishCommand("stale");
                return;
            }
            commandHasSnapshot = true;
            commandSocket.write(`${JSON.stringify(pendingCommand)}\n`);
            commandSocket.flush();
            return;
        }
        let response;
        try { response = JSON.parse(line); } catch (error) { finishCommand("invalid"); return; }
        const status = response?.version === 1 && typeof response.status === "string" ? response.status : "invalid";
        finishCommand(status);
        if (status === "ok" || status === "stale")
            refresh();
    }

    function refresh(): void {
        if (!socketPath) {
            clear();
            return;
        }
        if (inFlight || voiceSocket.connected)
            return;
        gotResponse = false;
        inFlight = true;
        watchdog.restart();
        voiceSocket.connected = true;
    }

    Timer {
        interval: root.available ? 1000 : 5000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: root.refresh()
    }

    Timer {
        id: watchdog
        interval: 1500
        onTriggered: {
            voiceSocket.connected = false;
            root.clear();
        }
    }

    Timer {
        id: commandWatchdog
        interval: 3800
        onTriggered: root.finishCommand("timeout")
    }

    Socket {
        id: voiceSocket
        path: root.socketPath
        parser: SplitParser {
            onRead: line => root.accept(line)
        }
        onConnectedChanged: {
            // An orderly close follows every response; an empty close is a failure.
            if (!connected && root.inFlight && !root.gotResponse)
                root.clear();
        }
        onError: {
            if (!root.gotResponse)
                root.clear();
        }
    }

    Socket {
        id: commandSocket
        path: root.socketPath
        parser: SplitParser {
            onRead: line => root.acceptCommand(line)
        }
        onConnectedChanged: {
            if (!connected && root.pendingCommand)
                root.finishCommand("disconnected");
        }
        onError: {
            if (root.pendingCommand)
                root.finishCommand("unavailable");
        }
    }
}
