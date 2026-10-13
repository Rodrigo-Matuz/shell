import QtQuick
import QtQuick.Layouts
import Caelestia.Config
import Caelestia.I18n
import qs.components
import qs.components.controls
import qs.services

Item {
    id: root
    signal showMusicRequested()

    RowLayout {
        anchors.fill: parent
        spacing: Tokens.spacing.extraLarge

        Rectangle {
            Layout.alignment: Qt.AlignVCenter
            Layout.preferredWidth: Tokens.sizes.dashboard.mediaSectionWidth
            Layout.preferredHeight: width
            radius: Tokens.rounding.largeIncreased
            color: Colours.palette.m3secondaryContainer
            clip: true

            Image {
                id: callImage
                anchors.fill: parent
                source: DiscordVoice.call?.icon ?? ""
                asynchronous: true
                fillMode: Image.PreserveAspectCrop
            }
            MaterialIcon {
                anchors.centerIn: parent
                visible: callImage.status !== Image.Ready
                text: DiscordVoice.call?.kind === "guild" ? "groups" : "call"
                fontStyle: Tokens.font.icon.builders.large.scale(2).build()
                color: Colours.palette.m3onSecondaryContainer
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: Tokens.spacing.medium

            RowLayout {
                Layout.fillWidth: true
                StyledText {
                    Layout.fillWidth: true
                    text: Tr.tr("Vesktop call")
                    color: Colours.light ? Colours.palette.m3primary : Colours.accents.blue
                    font: Tokens.font.title.medium
                }
                IconButton {
                    visible: Players.active !== null
                    icon: "music_note"
                    onClicked: root.showMusicRequested()
                }
                StyledText {
                    visible: Players.active !== null
                    text: Tr.tr("Music")
                    font: Tokens.font.body.small
                }
            }

            StyledText {
                Layout.fillWidth: true
                text: DiscordVoice.call?.name ?? ""
                font: Tokens.font.headline.medium
                elide: Text.ElideRight
            }
            StyledText {
                Layout.fillWidth: true
                text: DiscordVoice.call?.contextName ?? ""
                visible: text.length > 0
                font: Tokens.font.body.large
                color: Colours.palette.m3onSurfaceVariant
                elide: Text.ElideRight
            }

            RowLayout {
                spacing: Tokens.spacing.medium
                IconButton {
                    icon: DiscordVoice.self?.muted ? "mic_off" : "mic"
                    type: IconButton.Tonal
                    checked: DiscordVoice.self?.muted ?? false
                    disabled: !DiscordVoice.controlsAvailable || DiscordVoice.busy || !DiscordVoice.self
                    onClicked: DiscordVoice.sendCommand("selfMute", !DiscordVoice.self.muted)
                }
                StyledText {
                    text: DiscordVoice.self?.muted ? Tr.tr("Muted") : Tr.tr("Microphone on")
                    font: Tokens.font.body.small
                }
                IconButton {
                    icon: DiscordVoice.self?.deafened ? "hearing_disabled" : "headphones"
                    type: IconButton.Tonal
                    checked: DiscordVoice.self?.deafened ?? false
                    disabled: !DiscordVoice.controlsAvailable || DiscordVoice.busy || !DiscordVoice.self
                    onClicked: DiscordVoice.sendCommand("selfDeaf", !DiscordVoice.self.deafened)
                }
                StyledText {
                    text: DiscordVoice.self?.deafened ? Tr.tr("Deafened") : Tr.tr("Audio on")
                    font: Tokens.font.body.small
                }
            }

            StyledText {
                visible: DiscordVoice.participants.length > 0
                text: Tr.tr("In voice")
                font: Tokens.font.title.small
            }
            Repeater {
                model: DiscordVoice.participants.slice(0, 4)
                delegate: RowLayout {
                    required property var modelData
                    Layout.fillWidth: true
                    spacing: Tokens.spacing.small
                    Rectangle {
                        Layout.preferredWidth: 28
                        Layout.preferredHeight: 28
                        radius: width / 2
                        color: Colours.palette.m3secondaryContainer
                        clip: true
                        Image {
                            anchors.fill: parent
                            source: modelData.avatar ?? ""
                            fillMode: Image.PreserveAspectCrop
                            asynchronous: true
                        }
                    }
                    StyledText {
                        Layout.fillWidth: true
                        text: modelData.name
                        elide: Text.ElideRight
                        font: Tokens.font.body.medium
                    }
                    MaterialIcon {
                        visible: modelData.muted || modelData.deafened || modelData.speaking
                        text: modelData.deafened ? "hearing_disabled" : modelData.muted ? "mic_off" : "graphic_eq"
                        color: modelData.speaking ? Colours.accents.green : Colours.palette.m3onSurfaceVariant
                    }
                    StyledSlider {
                        visible: modelData.localVolume !== null
                        Layout.preferredWidth: 110
                        from: 0
                        to: 200
                        value: modelData.localVolume ?? 0
                        interactionOnMove: false
                        enabled: DiscordVoice.controlsAvailable && !DiscordVoice.busy && modelData.localVolume !== null
                        onInteraction: v => DiscordVoice.sendCommand("volume", Math.round(v * 200), modelData.id)
                    }
                    StyledText {
                        visible: modelData.localVolume !== null
                        text: `${modelData.localVolume}%`
                        font: Tokens.font.body.small
                        color: Colours.palette.m3onSurfaceVariant
                    }
                }
            }
            RowLayout {
                Layout.fillWidth: true
                spacing: Tokens.spacing.medium
                MaterialIcon {
                    text: "volume_up"
                    fontStyle: Tokens.font.icon.medium
                    color: Colours.palette.m3onSurfaceVariant
                }
                StyledText {
                    text: Tr.tr("Vesktop volume")
                    font: Tokens.font.body.small
                }
                StyledSlider {
                    Layout.fillWidth: true
                    from: 0
                    to: GlobalConfig.services.maxVolume
                    value: Audio.vesktopPlayback?.audio?.volume ?? 0
                    enabled: !!Audio.vesktopPlayback?.ready
                    onInteraction: v => Audio.setStreamVolume(Audio.vesktopPlayback, v * to)
                }
                StyledText {
                    text: Audio.vesktopPlayback ? `${Math.round(Audio.getStreamVolume(Audio.vesktopPlayback) * 100)}%` : "—"
                    font: Tokens.font.body.small
                    color: Colours.palette.m3onSurfaceVariant
                }
            }
            Item { Layout.fillHeight: true }
        }
    }
}
