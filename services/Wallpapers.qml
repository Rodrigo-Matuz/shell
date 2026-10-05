pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Io
import Caelestia.Config
import Caelestia.Models
import qs.services
import qs.utils

Searcher {
    id: root

    readonly property string currentNamePath: `${Paths.state}/wallpaper/path.txt`
    readonly property list<string> smartArg: GlobalConfig.services.smartScheme ? [] : ["--no-smart"]
    readonly property string fallback: Quickshell.shellPath("assets/wallpaper.webp")
    readonly property list<string> videoExtensions: ["mp4", "mkv", "webm"]
    readonly property string thumbnailPath: `${Paths.state}/wallpaper/thumbnail.jpg`
    property int thumbnailRevision
    readonly property string thumbnailUrl: `file://${thumbnailPath}?revision=${thumbnailRevision}`
    readonly property string thumbnailForCurrent: isVideo(current) ? (showPreview ? previewThumbnail : thumbnailPath) : current
    property string previewThumbnail

    property bool showPreview: false
    readonly property string current: showPreview ? previewPath : actualCurrent
    property string previewPath
    property string actualCurrent
    property bool previewColourLock
    property bool pendingPreviewClear

    function isVideo(path: string): bool {
        return /\.(mp4|mkv|webm)$/i.test(path);
    }

    function getCategoryFor(w: FileSystemEntry): string {
        if (isVideo(w.path))
            return "Live wallpapers";
        let category = w.parentDir.slice(Paths.wallsdir.length + 1);
        if (category.includes("/"))
            category = category.slice(0, category.indexOf("/"));
        return category;
    }

    function setRandom(): void {
        setVideoProc.running = false;
        Quickshell.execDetached(["caelestia", "wallpaper", "-r", ...smartArg]);
    }

    function setWallpaper(path: string): void {
        setVideoProc.running = false;
        if (isVideo(path)) {
            setVideoProc.requestedPath = path;
            setVideoProc.running = true;
            return;
        }
        actualCurrent = path;
        Quickshell.execDetached(["caelestia", "wallpaper", "-f", path, ...smartArg]);
    }

    function preview(path: string): void {
        getPreviewColoursProc.running = false;
        getPreviewThumbnailProc.running = false;
        previewThumbnail = "";
        previewPath = path;
        showPreview = true;

        if (isVideo(path)) {
            getPreviewThumbnailProc.requestedPath = path;
            getPreviewThumbnailProc.running = true;
        }
        if (Colours.scheme === "dynamic") {
            getPreviewColoursProc.requestedPath = path;
            getPreviewColoursProc.running = true;
        }
    }

    function stopPreview(): void {
        showPreview = false;
        getPreviewThumbnailProc.running = false;
        getPreviewColoursProc.running = false;
        if (previewColourLock)
            pendingPreviewClear = true;
        else
            Colours.showPreview = false;
    }

    onPreviewColourLockChanged: {
        if (!previewColourLock && pendingPreviewClear)
            Colours.showPreview = false;
    }

    list: [...wallpapers.entries, ...liveWallpapers.entries]
    key: "path"
    useFuzzy: GlobalConfig.launcher.useFuzzy.wallpapers
    extraOpts: useFuzzy ? ({}) : ({
            forward: false
        })

    IpcHandler {
        function get(): string {
            return root.actualCurrent;
        }

        function set(path: string): void {
            root.setWallpaper(path);
        }

        function list(): string {
            return root.list.map(w => w.path).join("\n");
        }

        target: "wallpaper"
    }

    FileView {
        path: root.currentNamePath
        watchChanges: true
        printErrors: false
        onFileChanged: reload()
        onLoaded: {
            let wall = text().trim();
            if (!wall) {
                wall = root.fallback;
                Quickshell.execDetached(["caelestia", "wallpaper", "-f", root.fallback, ...root.smartArg]);
            }
            root.actualCurrent = wall;
            root.previewColourLock = false;
            thumbnailRefresh.restart();
        }
        onLoadFailed: {
            root.actualCurrent = root.fallback;
            root.previewColourLock = false;
            Quickshell.execDetached(["caelestia", "wallpaper", "-f", root.fallback, ...root.smartArg]);
        }
    }

    FileSystemModel {
        id: wallpapers

        recursive: true
        path: Paths.wallsdir
        filter: FileSystemModel.Images
    }

    FileSystemModel {
        id: liveWallpapers

        recursive: true
        path: Paths.livewallsdir
        filter: FileSystemModel.Files
        nameFilters: root.videoExtensions.flatMap(ext => [`*.${ext}`, `*.${ext.toUpperCase()}`])
    }

    FileView {
        path: root.thumbnailPath
        watchChanges: true
        printErrors: false
        onFileChanged: reload()
        onLoaded: root.thumbnailRevision++
    }

    // The CLI writes path.txt before replacing thumbnail.jpg; refresh after the
    // latter has had time to land even if the replaced symlink loses its watch.
    Timer {
        id: thumbnailRefresh

        interval: 300
        onTriggered: root.thumbnailRevision++
    }

    // Unlike path.txt, the thumbnail symlink is only updated when the CLI
    // finishes. Refresh again then, even for slow uncached video extraction.
    Process {
        id: setVideoProc

        property string requestedPath

        command: ["caelestia", "wallpaper", "-f", requestedPath, ...root.smartArg]
        onExited: code => { // qmllint disable signal-handler-parameters
            if (code === 0) {
                root.actualCurrent = requestedPath;
                root.thumbnailRevision++;
            }
        }
    }

    Process {
        id: getPreviewThumbnailProc

        property string requestedPath

        command: ["caelestia", "wallpaper", "--thumbnail-info", requestedPath]
        stdout: StdioCollector {
            onStreamFinished: {
                if (!root.showPreview || !text().trim())
                    return;
                const result = JSON.parse(text());
                if (getPreviewThumbnailProc.requestedPath === result.source && result.source === root.previewPath)
                    root.previewThumbnail = result.thumbnail;
            }
        }
    }

    Process {
        id: getPreviewColoursProc

        property string requestedPath

        command: ["caelestia", "wallpaper", "-p", requestedPath, ...root.smartArg]
        stdout: StdioCollector {
            onStreamFinished: {
                if (root.showPreview && getPreviewColoursProc.requestedPath === root.previewPath && text().trim()) {
                    Colours.load(text(), true);
                    Colours.showPreview = true;
                }
            }
        }
    }
}
