"""Integration checks for the vendored Caelestia Notes tab."""

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class NotesPluginTests(unittest.TestCase):
    def test_upstream_payload_is_present(self):
        qml = [
            ROOT / "modules/dashboard/NotesTab.qml",
            ROOT / "services/NotesStore.qml",
            *(
                ROOT / "modules/dashboard/notes" / name
                for name in (
                    "NotesPanel.qml", "NoteCardItem.qml", "NoteStackCard.qml",
                    "NoteDetailView.qml", "MarkdownNoteView.qml", "TodoPanel.qml",
                    "TodoDetailView.qml", "TodoDatePicker.qml",
                )
            ),
        ]
        for path in qml:
            with self.subTest(path=path):
                self.assertTrue(path.is_file(), f"Missing upstream plugin file: {path}")
        self.assertIn("pragma Singleton", (ROOT / "services/NotesStore.qml").read_text())
        template = json.loads((ROOT / "config/notes.default.json").read_text())
        self.assertIn("notes", template)
        self.assertIn("todos", template)

    def test_tab_uses_failure_isolated_loader(self):
        content = (ROOT / "modules/dashboard/Content.qml").read_text()
        self.assertIn('text: Tr.tr("Notes")', content)
        self.assertIn('source: Qt.resolvedUrl("NotesTab.qml")', content)
        self.assertIn("visible: notesLoader.status === Loader.Error", content)
        self.assertNotIn("NotesTab {", content)

    def test_dashboard_grabs_keyboard_for_notes_input(self):
        window = (ROOT / "modules/drawers/ContentWindow.qml").read_text()
        self.assertIn(
            "screenState.launcher || screenState.session || screenState.dashboard ? WlrKeyboardFocus.OnDemand",
            window,
        )

    def test_template_is_packaged_for_nix_setup(self):
        cmake = (ROOT / "CMakeLists.txt").read_text()
        self.assertIn("config/notes.default.json", cmake)
        self.assertIn('DESTINATION "${INSTALL_QSCONFDIR}/assets"', cmake)

    def test_loader_error_does_not_recommend_nix_incompatible_installer(self):
        content = (ROOT / "modules/dashboard/Content.qml").read_text()
        self.assertIn('text: Tr.tr("Notes failed to load. Rebuild or reinstall this shell package.")', content)


if __name__ == "__main__":
    unittest.main()
