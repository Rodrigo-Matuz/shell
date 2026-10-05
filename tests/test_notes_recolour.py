"""Scoped color-role checks for Notes and the bar's date display."""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DASH = ROOT / "modules/dashboard"


def section(path, start, end):
    source = path.read_text()
    return source.split(start, 1)[1].split(end, 1)[0]


class NotesRecolourTest(unittest.TestCase):
    def test_notes_navigation_only_selected_icon_and_underline_are_yellow(self):
        content = (DASH / "Content.qml").read_text()
        tabs = (DASH / "Tabs.qml").read_text()
        self.assertIn('iconName: "edit_note"', content)
        self.assertIn('if (iconName === "edit_note")\n            return Colours.accents.yellow;', tabs)
        self.assertLess(tabs.index('if (iconName === "edit_note")'), tabs.index('if (Colours.light)'))
        self.assertIn('color: root.accentForTab(bar.currentItem?.iconName ?? "")', tabs)
        self.assertIn('color: tab.current ? root.accentForTab(tab.iconName) : Colours.palette.m3onSurfaceVariant', tabs)
        self.assertIn('color: tab.current ? Colours.palette.m3onSurface : Colours.palette.m3onSurfaceVariant', tabs)
        self.assertIn('color: tab.current ? root.accentForTab(tab.iconName) : Colours.palette.m3onSurface', tabs)

    def test_normal_note_and_todo_header_actions_are_colored(self):
        notes = (DASH / "notes/NotesPanel.qml")
        view = section(notes, '// View Toggle Button', '// Add Note')
        self.assertIn('inactiveOnColour: NotesStore.viewMode === "grid" ? Colours.accents.purpleForeground : Colours.accents.purple', view)
        add = section(notes, '// Add Note', '// Scrollable Content')
        self.assertIn('inactiveColour: Colours.accents.yellow', add)
        self.assertIn('inactiveOnColour: Colours.accents.darkForeground', add)

        todo = (DASH / "notes/TodoPanel.qml")
        sort = section(todo, '// Sort toggle button', '// Empty Trash button')
        self.assertIn('inactiveOnColour: NotesStore.todoSortMode === "date" ? Colours.accents.purpleForeground : Colours.accents.purple', sort)
        trash = section(todo, '// Trashcan toggle button', '// Add button')
        self.assertIn('inactiveOnColour: root.showTrash ? Colours.palette.m3onPrimary : Colours.accents.red', trash)
        empty_trash = section(todo, '// Empty Trash button', '// Trashcan toggle button')
        self.assertIn('inactiveOnColour: root.confirmEmptyTrash ? Colours.accents.whiteForeground : Colours.accents.red', empty_trash)

    def test_note_editor_action_icons_keep_tonal_surfaces_and_confirm_contrast(self):
        editor = (DASH / "notes/NoteDetailView.qml")
        back = section(editor, '// Left: Back button', 'TextField {')
        self.assertIn('inactiveOnColour: Colours.accents.purple', back)
        view = section(editor, 'id: editToggleBtn', 'IconButton {')
        self.assertIn('inactiveOnColour: root.isEditing ? Colours.accents.orange : Colours.palette.m3onSecondaryContainer', view)
        pin = section(editor, 'icon: "push_pin"', 'IconButton {')
        self.assertIn('inactiveOnColour: root.localPinned ? Colours.accents.blueForeground : Colours.accents.blue', pin)
        delete = section(editor, 'icon: root.confirmDelete ? "check" : "delete"', 'onClicked:')
        self.assertIn('inactiveOnColour: root.confirmDelete ? Colours.accents.whiteForeground : Colours.accents.red', delete)

    def test_green_and_yellow_note_colors_resolve_in_every_card_and_editor(self):
        editor = (DASH / "notes/NoteDetailView.qml").read_text()
        dots = section(DASH / "notes/NoteDetailView.qml", 'model: [', 'delegate: CustomMouseArea')
        for role in ('green', 'yellow'):
            self.assertIn(f'{{ id: "{role}", color: Colours.accents.{role} }}', dots)
            for name in ('NoteDetailView.qml', 'NoteCardItem.qml', 'NoteStackCard.qml'):
                self.assertIn(f'case "{role}": return Colours.accents.{role};', (DASH / "notes" / name).read_text())
        self.assertIn('NotesStore.updateNote(root.activeNote.id, curTitle, curBody, root.localPinned, root.localColor, root.localListShapes);', editor)

    def test_empty_todo_check_is_green_but_empty_trash_icon_is_unchanged(self):
        todo = DASH / "notes/TodoPanel.qml"
        icon = section(todo, 'text: root.showTrash ? "auto_delete" : "check_circle"', 'opacity: 0.8')
        self.assertIn('color: root.showTrash ? Colours.palette.m3primary : Colours.accents.green', icon)

    def test_bar_date_icon_and_text_are_neutral_without_recoloring_time(self):
        clock = (ROOT / "modules/bar/components/Clock.qml").read_text()
        date = clock.split('text: "calendar_month"', 1)[1].split('StyledRect {', 1)[0]
        self.assertIn('color: Colours.palette.m3onSurface', date)
        self.assertEqual(3, date.count('color: Colours.palette.m3onSurface'))
        self.assertIn('readonly property color colour: Colours.accents.green', clock)
        self.assertIn('color: root.colour', clock)


if __name__ == "__main__":
    unittest.main()
