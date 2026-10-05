"""Source-level contracts for live wallpapers (QML runtime is checked by qmllint/build)."""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


def source(path):
    return (ROOT / path).read_text()


class LiveWallpaperTests(unittest.TestCase):
    def test_background_video_playback_is_muted_looped_and_pauses_per_screen(self):
        wallpaper = source("modules/background/Wallpaper.qml")
        background = source("modules/background/Background.qml")
        self.assertIn("import QtMultimedia", wallpaper)
        self.assertRegex(wallpaper, r"MediaPlayer\s*\{[\s\S]*?loops:\s*MediaPlayer\.Infinite")
        self.assertRegex(wallpaper, r"AudioOutput\s*\{[\s\S]*?muted:\s*true")
        self.assertIn("VideoOutput {", wallpaper)
        self.assertIn("GameMode.enabled", background)
        self.assertIn("modelData", background)
        self.assertRegex(wallpaper, r"playbackEnabled.*")
        self.assertRegex(wallpaper, r"stop\(\)")
        self.assertRegex(wallpaper, r"destroy\(\)")
        self.assertIn("CachingImage {", wallpaper)
        self.assertIn("Wallpapers.thumbnailUrl", source("components/images/WallpaperImage.qml"))
        self.assertIn("path: video.path", wallpaper)
        self.assertIn("onCurrentChanged: if (current?.ready) retireTimer.restart()", wallpaper)
        self.assertIn("poster.status === Image.Ready", wallpaper)
        self.assertIn("fallbackRetireTimer.restart()", wallpaper)
        self.assertIn("fallbackRetireTimer.stop()", wallpaper)
        self.assertIn("qt6.qtmultimedia", source("nix/default.nix"))

    def test_service_discovers_videos_and_tracks_saved_thumbnail(self):
        service = source("services/Wallpapers.qml")
        paths = source("utils/Paths.qml")
        self.assertIn("CAELESTIA_LIVE_WALLPAPERS_DIR", paths)
        self.assertIn("${home}/Pictures/Live-Wallpapers", paths)
        self.assertRegex(service, r"function isVideo\(path: string\): bool")
        self.assertIn('["mp4", "mkv", "webm"]', service)
        self.assertNotIn("text.trim()", service)
        self.assertRegex(service, r"FileSystemModel\s*\{\s*id: liveWallpapers[\s\S]*?filter: FileSystemModel.Files")
        self.assertIn("...liveWallpapers.entries", service)
        self.assertIn("filter: FileSystemModel.Images", service)
        self.assertIn('key: "path"', service)
        self.assertIn("${Paths.state}/wallpaper/thumbnail.jpg", service)
        self.assertIn("onFileChanged: reload()", service)
        self.assertIn("thumbnailRevision", service)
        self.assertIn("setVideoProc.running = true", service)
        self.assertNotRegex(service, r"actualCurrent = path;\s*if \(isVideo\(path\)\)")
        self.assertRegex(service, r"onExited: code => \{[\s\S]*?code === 0[\s\S]*?root\.thumbnailRevision")

    def test_live_directory_filters_do_not_call_js_flatmap_on_qml_list(self):
        service = source("services/Wallpapers.qml")
        self.assertNotIn("videoExtensions.flatMap", service)
        self.assertIn("nameFilters:", service)
        self.assertIn("*.${ext.toUpperCase()}", service)

    def test_video_thumbnails_used_by_colour_preview_lock_and_picker(self):
        service = source("services/Wallpapers.qml")
        self.assertIn('"--thumbnail-info"', service)
        self.assertIn('getPreviewThumbnailProc.requestedPath === result.source', service)
        self.assertIn("root.previewPath", service)
        self.assertIn("Wallpapers.thumbnailForCurrent", source("services/Colours.qml"))
        self.assertIn("Wallpapers.thumbnailUrl", source("components/images/WallpaperImage.qml"))
        self.assertIn("WallpaperImage {", source("modules/background/Wallpaper.qml"))
        self.assertIn("WallpaperImage {", source("modules/lock/LockSurface.qml"))
        self.assertIn("WallpaperImage {", source("modules/nexus/pages/WallpaperAndStyle.qml"))
        self.assertIn("WallpaperImage {", source("modules/launcher/items/WallpaperItem.qml"))
        self.assertIn("WallpaperImage {", source("modules/nexus/common/WallItem.qml"))
        thumb = source("components/images/WallpaperImage.qml")
        self.assertIn('"--thumbnail-info"', thumb)
        self.assertIn("result.source === root.path", thumb)
        self.assertIn("cache: false", thumb)
        self.assertIn("Component.onCompleted: refresh()", thumb)

    def test_video_browse_and_nexus_gallery_include_video_without_losing_images(self):
        nexus = source("modules/nexus/pages/wallandstyle/WallpaperSelect.qml")
        category = source("modules/nexus/pages/wallandstyle/WallpaperCategory.qml")
        self.assertIn("...Wallpapers.videoExtensions", nexus)
        self.assertIn("...Images.validImageExtensions", nexus)
        self.assertIn("Wallpapers.getCategoryFor(w)", category)
        self.assertIn("Wallpapers.getCategoryFor(w)", nexus)
        self.assertIn("Live wallpapers", nexus)
        self.assertIn("SunnydeuS/Caelestia-Live-Wallpapers-Integration", source("README.md"))


if __name__ == "__main__":
    unittest.main()
