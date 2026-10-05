pragma ComponentBehavior: Bound

import QtQuick
import QtMultimedia
import Caelestia.Config
import Caelestia.I18n
import qs.components
import qs.components.filedialog
import qs.components.images
import qs.services
import qs.utils

Item {
    id: root

    property string source: Wallpapers.current
    property bool playbackEnabled: true
    property Item current
    property Item previous
    property bool completed

    function changeSource(): void {
        retireTimer.stop();
        fallbackRetireTimer.stop();
        if (previous) {
            previous.destroy();
            previous = null;
        }
        previous = current;
        // Never leave an old decoder playing under an incoming image/video.
        if (previous?.stopPlayback)
            previous.stopPlayback();
        if (previous)
            fallbackRetireTimer.restart();
        current = source ? (Wallpapers.isVideo(source) ? videoComp : imgComp).createObject(root, { path: source }) : null;
        if (!current)
            retirePrevious();
    }

    function retirePrevious(): void {
        fallbackRetireTimer.stop();
        if (previous) {
            previous.destroy();
            previous = null;
        }
    }

    onSourceChanged: if (completed) changeSource()
    onCurrentChanged: if (current?.ready) retireTimer.restart()

    Component.onCompleted: {
        completed = true;
        changeSource();
    }

    Connections {
        function onReadyChanged(): void {
            if (root.current?.ready)
                retireTimer.restart();
        }

        target: root.current
    }

    Timer {
        id: retireTimer

        interval: Tokens.anim.durations.expressiveSlowEffects
        onTriggered: root.retirePrevious()
    }

    Timer {
        id: fallbackRetireTimer

        interval: 5000
        onTriggered: root.retirePrevious()
    }

    Loader {
        asynchronous: true
        anchors.fill: parent

        active: root.completed && !root.source

        sourceComponent: StyledRect {
            color: Colours.palette.m3surfaceContainer

            Row {
                anchors.centerIn: parent
                spacing: Tokens.spacing.largeIncreased

                MaterialIcon {
                    text: "sentiment_stressed"
                    color: Colours.palette.m3onSurfaceVariant
                    fontStyle: Tokens.font.icon.builders.extraLarge.scale(5).build()
                }

                Column {
                    anchors.verticalCenter: parent.verticalCenter
                    spacing: Tokens.spacing.small

                    StyledText {
                        text: Tr.tr("Wallpaper missing?")
                        color: Colours.palette.m3onSurfaceVariant
                        font: Tokens.font.body.builders.large.size(28 * 2).weight(Font.Bold).build()
                    }

                    StyledRect {
                        implicitWidth: selectWallText.implicitWidth + Tokens.padding.extraLargeIncreased
                        implicitHeight: selectWallText.implicitHeight + Tokens.padding.small

                        radius: Tokens.rounding.full
                        color: Colours.palette.m3primary

                        FileDialog {
                            id: dialog

                            title: Tr.tr("Select a wallpaper")
                            filterLabel: Tr.tr("Image and video files")
                            filters: [...Images.validImageExtensions, ...Wallpapers.videoExtensions]
                            onAccepted: path => Wallpapers.setWallpaper(path)
                        }

                        StateLayer {
                            radius: parent.radius
                            color: Colours.palette.m3onPrimary
                            onClicked: dialog.open()
                        }

                        StyledText {
                            id: selectWallText

                            anchors.centerIn: parent

                            text: Tr.tr("Set it now!")
                            color: Colours.palette.m3onPrimary
                            font: Tokens.font.body.large
                        }
                    }
                }
            }
        }
    }

    Component {
        id: imgComp

        CachingImage {
            id: img

            property bool ready: status === Image.Ready

            anchors.fill: parent

            opacity: 0

            onStatusChanged: {
                if (status === Image.Ready)
                    anim.start();
            }

            Anim on opacity {
                id: anim

                type: Anim.SlowEffects
                running: false
                from: 0
                to: 1
            }
        }
    }

    Component {
        id: videoComp

        Item {
            id: video

            required property string path
            readonly property bool ready: player.hasVideo || poster.status === Image.Ready

            function stopPlayback(): void {
                player.stop();
                player.source = "";
            }

            anchors.fill: parent
            opacity: 0
            Component.onCompleted: if (root.playbackEnabled) player.play()
            Component.onDestruction: stopPlayback()

            // A still frame covers startup, paused playback and codec failures.
            WallpaperImage {
                id: poster

                anchors.fill: parent
                path: video.path
            }

            VideoOutput {
                id: output

                anchors.fill: parent
                fillMode: VideoOutput.PreserveAspectCrop
                visible: player.hasVideo
            }

            MediaPlayer {
                id: player

                source: Qt.resolvedUrl("file://" + encodeURIComponent(video.path).replace(/%2F/gi, "/"))
                videoOutput: output
                loops: MediaPlayer.Infinite
                onErrorOccurred: (error, errorString) => console.warn("Wallpaper video:", errorString)

                audioOutput: AudioOutput { muted: true }
            }

            Connections {
                function onPlaybackEnabledChanged(): void {
                    if (root.current !== video)
                        return;
                    if (root.playbackEnabled)
                        player.play();
                    else
                        player.pause();
                }

                target: root
            }

            Anim on opacity {
                type: Anim.SlowEffects
                running: video.ready
                from: 0
                to: 1
            }
        }
    }
}
