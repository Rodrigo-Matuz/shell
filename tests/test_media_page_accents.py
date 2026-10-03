"""Media-page accent roles; keep transport and visualizer implementations intact."""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "modules/dashboard/media"


def source(filename):
    return (MEDIA / filename).read_text()


class MediaPageAccentsTest(unittest.TestCase):
    def test_tabs_already_use_red_media_and_blue_weather(self):
        tabs = (ROOT / "modules/dashboard/Tabs.qml").read_text()
        self.assertIn('case "queue_music": return Colours.accents.red;', tabs)
        self.assertIn('case "cloud": return Colours.accents.blue;', tabs)
        self.assertIn('color: root.accentForTab(bar.currentItem?.iconName ?? "")', tabs)
        self.assertIn('tab.current ? Colours.palette.m3onSurface : Colours.palette.m3onSurfaceVariant', tabs)

    def test_neutral_title_artist_and_orange_album(self):
        details = source("Details.qml")
        title = details.split('text: Players.active?.trackTitle ?? ""', 1)[1].split('    StyledText {', 1)[0]
        artist = details.split('text: Players.active?.trackArtist ||', 1)[1].split('    StyledText {', 1)[0]
        self.assertNotIn('Colours.accents.', title)
        self.assertIn('color: Colours.palette.m3onSurfaceVariant', artist)
        self.assertIn('color: Colours.light ? Colours.palette.m3secondary : Colours.accents.orange', details)

    def test_lyrics_header_yellow_active_line_blue_others_neutral(self):
        header = source("LyricsAndSelector.qml")
        self.assertEqual(2, header.count('Colours.accents.yellow'))
        lyrics = source("LyricList.qml")
        self.assertIn('ListView.isCurrentItem ? (Colours.light ? Colours.palette.m3primary : Colours.accents.blue)', lyrics)
        self.assertIn('mouse.containsMouse ? Colours.palette.m3onSurface : Colours.palette.m3outline', lyrics)
        self.assertIn('shadowColor: Colours.light ? Colours.palette.m3primary : Colours.accents.blue', lyrics)
        self.assertIn('text: "more_vert"', source("LyricsInfo.qml"))

    def test_progress_foreground_and_handle_are_green_without_changing_track(self):
        details = source("Details.qml")
        self.assertIn('fgColour: !enabled ? Qt.alpha(Colours.palette.m3onSurface, 0.38) : Colours.light ? Colours.palette.m3primary : Colours.accents.green', details)
        slider = (ROOT / "components/controls/StyledSlider.qml").read_text()
        self.assertIn('color: root.bgColour', slider)
        self.assertIn('color: root.fgColour', slider)
        self.assertIn('wavy: true', details)

    def test_media_transport_has_purple_primary_and_neutral_secondary_fills(self):
        details = source("Details.qml")
        play = details.split('id: playPauseBtn', 1)[1].split('        IconButton {', 1)[0]
        for prop in ('activeColour', 'inactiveColour'):
            self.assertIn(f'{prop}: Colours.light ? Colours.palette.m3primary : Colours.accents.purple', play)
        for prop in ('activeOnColour', 'inactiveOnColour'):
            self.assertIn(f'{prop}: Colours.light ? Colours.palette.m3onPrimary : Colours.accents.purpleForeground', play)
        for icon in ('skip_previous', 'skip_next'):
            button = details.split(f'icon: "{icon}"', 1)[1].split('        IconButton {', 1)[0]
            self.assertIn('type: IconButton.Tonal', details.split(f'icon: "{icon}"', 1)[0].split('        IconButton {')[-1])
            self.assertIn('inactiveOnColour: Colours.light ? Colours.palette.m3onSecondaryContainer : Colours.accents.purple', button)
            self.assertNotIn('inactiveColour:', button)
        shuffle = details.split('icon: "shuffle"', 1)[1].split('        IconButton {', 1)[0]
        repeat = details.split('icon: Players.active?.loopState', 1)[1].split('        }\n    }', 1)[0]
        for button, accent in ((shuffle, 'yellow'), (repeat, 'red')):
            self.assertIn('activeColour: Colours.palette.m3secondaryContainer', button)
            self.assertIn(f'activeOnColour: Colours.light ? Colours.palette.m3onSecondaryContainer : Colours.accents.{accent}', button)
            self.assertIn(f'inactiveOnColour: Colours.light ? Colours.palette.m3onSecondaryContainer : Colours.accents.{accent}', button)

    def test_player_selector_keeps_tinted_background_neutral_text_purple_icon(self):
        selector = source("LyricsAndSelector.qml")
        self.assertIn('type: SplitButton.Tonal', selector)
        self.assertIn('iconLabel.color: selector.disabled ? selector.disabledTextColour : Colours.light ? Colours.palette.m3onSecondaryContainer : Colours.accents.purple', selector)
        self.assertIn('stateLayer.disabled: true', selector)
        shared = (ROOT / "components/controls/SplitButton.qml").read_text()
        self.assertIn('property color colour: type == SplitButton.Filled ? Colours.palette.m3primary : Colours.palette.m3secondaryContainer', shared)
        self.assertIn('property color textColour: type == SplitButton.Filled ? Colours.palette.m3onPrimary : Colours.palette.m3onSecondaryContainer', shared)

    def test_visualizer_recolors_existing_bars_without_shader_or_renderer_changes(self):
        visualizer = source("CoverVisualiser.qml")
        self.assertIn('data: bars.instances', visualizer)
        self.assertIn('readonly property real value: Math.max(1e-2, Math.min(1, Audio.cava.values[modelData]))', visualizer)
        self.assertIn('readonly property real accentPhase: modelData / GlobalConfig.services.visualiserBars', visualizer)
        for name in ('blue', 'purple', 'red', 'orange', 'yellow'):
            self.assertIn(f'Colours.accents.{name}', visualizer)
        self.assertNotIn('ShaderEffect', visualizer)


if __name__ == "__main__":
    unittest.main()
