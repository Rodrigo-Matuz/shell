"""Dashboard accents have distinct semantic roles without touching shell surfaces."""

import re
import unittest
from pathlib import Path

DASH = Path(__file__).resolve().parents[1] / "modules/dashboard"


def source(path):
    return (DASH / path).read_text()


class DashboardAccentRolesTest(unittest.TestCase):
    def test_dashboard_tab_is_purple_and_other_tabs_keep_their_roles(self):
        tabs = source("Tabs.qml")
        self.assertIn('case "dashboard": return Colours.accents.purple;', tabs)
        self.assertIn('case "cloud": return Colours.accents.blue;', tabs)
        self.assertIn('tab.current ? Colours.palette.m3onSurface : Colours.palette.m3onSurfaceVariant', tabs)

    def test_weather_uses_blue_icon_yellow_temperature_and_neutral_description(self):
        weather = source("dash/SmallWeather.qml")
        self.assertIn('Colours.accents.blue', weather)
        self.assertIn('Colours.accents.yellow', weather)
        description = weather.split('text: Weather.description', 1)[1]
        self.assertNotIn('Colours.accents.', description)

    def test_weather_page_keeps_measurements_neutral_and_icons_semantically_colored(self):
        weather = (DASH / "WeatherTab.qml").read_text()
        current_icon = weather.split('text: Weather.icon', 1)[1].split('ColumnLayout {', 1)[0]
        self.assertIn('color: Colours.light ? Colours.palette.m3secondary : Colours.accents.purple', current_icon)

        main_temperature = weather.split('text: Weather.temp', 1)[1].split('StyledText {', 1)[0]
        self.assertIn('color: Colours.palette.m3onSurface', main_temperature)
        self.assertNotIn('Colours.accents.', main_temperature)

        description = weather.split('text: Weather.description', 1)[1].split('    }', 1)[0]
        self.assertIn('color: Colours.palette.m3onSurfaceVariant', description)

        forecast_temperature = re.compile(
            r'text: \{\s+const min = .*?\n\s+\}\s+font: .*?\n\s+color: Colours\.palette\.m3onSurface',
            re.S,
        )
        self.assertRegex(weather, forecast_temperature)
        self.assertIn(
            '[Colours.accents.purple, Colours.accents.orange, Colours.accents.blue, Colours.accents.green, Colours.accents.red, Colours.accents.yellow][forecastItem.index % 6]',
            weather,
        )
        for block in (
            'icon: "wb_twilight"\n                    label: Tr.tr("Sunrise")\n                    value: Weather.sunrise\n                    colour: Colours.light ? Colours.palette.m3tertiary : Colours.accents.yellow',
            'icon: "bedtime"\n                    label: Tr.tr("Sunset")\n                    value: Weather.sunset\n                    colour: Colours.light ? Colours.palette.m3tertiary : Colours.accents.red',
            'icon: "water_drop"\n                label: Tr.tr("Humidity")\n                value: Strings.percent(Weather.humidity)\n                colour: Colours.light ? Colours.palette.m3secondary : Colours.accents.blue',
            'icon: "thermostat"\n                label: Tr.trCtx("Feels like", "apparent temperature")\n                value: Weather.feelsLike\n                colour: Colours.light ? Colours.palette.m3primary : Colours.accents.red',
            'icon: "air"\n                label: Tr.tr("Wind")\n                value: Weather.windSpeed ? Tr.tr("%1 km/h").arg(Weather.windSpeed) : "--"\n                colour: Colours.light ? Colours.palette.m3tertiary : Colours.accents.green',
        ):
            self.assertIn(block, weather)

    def test_system_status_uses_blue_purple_red_and_green_without_repainting_card(self):
        user = source("dash/User.qml")
        self.assertRegex(user, r'source: SysInfo\.osLogo[^}]*colour: Colours\.light \? [^\n]+ : Colours\.accents\.blue')
        self.assertIn('color: Colours.light ? Colours.palette.m3primary : Colours.accents.red', user)
        self.assertRegex(user, r'id: wmIcon[^}]*Colours\.accents\.purple')
        self.assertRegex(user, r'id: wmText[^}]*Colours\.accents\.purple')
        self.assertIn('Colours.accents.green', user)

    def test_clock_separators_purple_and_ampm_yellow(self):
        clock = source("dash/DateTime.qml")
        self.assertEqual(2, clock.count('Colours.accents.purple'))
        self.assertIn('Colours.accents.yellow', clock)

    def test_calendar_weekend_columns_keep_their_hues_while_adjacent_dates_are_dim(self):
        calendar = source("dash/Calendar.qml")
        # Qt 6.11 DayOfWeekRow exposes Sunday as 0 and Saturday as 6.
        self.assertIn('model.day === 0', calendar)
        self.assertNotIn('model.day === 7', calendar)
        self.assertIn('model.day === 6', calendar)
        self.assertIn('dayOfWeek === 0', calendar)
        self.assertIn('dayOfWeek === 6', calendar)
        self.assertIn('readonly property bool inDisplayedMonth: model.date.getMonth() === grid.month && model.date.getFullYear() === grid.year', calendar)
        day_color = calendar.split('text: grid.locale.toString(dayItem.model.day)', 1)[1].split('opacity: dayItem.inDisplayedMonth', 1)[0]
        self.assertNotIn('if (!dayItem.inDisplayedMonth)', day_color)
        self.assertIn('dayOfWeek === 0', day_color)
        self.assertIn('dayOfWeek === 6', day_color)
        self.assertIn('return Colours.palette.m3onSurfaceVariant;', day_color)
        self.assertIn('opacity: dayItem.inDisplayedMonth ? 1 : 0.4', calendar)
        self.assertIn('c.model.today && c.inDisplayedMonth', calendar)
        self.assertNotIn('dayItem.model.month', calendar)
        self.assertIn('Colours.accents.red', calendar)
        self.assertIn('Colours.accents.purple', calendar)
        self.assertNotIn('Colours.accents.orange', calendar)
        self.assertIn('Colours.accents.yellow', calendar)  # month heading remains yellow
        today = calendar.split('id: todayIndicator', 1)[1]
        self.assertIn('color: Colours.accents.blue', today)
        self.assertIn('colorizationColor: Colours.accents.blueForeground', today)
        self.assertIn('brightness: 1', today)
        colours = (DASH.parents[1] / "services/Colours.qml").read_text()
        self.assertIn('readonly property color blueForeground: "#FFFFFF"', colours)

    def test_resource_rings_and_icons_are_blue_orange_green(self):
        resources = source("dash/Resources.qml")
        for accent in ('blue', 'orange', 'green'):
            self.assertIn(f'Colours.accents.{accent}', resources)
        self.assertNotIn('Colours.accents.yellow', resources)
        self.assertIn('property color iconColour: fgColour', resources)
        self.assertNotIn('iconColour: Colours.light', resources)
        self.assertIn('color: res.iconColour', resources)

    def test_media_actions_titles_and_two_arc_segments(self):
        media = source("dash/Media.qml")
        self.assertIn('fgColour: Colours.light ? Colours.palette.m3primary : Colours.accents.red', media)
        self.assertIn('bgColour: Colours.light ? Colours.palette.m3secondaryContainer : Colours.accents.purple', media)
        self.assertIn('Colours.accents.yellow', media)
        self.assertIn('Colours.accents.purple', media)
        self.assertIn('activeColour: Colours.light ? Colours.palette.m3primary : Colours.accents.purple', media)
        self.assertIn('inactiveColour: Colours.light ? Colours.palette.m3primary : Colours.accents.purple', media)
        self.assertIn('readonly property color purpleForeground: "#FFFFFF"', (DASH.parents[1] / "services/Colours.qml").read_text())
        self.assertIn('activeOnColour: Colours.light ? Colours.palette.m3onPrimary : Colours.accents.purpleForeground', media)
        self.assertIn('inactiveOnColour: Colours.light ? Colours.palette.m3onPrimary : Colours.accents.purpleForeground', media)

    def test_accent_property_names_cannot_be_qml_on_signal_handlers(self):
        colours = (DASH.parents[1] / "services/Colours.qml").read_text()
        self.assertNotRegex(colours, r'property\s+color\s+on[A-Z]')


if __name__ == '__main__':
    unittest.main()
