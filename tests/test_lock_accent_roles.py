"""Lock-screen accents stay semantic while surfaces and behavior remain unchanged."""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "modules/lock"


def source(path: str) -> str:
    return (LOCK / path).read_text()


class LockAccentRolesTest(unittest.TestCase):
    def test_weather_keeps_measurements_neutral_and_highlights_semantic_values(self):
        weather = source("weather/BriefInfo.qml")
        self.assertIn("color: Colours.palette.m3onSurfaceVariant", weather)
        self.assertIn("color: Colours.palette.m3onSurface", weather)
        self.assertIn("color: Colours.accents.red", weather)
        self.assertIn("Colours.accents.orange", weather)
        self.assertIn("Colours.accents.blue", weather)
        self.assertIn('return Tr.tr("High %1 • Low %2").arg(high).arg(low);', weather)
        self.assertIn("Cpu.temperature > 90 ? Colours.palette.m3onErrorContainer : Colours.accents.purple", source("Resources.qml"))
        self.assertIn("color: Colours.tPalette.m3surfaceContainer", source("../lock/WeatherInfo.qml"))

    def test_clock_and_date_use_white_purple_and_yellow_roles(self):
        clock = source("center/Clock.qml")
        center = source("Center.qml")
        self.assertIn("color: Colours.palette.m3onSurface", clock)
        self.assertIn("color: Colours.accents.purple", clock)
        self.assertIn("color: Colours.accents.yellow", clock)
        self.assertIn('Time.format("dddd •")', center)
        self.assertIn('Time.format("d MMM")', center)
        self.assertIn("color: Colours.palette.m3onSurface", center)
        self.assertIn("Colours.accents.yellow", center)

    def test_password_field_keeps_surface_and_colors_auth_controls(self):
        password = source("center/PasswordInput.qml")
        self.assertIn("color: Colours.tPalette.m3surfaceContainer", password)
        self.assertIn("Colours.accents.yellow", password)
        self.assertIn("Colours.accents.purple", password)
        self.assertIn("Colours.accents.purpleForeground", password)
        self.assertNotIn("color: Colours.accents.purple\n    radius: Tokens.rounding.full", password)

    def test_fetch_uses_blue_system_roles_and_fixed_palette_dots(self):
        fetch = source("Fetch.qml")
        self.assertIn("color: Colours.accents.blue", fetch)
        self.assertIn("color: Colours.accents.blueForeground", fetch)
        self.assertIn("colour: Colours.accents.blue", fetch)
        for role in ("red", "orange", "yellow", "green", "blue", "purple"):
            self.assertIn(f"Colours.accents.{role}", fetch)
        self.assertIn("Colours.palette.m3surfaceContainerLowest", fetch)
        self.assertIn("Colours.palette.term0", fetch)

    def test_media_controls_keep_artwork_and_use_purple_control_roles(self):
        media = source("Media.qml")
        self.assertIn("source: Players.getArtUrl(Players.active)", media)
        self.assertIn("color: Colours.palette.m3onSurface", media)
        self.assertIn("color: Colours.palette.m3onSurfaceVariant", media)
        self.assertIn("Colours.accents.purple", media)
        self.assertIn("Colours.accents.purpleForeground", media)
        self.assertIn("type: IconButton.Tonal", media)

    def test_resources_keep_surface_and_assign_metric_accents(self):
        resources = source("Resources.qml")
        self.assertIn("color: Colours.tPalette.m3surfaceContainer", resources)
        for role in ("purple", "blue", "orange", "green"):
            self.assertIn(f"Colours.accents.{role}", resources)
        self.assertIn("property color iconColour: colour", resources)
        self.assertIn("color: res.iconColour", resources)

    def test_lock_notifications_only_show_an_enlarged_sender(self):
        group = source("NotifGroup.qml")
        sender = group[group.index('text: root.modelData'):group.index('elide: Text.ElideRight', group.index('text: root.modelData'))]
        self.assertIn('font: Tokens.font.title.medium', sender)
        self.assertIn('model: []', group)
        self.assertIn('Layout.preferredHeight: 0\n                active: false', group)
        self.assertIn('visible: false\n                    text: root.notifs[0]?.timeStr', group)
        self.assertIn('opacity: 0\n                    Layout.preferredWidth: 0', group)
        self.assertIn('sourceComponent: root.appIcon ? appIconComp : materialIconComp', group)
        self.assertIn('text: "notifications"', group)
        self.assertNotIn('sourceComponent: root.image ?', group)
        self.assertNotIn('active: root.appIcon && root.image', group)

    def test_notifications_only_emphasize_heading(self):
        dock = source("NotifDock.qml")
        self.assertIn('text: Tr.tr("Notifications")', dock)
        self.assertNotIn('Tr.trN("%n notification"', dock)
        self.assertIn("color: Colours.palette.m3onSurface", dock)
        self.assertIn("colorizationColor: Colours.palette.m3outlineVariant", dock)
        self.assertIn('text: Config.lock.hideNotifs ? Tr.tr("Unlock for notifications") : Tr.tr("No notifications")', dock)
        self.assertIn("color: Colours.palette.m3outlineVariant", dock)


if __name__ == "__main__":
    unittest.main()
