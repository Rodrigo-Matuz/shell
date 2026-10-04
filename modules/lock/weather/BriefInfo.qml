import QtQuick
import QtQuick.Layouts
import Caelestia.Config
import Caelestia.I18n
import qs.components
import qs.services

ColumnLayout {
    id: root

    required property int rootHeight

    spacing: Tokens.spacing.extraSmall

    StyledText {
        Layout.alignment: Qt.AlignHCenter
        animate: true
        text: Weather.description
        color: Colours.palette.m3onSurfaceVariant
        font: Tokens.font.body.large
    }

    RowLayout {
        Layout.alignment: Qt.AlignHCenter
        spacing: Tokens.spacing.medium

        StyledText {
            id: temp

            animate: true
            text: Weather.temp
            color: Colours.palette.m3onSurface
            font: Tokens.font.headline.builders.large.scale(1.5).weight(Font.DemiBold).width(80).build()
        }

        MaterialIcon {
            animate: true
            text: Weather.icon
            color: Colours.accents.red
            fontStyle: Tokens.font.headline.builders.large.scale(1.5).build()
        }
    }

    StyledText {
        visible: root.rootHeight > Tokens.sizes.lock.showWeatherDetailsHeight
        Layout.alignment: Qt.AlignHCenter
        animate: true
        // TRANSLATORS: %1 = apparent temperature, unit already included
        text: Tr.tr("Feels like %1").arg(Weather.temp)
        color: Colours.palette.m3onSurfaceVariant
        font: Tokens.font.body.large
    }

    StyledText {
        visible: root.rootHeight > Tokens.sizes.lock.showWeatherDetailsHeight
        Layout.alignment: Qt.AlignHCenter
        animate: true
        textFormat: Text.MarkdownText
        text: {
            const today = Weather.forecast[0];
            const high = `<span style='color:${Colours.accents.orange}'>${Weather.formatTemp(today?.maxTempC)}</span>`;
            const low = `<span style='color:${Colours.accents.blue}'>${Weather.formatTemp(today?.minTempC)}</span>`;
            // Keep one translated string so locales retain their word order and punctuation.
            return Tr.tr("High %1 • Low %2").arg(high).arg(low);
        }
        color: Colours.palette.m3onSurfaceVariant
        font: Tokens.font.body.medium
    }
}
