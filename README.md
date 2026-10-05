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
- Preserved the legacy recorder behavior as the default and avoided changing glass surfaces, transparency, blur, layout, typography, animations, authentication, notification behavior, media artwork, or system-monitor logic unless required by the feature.

The shell and CLI forks are intended to be used together. The corresponding personal CLI fork is documented in its own README.

## License and upstream

See the original project for its license, upstream history, and authoritative documentation:

https://github.com/caelestia-dots/shell
