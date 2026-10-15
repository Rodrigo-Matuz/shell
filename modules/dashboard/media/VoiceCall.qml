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

            RowLayout {
                Layout.fillWidth: true
                spacing: Tokens.spacing.medium
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

                GridLayout {
                    id: roster
                    width: participantList.width - Tokens.spacing.medium
                    columns: 2
                    columnSpacing: Tokens.spacing.medium
                    rowSpacing: Tokens.spacing.small
                    Repeater {
                        model: DiscordVoice.participants
                        delegate: RowLayout {
                            required property var modelData
                            Layout.preferredWidth: (roster.width - roster.columnSpacing) / 2
                            Layout.fillWidth: true
                            spacing: Tokens.spacing.extraSmall
                            ClippingRectangle {
                                Layout.preferredWidth: 28
                                Layout.preferredHeight: 28
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
                                Layout.minimumWidth: 0
                                text: modelData.name
                                elide: Text.ElideRight
                                font: Tokens.font.body.medium
                                Accessible.name: modelData.name
                                Controls.ToolTip.visible: nameHover.hovered && truncated
                                Controls.ToolTip.delay: 400
                                Controls.ToolTip.text: modelData.name
                                HoverHandler { id: nameHover }
                            }
                            MaterialIcon {
                                text: modelData.muted || modelData.deafened ? "mic_off" : "mic"
                                color: modelData.muted || modelData.deafened ? Colours.accents.red : modelData.speaking ? Colours.accents.green : Colours.palette.m3onSurfaceVariant
                                Accessible.name: modelData.muted || modelData.deafened ? Tr.tr("Cannot talk") : Tr.tr("Can talk")
                            }
                            MaterialIcon {
                                text: modelData.deafened ? "hearing_disabled" : "headphones"
                                color: modelData.deafened ? Colours.accents.red : Colours.palette.m3onSurfaceVariant
                                Accessible.name: modelData.deafened ? Tr.tr("Cannot hear") : Tr.tr("Can hear")
                            }
                        }
                    }
                }
            }
        }

        VoiceVolume {
            Layout.preferredWidth: 46
            Layout.fillHeight: true
        }
    }
}
