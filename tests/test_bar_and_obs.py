"""Structural checks for OBS controls and fixed bar accents."""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class BarAndObsTest(unittest.TestCase):
    def source(self, relative_path):
        return (ROOT / relative_path).read_text()

    def test_calendar_icon_is_orange_and_bar_time_is_green(self):
        clock = self.source("modules/bar/components/Clock.qml")
        icon = self.source("modules/bar/components/OsIcon.qml")
        self.assertIn('text: "calendar_month"\n                color: Colours.accents.orange', clock)
        self.assertIn("readonly property color colour: Colours.accents.green", clock)
        self.assertEqual(4, clock.count("color: root.colour"))
        self.assertIn("color: Colours.accents.green", clock)
        self.assertIn("topColour: Colours.accents.blue", icon)
        self.assertIn("bottomColour: Colours.accents.blue", icon)
        self.assertIn("colour: Colours.accents.blue", icon)

    def test_active_workspace_changes_to_a_new_fixed_accent_only_on_switch(self):
        workspaces = self.source("modules/bar/components/workspaces/Workspaces.qml")
        indicator = self.source("modules/bar/components/workspaces/ActiveIndicator.qml")
        for accent in ("red", "purple", "blue", "orange", "yellow", "green"):
            self.assertIn(f"Colours.accents.{accent}", workspaces)
        self.assertRegex(workspaces, r"onActiveWsIdChanged:\s*\{")
        self.assertIn("Math.random()", workspaces)
        self.assertIn("if (index >= root.previousAccentIndex)", workspaces)
        self.assertIn("accent: root.activeAccent", workspaces)
        self.assertIn("color: root.accent", indicator)
        self.assertIn("colorizationColor: Colours.accents.foregroundFor(root.accent)", indicator)

    def test_workspace_accent_foregrounds_match_contrast_roles(self):
        colours = self.source("services/Colours.qml")
        indicator = self.source("modules/bar/components/workspaces/ActiveIndicator.qml")
        self.assertIn("function foregroundFor(c: color): color", colours)
        self.assertIn("Qt.colorEqual(c, red)", colours)
        self.assertIn("Qt.colorEqual(c, purple)", colours)
        self.assertIn("Qt.colorEqual(c, blue)", colours)
        self.assertIn("Qt.colorEqual(c, orange)", colours)
        self.assertNotIn("Qt.colorEqual(c, yellow)", colours)
        self.assertNotIn("Qt.colorEqual(c, green)", colours)
        self.assertIn("return whiteForeground;", colours)
        self.assertIn("return darkForeground;", colours)
        self.assertNotIn('colorizationColor: Qt.colorEqual(root.accent', indicator)

    def test_recording_list_uses_videos_and_includes_obs_formats(self):
        paths = self.source("utils/Paths.qml")
        recordings = self.source("modules/utilities/cards/RecordingList.qml")
        card = self.source("modules/utilities/cards/Record.qml")
        self.assertIn('Quickshell.env("CAELESTIA_RECORDINGS_DIR") || videos', paths)
        for extension in ("mp4", "mkv", "mov"):
            self.assertIn(f'"*.{extension}"', recordings)
        self.assertIn("Previous Caelestia recordings", card)
        self.assertIn("property bool allowDelete: false", recordings)
        self.assertIn("visible: root.allowDelete", recordings)
        self.assertIn('directory: `${Paths.videos}/Recordings`', card)
        self.assertIn("import qs.utils", card)
        self.assertIn("allowDelete: true", card)

    def test_bar_status_icons_have_distinct_semantic_accents(self):
        status = self.source("modules/bar/components/StatusIcons.qml")
        expected = {
            "audio": "orange", "microphone": "green",
            "kbLayout": "yellow", "network": "blue",
        }
        for role, accent in expected.items():
            with self.subTest(role=role):
                entry = status[status.index(f'roleValue: "{role}"'):]
                entry = entry[:entry.index('DelegateChoice {')]
                self.assertIn(f'color: Colours.accents.{accent}', entry)
        self.assertIn('color: Colours.tPalette.m3surfaceContainer', status)

    def test_recording_header_is_white_with_red_icon_and_pause_stays_tonal(self):
        card = self.source("modules/utilities/cards/Record.qml")
        header = card[card.index('id: btnLayout'):card.index('text: Tr.tr("Screen recorder")')]
        self.assertIn("color: Recorder.running ? Colours.accents.whiteForeground : Colours.palette.m3secondaryContainer", header)
        self.assertIn('text: "screen_record"', header)
        self.assertIn('Colours.accents.red', header)
        pause = card[card.index('icon: Recorder.paused ? "play_arrow"'):card.index('onClicked: Recorder.togglePause()')]
        self.assertIn('type: IconButton.Tonal', pause)
        self.assertNotIn('activeColour: Colours.accents.whiteForeground', pause)
        self.assertNotIn('inactiveColour: Colours.accents.whiteForeground', pause)
        self.assertNotIn('activeOnColour: Colours.accents.red', pause)
        self.assertNotIn('inactiveOnColour: Colours.accents.red', pause)

    def test_recorder_uses_obs_status_not_legacy_pid(self):
        recorder = self.source("services/Recorder.qml")
        card = self.source("modules/utilities/cards/Record.qml")
        self.assertNotIn('"pidof", "gpu-screen-recorder"', recorder)
        self.assertIn('"caelestia", "record", "--obs", "--status"', recorder)
        self.assertIn('commandProc.exec(["caelestia", "record", "--obs", flag])', recorder)
        for flag in ("--start", "--stop", "--pause"):
            self.assertIn(f'root.request("{flag}")', recorder)
        self.assertIn("Recorder.available", card)
        self.assertIn("Recorder.error", card)
        self.assertIn('if (code !== 0 && !root.statusError && !(root.pending && (!root.commandFinished || root.refreshAfterCommand)))', recorder)
        self.assertIn('readonly property string error: root.commandError || root.statusError', recorder)
        self.assertIn('root.commandError = "OBS recording command failed', recorder)
        self.assertNotIn('root.error = root.available ? ""', recorder)
        self.assertIn('property bool refreshAfterCommand: false', recorder)
        self.assertIn('property bool commandFinished: false', recorder)
        self.assertIn('if (root.refreshAfterCommand && root.pending && root.commandFinished)', recorder)
        self.assertIn('if (root.pending && root.commandFinished)', recorder)
        self.assertIn('root.pending = false;', recorder)
        self.assertRegex(recorder, r'onExited: code => \{[^}]*root\.commandError = "OBS recording command failed;[^}]*statusProc\.running', re.S)
        self.assertNotIn('Recorder.start(["-r"])', card)
        self.assertNotIn('Recorder.start(["-s"])', card)
        self.assertRegex(card, r'icon: Recorder\.paused \? "play_arrow" : "pause"\s+isToggle: false')


if __name__ == "__main__":
    unittest.main()
