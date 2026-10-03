"""Structural checks for OBS controls and fixed bar accents."""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class BarAndObsTest(unittest.TestCase):
    def source(self, relative_path):
        return (ROOT / relative_path).read_text()

    def test_date_is_green_and_both_os_logo_variants_blue(self):
        clock = self.source("modules/bar/components/Clock.qml")
        icon = self.source("modules/bar/components/OsIcon.qml")
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
        self.assertNotRegex(indicator, r"color:\s*Math.random\(")

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
