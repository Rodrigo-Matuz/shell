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
    def test_call_controls_are_capability_gated_without_participant_volume(self):
        for component in ("modules/dashboard/media/VoiceCall.qml", "modules/dashboard/dash/VoiceCall.qml"):
            page = (ROOT / component).read_text()
            self.assertIn("DiscordVoice.controlsAvailable", page)
            self.assertIn('sendCommand("selfMute"', page)
            self.assertIn('sendCommand("selfDeaf"', page)
            self.assertNotIn('sendCommand("volume"', page)
            self.assertNotIn("modelData.localVolume", page)
            self.assertNotIn("StyledSlider {", page)

    def test_full_roster_shows_two_people_per_row_and_talk_hear_status(self):
        page = (ROOT / "modules/dashboard/media/VoiceCall.qml").read_text()
        self.assertIn("GridLayout {", page)
        self.assertIn("columns: 2", page)
        self.assertIn('text: modelData.muted || modelData.deafened ? "mic_off" : "mic"', page)
        self.assertIn('text: modelData.deafened ? "hearing_disabled" : "headphones"', page)
        self.assertIn("modelData.speaking", page)

    def test_elided_participant_names_are_available_on_hover(self):
        for component in ("modules/dashboard/media/VoiceCall.qml", "modules/dashboard/dash/VoiceCall.qml"):
            page = (ROOT / component).read_text()
            self.assertIn("Controls.ToolTip.text: modelData.name", page)
            self.assertIn("HoverHandler {", page)

    def test_compact_roster_keeps_readable_names_and_talk_hear_status(self):
        page = (ROOT / "modules/dashboard/dash/VoiceCall.qml").read_text()
        self.assertIn('text: modelData.muted || modelData.deafened ? "mic_off" : "mic"', page)
        self.assertIn('text: modelData.deafened ? "hearing_disabled" : "headphones"', page)

    def test_full_call_controls_share_a_row_to_the_left_of_channel_and_server(self):
        page = (ROOT / "modules/dashboard/media/VoiceCall.qml").read_text()
        mute = page.index('onClicked: DiscordVoice.sendCommand("selfMute"')
        deafen = page.index('onClicked: DiscordVoice.sendCommand("selfDeaf"')
        channel = page.index('text: DiscordVoice.call?.name ?? ""')
        server = page.index('text: DiscordVoice.call?.contextName ?? ""')
        roster = page.index('objectName: "voiceParticipantList"')
        self.assertLess(mute, deafen)
        self.assertLess(deafen, channel)
        self.assertLess(channel, server)
        self.assertLess(server, roster)
        self.assertNotIn('text: DiscordVoice.self?.muted ? Tr.tr("Muted")', page)
        self.assertNotIn('text: DiscordVoice.self?.deafened ? Tr.tr("Deafened")', page)
        self.assertIn('Accessible.name: DiscordVoice.self?.muted', page)
        self.assertIn('Accessible.name: DiscordVoice.self?.deafened', page)

    def test_participant_avatars_are_clipped_to_circles_in_both_views(self):
        for component in ("modules/dashboard/media/VoiceCall.qml", "modules/dashboard/dash/VoiceCall.qml"):
            page = (ROOT / component).read_text()
            self.assertIn("import Quickshell.Widgets", page)
            self.assertIn("ClippingRectangle {", page)
            self.assertIn("radius: width / 2", page)
            self.assertIn('source: modelData.avatar ?? ""', page)

    def test_compact_call_controls_share_a_row_to_the_left_of_names(self):
        page = (ROOT / "modules/dashboard/dash/VoiceCall.qml").read_text()
        header = page.split("MediaParts.CoverVisualiser {", 1)[1].split("In voice", 1)[0]
        self.assertLess(header.index('icon: DiscordVoice.self?.muted'), header.index('text: DiscordVoice.call?.name'))
        self.assertLess(header.index('icon: DiscordVoice.self?.deafened'), header.index('text: DiscordVoice.call?.contextName'))
        self.assertIn('Accessible.name: DiscordVoice.self?.muted', header)
        self.assertIn('Accessible.name: DiscordVoice.self?.deafened', header)

    def test_app_volume_is_pipewire_playback_not_discord_person_volume(self):
        volume = (ROOT / "modules/dashboard/media/VoiceVolume.qml").read_text()
        self.assertIn("Audio.vesktopPlayback", volume)
        self.assertIn("Audio.setStreamVolume(Audio.vesktopPlayback", volume)
        for component in ("modules/dashboard/media/VoiceCall.qml", "modules/dashboard/dash/VoiceCall.qml"):
            page = (ROOT / component).read_text()
            self.assertIn("VoiceVolume {", page)
            self.assertNotIn("StyledSlider {", page)

    def test_call_art_uses_original_visualiser_and_cover_mask(self):
        full = (ROOT / "modules/dashboard/Media.qml").read_text()
        visualiser = (ROOT / "modules/dashboard/media/CoverVisualiser.qml").read_text()
        art = (ROOT / "components/widgets/CoverArt.qml").read_text()
        compact = (ROOT / "modules/dashboard/dash/VoiceCall.qml").read_text()
        self.assertIn("voiceCall: root.callVisible", full)
        self.assertNotIn("visible: !root.callVisible\n            Layout.fillHeight", full)
        self.assertIn("voiceCall: true", compact)
        self.assertIn("CoverVisualiser {", compact)
        self.assertIn("artworkSource: root.voiceCall", visualiser)
        self.assertIn("fallbackIcon: root.voiceCall", visualiser)
        self.assertIn("showBrokenIcon: !root.voiceCall", visualiser)
        self.assertIn("source: root.artworkSource", art)
        self.assertIn("root.fallbackIcon", art)

    def test_every_participant_is_reachable_in_a_vertical_scroll_area(self):
        for component in ("modules/dashboard/media/VoiceCall.qml", "modules/dashboard/dash/VoiceCall.qml"):
            page = (ROOT / component).read_text()
            self.assertIn("flickableDirection: Flickable.VerticalFlick", page)
            self.assertIn("ScrollBar.vertical:", page)
            self.assertIn("active: participantList.contentHeight > participantList.height", page)
            self.assertIn("model: DiscordVoice.participants", page)
            self.assertNotIn("DiscordVoice.participants.slice(", page)
            self.assertNotIn("DiscordVoice.participants.filter(", page)

    def test_application_volume_is_a_fixed_vertical_control_outside_roster(self):
        volume = (ROOT / "modules/dashboard/media/VoiceVolume.qml").read_text()
        self.assertIn("FilledSlider {", volume)
        self.assertIn('text: Tr.tr("App")', volume)
        self.assertIn("onMoved: Audio.setStreamVolume(Audio.vesktopPlayback, value)", volume)
        self.assertNotIn("onWheel:", volume)
        for component in ("modules/dashboard/media/VoiceCall.qml", "modules/dashboard/dash/VoiceCall.qml"):
            page = (ROOT / component).read_text()
            self.assertIn("VoiceVolume {", page)
            self.assertLess(page.index("Flickable {"), page.index("VoiceVolume {"))


if __name__ == "__main__":
    unittest.main()
