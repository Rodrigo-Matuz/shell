"""Control-center accent roles keep content neutral and state colors semantic."""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def source(path):
    return (ROOT / path).read_text()


class ControlCenterAccentsTest(unittest.TestCase):
    def test_notification_management_button_is_purple_with_white_icon(self):
        dock = source("modules/sidebar/NotifDock.qml")
        self.assertIn('icon: "clear_all"', dock)
        self.assertIn('activeColour: Colours.light ? Colours.palette.m3primary : Colours.accents.purple', dock)
        self.assertIn('inactiveColour: Colours.light ? Colours.palette.m3primary : Colours.accents.purple', dock)
        self.assertIn('activeOnColour: Colours.light ? Colours.palette.m3onPrimary : Colours.accents.whiteForeground', dock)
        self.assertIn('inactiveOnColour: Colours.light ? Colours.palette.m3onPrimary : Colours.accents.whiteForeground', dock)
        self.assertIn('color: Colours.palette.m3outline', dock)

    def test_keep_awake_uses_yellow_state_without_repainting_card(self):
        idle = source("modules/utilities/cards/IdleInhibit.qml")
        self.assertIn('color: Colours.tPalette.m3surfaceContainer', idle)
        self.assertIn('color: Colours.light ? Colours.palette.m3tertiary : Colours.accents.yellow', idle)
        self.assertIn('checkedColour: Colours.light ? Colours.palette.m3tertiary : Colours.accents.yellow', idle)
        self.assertIn('checkedOnColour: Colours.light ? Colours.palette.m3onTertiary : Colours.on(Colours.accents.yellow)', idle)
        self.assertIn('color: Colours.light ? Colours.palette.m3tertiary : Colours.accents.yellow', idle)
        self.assertIn('color: Colours.light ? Colours.palette.m3onTertiary : Colours.on(Colours.accents.yellow)', idle)

    def test_switch_checked_colors_are_optional_and_off_state_stays_neutral(self):
        switch = source("components/controls/StyledSwitch.qml")
        self.assertIn('property color checkedColour: Colours.palette.m3primary', switch)
        self.assertIn('property color checkedOnColour: Colours.palette.m3onPrimary', switch)
        self.assertIn('return root.checked ? root.checkedColour : Colours.layer(Colours.palette.m3surfaceContainerHighest, root.cLayer);', switch)
        self.assertIn('return root.checked ? root.checkedOnColour : Colours.layer(Colours.palette.m3outline, root.cLayer + 1);', switch)

    def test_recorder_uses_purple_icon_and_red_recording_actions(self):
        record = source("modules/utilities/cards/Record.qml")
        self.assertIn('text: "screen_record"', record)
        self.assertIn('color: Recorder.running ? (Colours.light ? Colours.palette.m3error : Colours.accents.red) : (Colours.light ? Colours.palette.m3primary : Colours.accents.purple)', record)
        action = record.split('text: Tr.tr("Record in OBS")', 1)[1].split('    }', 1)[0]
        self.assertIn('type: TextButton.Filled', action)
        self.assertIn('activeColour: Colours.light ? Colours.palette.m3error : Colours.accents.red', action)
        self.assertIn('inactiveColour: Colours.light ? Colours.palette.m3error : Colours.accents.red', action)
        self.assertIn('activeOnColour: Colours.light ? Colours.palette.m3onError : Colours.accents.whiteForeground', action)
        self.assertIn('inactiveOnColour: Colours.light ? Colours.palette.m3onError : Colours.accents.whiteForeground', action)
        self.assertIn('color: Recorder.paused ? (Colours.light ? Colours.palette.m3tertiary : Colours.accents.yellow) : (Colours.light ? Colours.palette.m3error : Colours.accents.red)', record)

    def test_recording_list_controls_are_neutral_by_default(self):
        recordings = source("modules/utilities/cards/RecordingList.qml")
        self.assertIn('text: "list"', recordings)
        self.assertIn('color: Colours.palette.m3onSurface', recordings)
        self.assertEqual(3, recordings.count('inactiveOnColour: Colours.palette.m3onSurfaceVariant'))
        self.assertNotIn('inactiveOnColour: Colours.accents.purple', recordings)

    def test_quick_toggles_use_active_accents_and_central_foreground_tokens(self):
        toggles = source("modules/utilities/cards/Toggles.qml")
        self.assertIn('inactiveColour: Colours.layer(Colours.palette.m3surfaceContainerHighest, 2)', toggles)
        for accent in ("blue", "green", "purple", "red"):
            self.assertIn(f'activeColour: Colours.accents.{accent}', toggles)
        self.assertIn('inactiveOnColour: Colours.accents.orange', toggles)
        self.assertIn('activeOnColour: Colours.accents.whiteForeground', toggles)
        self.assertIn('activeOnColour: Colours.accents.darkForeground', toggles)
        self.assertNotIn('activeOnColour: "#FFFFFF"', toggles)
        self.assertNotIn('activeOnColour: "#050505"', toggles)

    def test_control_center_foreground_tokens_are_centralized(self):
        colours = source("services/Colours.qml")
        self.assertIn('readonly property color whiteForeground: "#FFFFFF"', colours)
        self.assertIn('readonly property color darkForeground: "#050505"', colours)


if __name__ == "__main__":
    unittest.main()
