"""Dashboard accents have distinct semantic roles without touching shell surfaces."""

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

    def test_calendar_weekends_are_distinct_and_outside_month_neutral(self):
        calendar = source("dash/Calendar.qml")
        # Qt::DayOfWeek is 1..7; JS Date.getDay() below is 0..6.
        self.assertIn('model.day === 7', calendar)
        self.assertIn('model.day === 6', calendar)
        self.assertIn('dayOfWeek === 0', calendar)
        self.assertIn('dayOfWeek === 6', calendar)
        self.assertIn('dayItem.model.month !== grid.month', calendar)
        self.assertIn('return Qt.alpha(Colours.palette.m3onSurfaceVariant, dayItem.model.today ? 0.4 : 1);', calendar)
        self.assertIn('c.model.today && c.model.month === grid.month', calendar)
        self.assertIn('Colours.accents.red', calendar)
        self.assertIn('Colours.accents.purple', calendar)
        self.assertNotIn('Colours.accents.orange', calendar)
        self.assertIn('Colours.accents.yellow', calendar)
        self.assertIn('colorizationColor: Colours.light ? Colours.palette.m3onPrimary : "#202020"', calendar)

    def test_resource_rings_have_blue_orange_green_and_memory_icon_yellow(self):
        resources = source("dash/Resources.qml")
        for accent in ('blue', 'orange', 'yellow', 'green'):
            self.assertIn(f'Colours.accents.{accent}', resources)
        self.assertIn('property color iconColour: fgColour', resources)
        self.assertIn('color: res.iconColour', resources)

    def test_media_actions_titles_and_two_arc_segments(self):
        media = source("dash/Media.qml")
        self.assertIn('fgColour: Colours.light ? Colours.palette.m3primary : Colours.accents.red', media)
        self.assertIn('bgColour: Colours.light ? Colours.palette.m3secondaryContainer : Colours.accents.purple', media)
        self.assertIn('Colours.accents.yellow', media)
        self.assertIn('Colours.accents.purple', media)
        self.assertIn('activeColour: Colours.light ? Colours.palette.m3primary : Colours.accents.purple', media)
        self.assertIn('inactiveColour: Colours.light ? Colours.palette.m3primary : Colours.accents.purple', media)
        self.assertIn('readonly property color onPurple: "#FFFFFF"', (DASH.parents[1] / "services/Colours.qml").read_text())
        self.assertIn('activeOnColour: Colours.light ? Colours.palette.m3onPrimary : Colours.accents.onPurple', media)
        self.assertIn('inactiveOnColour: Colours.light ? Colours.palette.m3onPrimary : Colours.accents.onPurple', media)


if __name__ == '__main__':
    unittest.main()
