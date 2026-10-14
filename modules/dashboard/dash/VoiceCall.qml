import "../media" as MediaParts
import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts
import Quickshell.Widgets
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
        anchors.margins: Tokens.padding.medium
        spacing: Tokens.spacing.extraSmall

        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: Tokens.spacing.extraSmall

            RowLayout {
                Layout.fillWidth: true
                StyledText {
                    Layout.fillWidth: true
                    text: Tr.tr("Vesktop call")
                    color: Colours.light ? Colours.palette.m3primary : Colours.accents.blue
                    font: Tokens.font.title.small
                    elide: Text.ElideRight
                }
                IconButton {
                    visible: Players.active !== null
                    icon: "music_note"
                    onClicked: root.showMusicRequested()
                }
            }
            MediaParts.CoverVisualiser {
                Layout.alignment: Qt.AlignHCenter
                Layout.preferredWidth: Math.min(root.width * 0.46, 125)
                Layout.preferredHeight: width
                voiceCall: true
                compact: true
                coverSize: Math.min(84, width * 0.68)
            }
            RowLayout {
                Layout.fillWidth: true
                spacing: Tokens.spacing.extraSmall
                IconButton {
                    icon: DiscordVoice.self?.muted ? "mic_off" : "mic"
                    type: IconButton.Tonal
                    checked: DiscordVoice.self?.muted ?? false
                    disabled: !DiscordVoice.controlsAvailable || DiscordVoice.busy || !DiscordVoice.self
                    Accessible.name: DiscordVoice.self?.muted ? Tr.tr("Unmute microphone") : Tr.tr("Mute microphone")
                    onClicked: DiscordVoice.sendCommand("selfMute", !DiscordVoice.self.muted)
                }
                IconButton {
                    icon: DiscordVoice.self?.deafened ? "hearing_disabled" : "headphones"
                    type: IconButton.Tonal
                    checked: DiscordVoice.self?.deafened ?? false
                    disabled: !DiscordVoice.controlsAvailable || DiscordVoice.busy || !DiscordVoice.self
                    Accessible.name: DiscordVoice.self?.deafened ? Tr.tr("Undeafen") : Tr.tr("Deafen")
                    onClicked: DiscordVoice.sendCommand("selfDeaf", !DiscordVoice.self.deafened)
                }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: Tokens.spacing.extraSmall
                    StyledText {
                        Layout.fillWidth: true
                        text: DiscordVoice.call?.name ?? ""
                        font: Tokens.font.title.small
                        elide: Text.ElideRight
                    }
                    StyledText {
                        Layout.fillWidth: true
                        text: DiscordVoice.call?.contextName ?? ""
                        visible: text.length > 0
                        color: Colours.palette.m3onSurfaceVariant
                        elide: Text.ElideRight
                        font: Tokens.font.body.small
                    }
                }
            }
            StyledText {
                Layout.fillWidth: true
                visible: DiscordVoice.participants.length > 0
                text: `${Tr.tr("In voice")} (${DiscordVoice.participants.length})`
                color: Colours.palette.m3onSurfaceVariant
                font: Tokens.font.body.small
            }
            Flickable {
                id: participantList
                objectName: "voiceParticipantList"
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                contentWidth: width
                contentHeight: roster.implicitHeight
                boundsBehavior: Flickable.StopAtBounds
                flickableDirection: Flickable.VerticalFlick
                Controls.ScrollBar.vertical: Controls.ScrollBar {
                    policy: Controls.ScrollBar.AsNeeded
                    active: participantList.contentHeight > participantList.height
                    interactive: true
                }

                ColumnLayout {
                    id: roster
                    width: participantList.width - Tokens.spacing.extraSmall
                    spacing: Tokens.spacing.medium
                    Repeater {
                        model: DiscordVoice.participants
                        delegate: ColumnLayout {
                            required property var modelData
                            Layout.fillWidth: true
                            spacing: Tokens.spacing.extraSmall
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: Tokens.spacing.extraSmall
                                ClippingRectangle {
                                    Layout.preferredWidth: 22
                                    Layout.preferredHeight: 22
                                    radius: width / 2
                                    color: Colours.palette.m3secondaryContainer
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
                                    font: Tokens.font.body.small
                                    elide: Text.ElideRight
                                }
                                MaterialIcon {
                                    visible: modelData.muted || modelData.deafened || modelData.speaking
                                    text: modelData.deafened ? "hearing_disabled" : modelData.muted ? "mic_off" : "graphic_eq"
                                    color: modelData.speaking ? Colours.accents.green : Colours.palette.m3onSurfaceVariant
                                }
                            }
                            RowLayout {
                                Layout.fillWidth: true
                                visible: modelData.localVolume !== null
                                Layout.leftMargin: 22
                                spacing: Tokens.spacing.extraSmall
                                StyledSlider {
                                    Layout.fillWidth: true
                                    from: 0
                                    to: 200
                                    value: modelData.localVolume ?? 0
                                    interactionOnMove: false
                                    enabled: DiscordVoice.controlsAvailable && !DiscordVoice.busy && modelData.localVolume !== null
                                    onInteraction: v => DiscordVoice.sendCommand("volume", Math.round(v * 200), modelData.id)
                                }
                                StyledText {
                                    text: `${modelData.localVolume}%`
                                    font: Tokens.font.body.small
                                    color: Colours.palette.m3onSurfaceVariant
                                }
                            }
                        }
                    }
                }
            }
        }

        MediaParts.VoiceVolume {
            Layout.preferredWidth: 54
            Layout.fillHeight: true
        }
    }
}
