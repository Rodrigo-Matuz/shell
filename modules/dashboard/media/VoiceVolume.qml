import QtQuick
import QtQuick.Layouts
import Caelestia.Config
import Caelestia.I18n
import qs.components
import qs.components.controls
import qs.services

Item {
    id: root

    implicitWidth: 46
    implicitHeight: 190

    ColumnLayout {
        anchors.fill: parent
        spacing: Tokens.spacing.small

        StyledText {
            Layout.fillWidth: true
            text: Tr.tr("App")
            font: Tokens.font.body.small
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
        }

        FilledSlider {
            id: slider
            Layout.alignment: Qt.AlignHCenter
            Layout.fillHeight: true
            Layout.minimumHeight: 72
            Layout.preferredWidth: 30
            icon: "volume_up"
            from: 0
            to: GlobalConfig.services.maxVolume
            value: Audio.vesktopPlayback?.audio?.volume ?? 0
            enabled: !!Audio.vesktopPlayback?.ready
            Accessible.name: Tr.tr("Vesktop volume")
            onMoved: Audio.setStreamVolume(Audio.vesktopPlayback, value)
        }

        StyledText {
            Layout.fillWidth: true
            text: Audio.vesktopPlayback ? `${Math.round(Audio.getStreamVolume(Audio.vesktopPlayback) * 100)}%` : "—"
            font: Tokens.font.body.small
            color: Colours.palette.m3onSurfaceVariant
            horizontalAlignment: Text.AlignHCenter
        }
    }
}
