"""Background visualizer remains continuous and uses the fixed accent palette."""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class BackgroundVisualiserTest(unittest.TestCase):
    def test_qml_supplies_all_fixed_accent_colors_to_visualiser(self):
        visualiser = (ROOT / "modules/background/Visualiser.qml").read_text()
        self.assertIn("barColors:", visualiser)
        for role in ("red", "orange", "yellow", "green", "blue", "purple"):
            self.assertIn(f"Colours.accents.{role}", visualiser)
        self.assertNotIn("primaryColor:", visualiser)
        self.assertNotIn("secondaryColor:", visualiser)

    def test_painted_visualiser_uses_contiguous_sides_and_per_bar_colors(self):
        header = (ROOT / "plugin/src/Caelestia/Components/visualiserbars.hpp").read_text()
        source = (ROOT / "plugin/src/Caelestia/Components/visualiserbars.cpp").read_text()
        self.assertIn("Q_PROPERTY(QVariantList barColors", header)
        self.assertIn("QVariantList m_barColors", header)
        self.assertIn("const qreal sideWidth = w * 0.5", source)
        self.assertIn("const qreal sideOffset = rightSide ? w * 0.5 : 0", source)
        self.assertIn("globalIndex", source)
        self.assertIn("m_barColors.at", source)
        self.assertIn("painter->setBrush(barColour)", source)
        self.assertNotIn("const qreal sideWidth = w * 0.4", source)
        self.assertNotIn("sideOffset = rightSide ? w * 0.6", source)


if __name__ == "__main__":
    unittest.main()
