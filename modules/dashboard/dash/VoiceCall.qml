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

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Tokens.padding.medium
        spacing: Tokens.spacing.small

        StyledText {
            Layout.alignment: Qt.AlignHCenter
            text: Tr.tr("Vesktop call")
            color: Colours.light ? Colours.palette.m3primary : Colours.accents.blue
            font: Tokens.font.title.small
        }
        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            Layout.preferredWidth: Math.min(root.width * 0.48, 110)
            Layout.preferredHeight: width
            radius: width / 2
            color: Colours.palette.m3secondaryContainer
            clip: true
            Image {
                id: avatar
                anchors.fill: parent
                source: DiscordVoice.call?.icon ?? ""
                asynchronous: true
                fillMode: Image.PreserveAspectCrop
            }
            MaterialIcon {
                anchors.centerIn: parent
                visible: avatar.status !== Image.Ready
                text: DiscordVoice.call?.kind === "guild" ? "groups" : "call"
                color: Colours.palette.m3onSecondaryContainer
                fontStyle: Tokens.font.icon.extraLarge
            }
        }
        StyledText {
            Layout.fillWidth: true
            text: DiscordVoice.call?.name ?? ""
            font: Tokens.font.title.small
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
        }
        StyledText {
            Layout.fillWidth: true
            text: DiscordVoice.call?.contextName ?? ""
            visible: text.length > 0
            color: Colours.palette.m3onSurfaceVariant
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
            font: Tokens.font.body.small
        }
        RowLayout {
            Layout.alignment: Qt.AlignHCenter
            spacing: Tokens.spacing.medium
            IconButton {
                icon: DiscordVoice.self?.muted ? "mic_off" : "mic"
                type: IconButton.Tonal
                checked: DiscordVoice.self?.muted ?? false
                disabled: !DiscordVoice.controlsAvailable || DiscordVoice.busy || !DiscordVoice.self
                onClicked: DiscordVoice.sendCommand("selfMute", !DiscordVoice.self.muted)
            }
            IconButton {
                icon: DiscordVoice.self?.deafened ? "hearing_disabled" : "headphones"
                type: IconButton.Tonal
                checked: DiscordVoice.self?.deafened ?? false
                disabled: !DiscordVoice.controlsAvailable || DiscordVoice.busy || !DiscordVoice.self
                onClicked: DiscordVoice.sendCommand("selfDeaf", !DiscordVoice.self.deafened)
            }
            StyledText {
                visible: DiscordVoice.participants.length > 0
                text: `${DiscordVoice.participants.length}`
                color: Colours.palette.m3onSurfaceVariant
                font: Tokens.font.body.small
            }
        }
        RowLayout {
            Layout.fillWidth: true
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
        }
        Repeater {
            model: DiscordVoice.participants.filter(p => p.localVolume !== null).slice(0, 2)
            delegate: RowLayout {
                required property var modelData
                Layout.fillWidth: true
                StyledText {
                    Layout.preferredWidth: 74
                    text: modelData.name
                    font: Tokens.font.body.small
                    elide: Text.ElideRight
                }
                StyledSlider {
                    Layout.fillWidth: true
                    from: 0
                    to: 200
                    value: modelData.localVolume
                    interactionOnMove: false
                    enabled: DiscordVoice.controlsAvailable && !DiscordVoice.busy
                    onInteraction: v => DiscordVoice.sendCommand("volume", Math.round(v * 200), modelData.id)
                }
                StyledText {
                    text: `${modelData.localVolume}%`
                    font: Tokens.font.body.small
                }
            }
        }
        Item { Layout.fillHeight: true }
        RowLayout {
            Layout.alignment: Qt.AlignHCenter
            visible: Players.active !== null
            IconButton {
                icon: "music_note"
                onClicked: root.showMusicRequested()
            }
            StyledText {
                text: Tr.tr("Music")
                font: Tokens.font.body.small
            }
        }
    }
}
