pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Io

Singleton {
    id: root

    property bool running: false
    property bool paused: false
    property real elapsed: 0
    property bool available: false
    property bool pending: false
    property string statusError: ""
    property string commandError: ""
    readonly property string error: root.commandError || root.statusError
    property int refCount: 0
    property bool refreshAfterCommand: false
    property bool commandFinished: false

    function refresh(): void {
        if (!statusProc.running && !commandProc.running)
            statusProc.running = true;
    }

    function request(flag: string): void {
        if (root.pending || !root.available)
            return;
        root.pending = true;
        root.commandFinished = false;
        root.commandError = "";
        commandProc.exec(["caelestia", "record", "--obs", flag]);
    }

    function start(): void {
        if (!root.running)
            root.request("--start");
    }

    function stop(): void {
        if (root.running)
            root.request("--stop");
    }

    function togglePause(): void {
        if (root.running)
            root.request("--pause");
    }

    Process {
        id: statusProc

        running: true
        command: ["caelestia", "record", "--obs", "--status"]
        stdout: StdioCollector {
            onStreamFinished: {
                // An in-flight poll from before the action must not briefly
                // replace the state we are waiting to reconcile.
                if (root.pending && (!root.commandFinished || root.refreshAfterCommand))
                    return;
                try {
                    const status = JSON.parse(text);
                    root.available = !!status.available;
                    root.running = root.available && !!status.running;
                    root.paused = root.running && !!status.paused;
                    root.elapsed = root.running ? (status.elapsed ?? 0) : 0;
                    root.statusError = root.available ? "" : (status.error ?? "OBS WebSocket unavailable");
                } catch (e) {
                    root.available = false;
                    root.running = false;
                    root.paused = false;
                    root.elapsed = 0;
                    root.statusError = "Unable to read OBS recording status";
                }
            }
        }
        onExited: code => { // qmllint disable signal-handler-parameters
            if (code !== 0 && !root.statusError && !(root.pending && (!root.commandFinished || root.refreshAfterCommand))) {
                root.available = false;
                root.running = false;
                root.paused = false;
                root.statusError = "Unable to read OBS recording status";
            }
            if (root.refreshAfterCommand && root.pending && root.commandFinished) {
                root.refreshAfterCommand = false;
                Qt.callLater(() => root.refresh());
            } else if (root.pending && root.commandFinished)
                root.pending = false;
        }
    }

    Process {
        id: commandProc

        onExited: code => { // qmllint disable signal-handler-parameters
            root.commandFinished = true;
            if (code !== 0)
                root.commandError = "OBS recording command failed; check WebSocket settings";
            if (statusProc.running)
                root.refreshAfterCommand = true;
            else
                root.refresh();
        }
    }

    // Reconcile with OBS while the utilities drawer is visible. Never infer
    // recording status merely from whether the OBS process exists.
    Timer {
        interval: 1000
        running: root.refCount > 0
        repeat: true
        triggeredOnStart: true

        onTriggered: root.refresh()
    }
}
