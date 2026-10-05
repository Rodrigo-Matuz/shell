# Caelestia Shell — Matuz personal fork

This repository is a personal fork of the original Caelestia Shell project.

It is not a public project. It exists for Rodrigo Matuz's personal setup and for a small number of friends. No public support, compatibility guarantee, issue triage, release schedule, or general-purpose documentation is provided here.

For normal Caelestia Shell installation, configuration, dependency, usage, or troubleshooting questions, refer to the original project and its documentation. This fork may diverge from upstream at any time.

## Fork changes

This fork keeps the upstream Quickshell architecture and functionality while applying personal changes in the following areas:

- Added a fixed Matuz dark accent palette:
  - red `#FC1A70`
  - purple `#702EF3`
  - blue `#1E65FF`
  - orange `#FF4D00`
  - yellow `#FFFF87`
  - green `#A4E400`
- Made the fixed accent roles independent from wallpaper-derived scheme changes.
- Recolored the bar, tabs, clock, calendar, workspaces, OS indicator, and active workspace foregrounds using semantic accent roles.
- Recolored dashboard weather, calendar, media, resource, user/system-status, and visualizer elements while keeping measurements, surfaces, layout, animation, and service logic intact.
- Rebalanced the media visualizer across all six accents and corrected calendar weekend, adjacent-month, and selected-day presentation.
- Recolored the lock screen: weather, clock/date, password controls, system/fetch card, media controls, resource metrics, and notification heading.
- Recolored the notifications and control-center utility cards, including Keep Awake, recording, quick toggles, and neutral notification content.
- Added shell-side controls for the forked CLI's explicit OBS backend, including status reconciliation, start/stop/pause controls, recording paths, and safe recording-list behavior.
- Added muted, looping video wallpapers with still thumbnails, picker/gallery integration and per-screen playback suspension for fullscreen apps and game mode. Videos are discovered in `~/Pictures/Live-Wallpapers` (override with `CAELESTIA_LIVE_WALLPAPERS_DIR`), and the existing image gallery stays available. Inspiration and credit: [Caelestia Live Wallpapers Integration](https://github.com/SunnydeuS/Caelestia-Live-Wallpapers-Integration); no code was copied from it.
- Added the [Caelestia Notes](https://denzils-repo.github.io/Caelestia_Notes/) dashboard tab by **copying Denzils-repo's actual plugin** (notes, to-dos, Markdown, habits, and local JSON storage), not reimplementing it. Its QML and starter JSON are unmodified from [upstream commit `b19c9d5`](https://github.com/Denzils-repo/Caelestia_Notes/commit/b19c9d5a966424aa9ead10e2ff02a7b626124b0d); this fork only registers the tab and enables dashboard keyboard focus. The existing `Colours.palette`/`Colours.tPalette` bindings pick up this fork's palette and card colors without altering plugin code. Upstream GPL-3.0 license: [`config/CAELESTIA_NOTES_LICENSE`](config/CAELESTIA_NOTES_LICENSE).
- Preserved the legacy recorder behavior as the default and avoided changing glass surfaces, transparency, blur, layout, typography, animations, authentication, notification behavior, media artwork, or system-monitor logic unless required by the feature.

The shell and CLI forks are intended to be used together. The corresponding personal CLI fork is documented in its own README.

### Notes setup

The tab and the original starter template ship in the shell package; **do not run the upstream installer against the Nix store**. To enable upstream's optional starter notes and recovery template, copy the packaged template into your config directory (once, after installing the shell):

```sh
mkdir -p ~/.config/caelestia
shell_bin="$(readlink -f "$(command -v caelestia-shell)")"
cp "$(dirname "$(dirname "$shell_bin")")/share/caelestia-shell/assets/notes.default.json" ~/.config/caelestia/notes.default.json
```

If you skip this, the board starts empty and the starter-template fallback is unavailable. Your own data is stored at `~/.local/state/caelestia/notes.json`; the plugin never needs the CLI. See the [original Notes guide](https://github.com/Denzils-repo/Caelestia_Notes) for usage and limitations. Keyboard focus is enabled for the entire open dashboard so Notes text fields accept input.

## License and upstream

See the original project for its license, upstream history, and authoritative documentation:

https://github.com/caelestia-dots/shell
