"""Structural checks for the fixed six-accent Caelestia shell treatment."""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PaletteTest(unittest.TestCase):
    def test_standalone_shell_uses_cli_fork(self):
        flake = (ROOT / "flake.nix").read_text()
        self.assertIn('url = "github:Rodrigo-Matuz/cli";', flake)

    def test_central_accent_roles(self):
        colours = (ROOT / "services/Colours.qml").read_text()
        for name, hex_value in {
            "red": "FC1A70", "purple": "702EF3", "blue": "1E65FF",
            "orange": "FF4D00", "yellow": "FFFF87", "green": "A4E400",
        }.items():
            self.assertRegex(colours, rf"readonly property color {name}: \"#{hex_value}\"")

    def test_dashboard_tabs_use_semantic_fixed_accents(self):
        tabs = (ROOT / "modules/dashboard/Tabs.qml").read_text()
        for role in ("purple", "red", "orange", "blue"):
            self.assertIn(f"Colours.accents.{role}", tabs)
        self.assertIn('root.accentForTab(bar.currentItem?.iconName ?? "")', tabs)
        self.assertIn("Colours.palette.m3onSurface : Colours.palette.m3onSurfaceVariant", tabs)

    def test_dashboard_home_spreads_accents(self):
        expected = {
            "DateTime.qml": ("purple", "yellow"),
            "Calendar.qml": ("yellow", "red", "purple"),
            "SmallWeather.qml": ("blue", "yellow"),
            "User.qml": ("blue", "red", "purple", "green"),
            "Media.qml": ("red", "yellow", "purple"),
            "Resources.qml": ("blue", "orange", "yellow", "green"),
        }
        for file, roles in expected.items():
            with self.subTest(file=file):
                source = (ROOT / "modules/dashboard/dash" / file).read_text()
                for role in roles:
                    self.assertIn(f"Colours.accents.{role}", source)

    def test_weather_and_media_keep_colourful_controls_readable(self):
        weather = (ROOT / "modules/dashboard/WeatherTab.qml").read_text()
        details = (ROOT / "modules/dashboard/media/Details.qml").read_text()
        shapes = (ROOT / "modules/dashboard/media/BackgroundShapes.qml").read_text()
        for role in ("yellow", "red", "orange", "green"):
            self.assertIn(f"Colours.accents.{role}", weather)
        for role in ("orange", "yellow", "green"):
            self.assertIn(f"Colours.accents.{role}", details)
        self.assertIn("Colours.accents.red", shapes)
        self.assertIn("Colours.light ?", weather)
        self.assertIn("Colours.light ?", details)

    def test_accents_are_used_across_the_shell(self):
        expected = {
            "modules/bar/components/workspaces/ActiveIndicator.qml": ["blue"],
            "modules/dashboard/Performance.qml": ["purple", "green"],
            "modules/dashboard/performance/StorageCard.qml": ["orange"],
            "modules/dashboard/performance/MemoryCard.qml": ["yellow"],
            "modules/dashboard/performance/NetworkCard.qml": ["red", "blue"],
            "modules/utilities/cards/Toggles.qml": ["red", "purple", "blue", "orange", "yellow", "green"],
        }
        for path, accents in expected.items():
            with self.subTest(path=path):
                source = (ROOT / path).read_text()
                for accent in accents:
                    self.assertIn(f"Colours.accents.{accent}", source)


if __name__ == "__main__":
    unittest.main()
