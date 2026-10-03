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
