"""The dashboard must present a voice call without replacing MPRIS music."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DiscordVoiceMediaTest(unittest.TestCase):
    def test_full_tab_has_separate_call_and_music_views(self):
        page = (ROOT / "modules/dashboard/Media.qml").read_text()
        self.assertIn("DiscordVoice.connected", page)
        self.assertIn("VoiceCall {", page)
        self.assertIn("Players.active", page)
        self.assertIn("LyricsAndSelector {", page)
        self.assertIn("onShowMusicRequested: root.showMusic = true", page)

    def test_compact_card_preserves_music_controls(self):
        page = (ROOT / "modules/dashboard/dash/Media.qml").read_text()
        self.assertIn("DiscordVoice.connected", page)
        self.assertIn("VoiceCall {", page)
        self.assertIn("onShowMusicRequested: root.showMusic = true", page)
        self.assertIn("Players.active?.togglePlaying()", page)
    def test_call_controls_are_capability_gated_and_local_volume_is_separate(self):
        for component in ("modules/dashboard/media/VoiceCall.qml", "modules/dashboard/dash/VoiceCall.qml"):
            page = (ROOT / component).read_text()
            self.assertIn("DiscordVoice.controlsAvailable", page)
            self.assertIn('sendCommand("selfMute"', page)
            self.assertIn('sendCommand("selfDeaf"', page)
            self.assertIn('sendCommand("volume"', page)
            self.assertIn("modelData.localVolume", page)
            self.assertIn("interactionOnMove: false", page)

    def test_app_volume_is_pipewire_playback_not_discord_person_volume(self):
        for component in ("modules/dashboard/media/VoiceCall.qml", "modules/dashboard/dash/VoiceCall.qml"):
            page = (ROOT / component).read_text()
            self.assertIn("Audio.vesktopPlayback", page)
            self.assertIn("Audio.setStreamVolume(Audio.vesktopPlayback", page)
            self.assertIn("StyledSlider {", page)


if __name__ == "__main__":
    unittest.main()
