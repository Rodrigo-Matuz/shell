import QtQuick
import QtQuick.Controls as Controls
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
        spacing: Tokens.spacing.medium

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
                text: `${Tr.tr("In voice")} (${DiscordVoice.participants.length})`
                font: Tokens.font.title.small
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
                    width: participantList.width - Tokens.spacing.medium
                    spacing: Tokens.spacing.small
                    Repeater {
                        model: DiscordVoice.participants
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
                }
            }
        }

        VoiceVolume {
            Layout.preferredWidth: 54
            Layout.fillHeight: true
        }
    }
}
