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
                    text: Tr.tr("Discord call")
                    color: Colours.light ? Colours.palette.m3primary : Colours.accents.blue
                    font: Tokens.font.title.small
                    horizontalAlignment: Text.AlignHCenter
                    elide: Text.ElideRight
                }
                IconButton {
                    visible: Players.active !== null
                    icon: "music_note"
                    type: IconButton.Tonal
                    font: Tokens.font.icon.small
                    onClicked: root.showMusicRequested()
                }
            }
            RowLayout {
                Layout.fillWidth: true
                Layout.alignment: Qt.AlignHCenter
                spacing: Tokens.spacing.extraSmall

                MediaParts.CoverVisualiser {
                    Layout.preferredWidth: Math.min(root.width * 0.58, 92)
                    Layout.preferredHeight: width
                    voiceCall: true
                    compact: true
                    coverSize: Math.min(92, width * 0.78)
                }

                ColumnLayout {
                    Layout.alignment: Qt.AlignVCenter
                    spacing: Tokens.spacing.extraSmall

                    IconButton {
                        icon: DiscordVoice.self?.muted ? "mic_off" : "mic"
                        type: IconButton.Tonal
                        checked: DiscordVoice.self?.muted ?? false
                        activeColour: Colours.accents.red
                        activeOnColour: Colours.accents.whiteForeground
                        inactiveOnColour: Colours.accents.purple
                        disabled: !DiscordVoice.controlsAvailable || DiscordVoice.busy || !DiscordVoice.self
                        Accessible.name: DiscordVoice.self?.muted ? Tr.tr("Unmute microphone") : Tr.tr("Mute microphone")
                        onClicked: DiscordVoice.sendCommand("selfMute", !DiscordVoice.self.muted)
                    }
                    IconButton {
                        icon: DiscordVoice.self?.deafened ? "hearing_disabled" : "headphones"
                        type: IconButton.Tonal
                        checked: DiscordVoice.self?.deafened ?? false
                        activeColour: Colours.accents.red
                        activeOnColour: Colours.accents.whiteForeground
                        inactiveOnColour: Colours.accents.purple
                        disabled: !DiscordVoice.controlsAvailable || DiscordVoice.busy || !DiscordVoice.self
                        Accessible.name: DiscordVoice.self?.deafened ? Tr.tr("Undeafen") : Tr.tr("Deafen")
                        onClicked: DiscordVoice.sendCommand("selfDeaf", !DiscordVoice.self.deafened)
                    }
                }
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
                Layout.topMargin: Tokens.spacing.small
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
                        delegate: RowLayout {
                            required property var modelData
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
                                Layout.minimumWidth: 0
                                text: modelData.name
                                font: Tokens.font.body.small
                                elide: Text.ElideRight
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

    }
}
