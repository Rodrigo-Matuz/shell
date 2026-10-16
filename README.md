# Caelestia Shell — Matuz personal fork

This repository is Rodrigo Matuz's personal fork of [Caelestia Shell](https://github.com/caelestia-dots/shell), built around Quickshell and Home Manager.

It is not a general-purpose distribution. The fork follows one workstation's setup, keeps personal defaults, and may diverge from upstream without compatibility guarantees, public support, issue triage, or a release schedule.

## What this fork adds

The fork keeps the upstream shell architecture and adds or maintains:

- A fixed Matuz dark accent palette:
  - red `#FC1A70`
  - purple `#702EF3`
  - blue `#1E65FF`
  - orange `#FF4D00`
  - yellow `#FFFF87`
  - green `#A4E400`
- Semantic accent roles that do not change when the wallpaper-derived color scheme changes.
- Palette-aware bar, tabs, clock, calendar, workspaces, dashboard, lock screen, notifications, and control-center styling without changing their layout or service logic.
- Explicit OBS controls for the forked Caelestia CLI, including recording status, start/stop/pause controls, recording paths, and safe recording-list handling.
- Muted looping video wallpapers with still thumbnails, picker/gallery integration, per-screen playback suspension, and fullscreen/game-mode handling. Videos are discovered in `~/Pictures/Live-Wallpapers`; set `CAELESTIA_LIVE_WALLPAPERS_DIR` to use another directory.
- The vendored [Caelestia Notes](https://denzils-repo.github.io/Caelestia_Notes/) dashboard tab. Its upstream GPL-3.0 license is included at [`config/CAELESTIA_NOTES_LICENSE`](config/CAELESTIA_NOTES_LICENSE).
- An opt-in Discord-client/Vencord integration that exposes active Discord voice calls in the dashboard. See [CaelestiaVoice](#caelestiavoice-for-vesktop-and-equibop) below.

The shell and [the matching CLI fork](https://github.com/Rodrigo-Matuz/cli) are intended to be used together. The CLI has its own installation and configuration.

## Companion CLI fork

Use the [Caelestia CLI fork](https://github.com/Rodrigo-Matuz/cli) for wallpaper selection, color schemes, screenshots, recording, shell IPC, installation, and updates. The shell provides the graphical interface and services; the CLI provides the commands that control them. The shell's default Home Manager package uses the matching CLI through its `with-cli` build, so a separate CLI package is usually unnecessary when both are installed through Home Manager.

## Install the shell with Home Manager

The flake exports a Home Manager module at `homeManagerModules.default`.

Add the shell input to the consumer flake:

```nix
inputs.caelestia-shell = {
  url = "github:Rodrigo-Matuz/shell";
  inputs.nixpkgs.follows = "nixpkgs";
  inputs.caelestia-cli.follows = "caelestia-cli";
};
```

Import the module and enable the shell in the Home Manager profile:

```nix
home-manager.users.<user>.imports = [
  inputs.caelestia-shell.homeManagerModules.default
];

programs.caelestia.enable = true;
```

`programs.caelestia` starts the shell as a user service by default. The module's default shell package includes the matching CLI package; `programs.caelestia.cli.enable` is available when the standalone CLI package and its configuration should also be added explicitly.

Build the consumer configuration before activating it:

```sh
nix flake check --no-write-lock-file
nixos-rebuild dry-build --flake .#<host> --no-write-lock-file
sudo nixos-rebuild switch --flake .#<host>
```

A build does not change the running shell. Restart the user service or log in again after activation if the current session does not pick up the new generation.

## CaelestiaVoice for Vesktop and Equibop

### What it does

`CaelestiaVoice` is a Vencord userplugin shared by Vesktop and Equibop/Equicord builds. It connects the running Discord-compatible client to Caelestia through a small local Unix socket:

1. Vencord observes the active Discord voice state.
2. The plugin validates and publishes a bounded JSON snapshot.
3. Caelestia reads the snapshot from `$XDG_RUNTIME_DIR/caelestia-voice/discord-voice.sock`.
4. The full and compact dashboard media views switch from the MPRIS player view to a voice-call view when a call is active.

The shared socket name is intentionally client-neutral. After updating, fully restart the Discord client and the Caelestia user service so both sides use the new protocol endpoint.

The call view can show:

- Guild, private-call, or group-call identity and an icon or fallback image.
- The current channel or call name.
- A bounded participant roster with avatars and speaking, mute, deafen, and local-volume state.
- The local user's mute and deafen state.
- Guarded self mute/deafen controls and participant volume controls when the loaded Discord client exposes the expected actions and readback succeeds.
- A separate Discord-client application-volume slider backed by PipeWire. It selects Vesktop or Equibop output streams and changes the client's output volume, not a participant's Discord volume.
- A return path to the normal MPRIS music view, so music playback remains available when it shares the dashboard with a call.

The bridge does not use Discord tokens, self-bots, bots, or the arRPC Rich Presence socket. The socket directory is created with mode `0700` and the socket with mode `0600`; snapshots are validated and bounded before the shell consumes them.

The feature is opt-in. Installing Caelestia Shell alone does not install Vesktop or Equibop, build Vencord/Equicord, or enable the plugin.

### Enable it in Home Manager

The flake exports a second module at `homeManagerModules.vesktop-voice`. Import it alongside the normal Caelestia module:

```nix
home-manager.users.<user>.imports = [
  inputs.caelestia-shell.homeManagerModules.default
  inputs.caelestia-shell.homeManagerModules.vesktop-voice
];
```

The plugin source and socket protocol are host-neutral. The exported `homeManagerModules.vesktop-voice` module packages it for Vesktop; the [personal Equibop/Equicord fork](https://github.com/Rodrigo-Matuz/Equibop) embeds the same source through its Nix flake without changing the plugin contract. The shell identifies the client's PipeWire output by Discord-client metadata rather than assuming the application is named Vesktop.

Do not import the named module and the old path import together. These are alternatives:

```nix
# Preferred: named flake output
inputs.caelestia-shell.homeManagerModules.vesktop-voice

# Older equivalent
(import "${inputs.caelestia-shell}/integrations/vencord/default.nix")
```

Do not install another Vesktop through `home.packages` or `nix profile`; duplicate Vesktop desktop files and icons can make Home Manager activation fail.

### Optional Vesktop settings

This subsection only applies if you also enable `homeManagerModules.vesktop-voice`. Installing or using Caelestia Shell alone does not require Vesktop, Vencord, or any of these settings.

When the optional Vesktop module is enabled, Vencord plugin options belong under `vencord.settings.plugins`, not directly under `vencord.settings`:

```nix
programs.vesktop.vencord.settings.plugins = {
  ImageZoom.enabled = true;
  Translate = {
    enabled = true;
    receivedOutput = "pt";
  };
};
```

The voice module adds `plugins.CaelestiaVoice.enabled = true` to its initial settings. It seeds a normal writable file at:

```text
~/.config/vesktop/settings/settings.json
```

The module only creates that file when it is absent. It does not overwrite an existing writable settings file or a remaining symlink, and later Nix changes do not replace a file that was already seeded. If Vesktop already has settings, back them up and enable `CaelestiaVoice` from Vencord's plugin settings, or remove the settings file deliberately before activating the new generation:

```sh
# Stop Vesktop first, then preserve the old settings
mv ~/.config/vesktop/settings/settings.json \
  ~/.config/vesktop/settings/settings.json.before-caelestiavoice
```

Back up `~/.config/vesktop/state.json` before changing it as well. If that file contains a `vencordDir` pointing to a development checkout, Vesktop will continue loading that checkout instead of the Nix-built Vencord. Remove only the `vencordDir` field when moving back to the packaged module; do not replace the whole state file.

After activating Home Manager, start Vesktop and check the Vencord plugin list. A successful Nix build proves that the package and activation script evaluate; it does not prove that an already-running Vesktop process loaded the new Vencord bundle.

The detailed module notes and isolated activation checks are in [`integrations/vencord/README.md`](integrations/vencord/README.md).

### Development layout

- Plugin source: [`integrations/vencord/caelestiaVoice`](integrations/vencord/caelestiaVoice)
- Home Manager module: [`integrations/vencord/default.nix`](integrations/vencord/default.nix)
- Shell socket reader: [`services/DiscordVoice.qml`](services/DiscordVoice.qml)
- Snapshot validation: [`services/DiscordVoiceValidation.js`](services/DiscordVoiceValidation.js)
- Discord-client PipeWire stream selection: [`services/DiscordClientStream.js`](services/DiscordClientStream.js)
- Full voice dashboard view: [`modules/dashboard/media/VoiceCall.qml`](modules/dashboard/media/VoiceCall.qml)
- Compact voice dashboard view: [`modules/dashboard/dash/VoiceCall.qml`](modules/dashboard/dash/VoiceCall.qml)

## Notes setup

The Notes tab and its starter template ship in the shell package. Do not run the upstream installer against the Nix store. To copy the optional starter template into your user configuration after installing the shell:

```sh
mkdir -p ~/.config/caelestia
shell_bin="$(readlink -f "$(command -v caelestia-shell)")"
cp "$(dirname "$(dirname "$shell_bin")")/share/caelestia-shell/assets/notes.default.json" \
  ~/.config/caelestia/notes.default.json
```

Your notes live at `~/.local/state/caelestia/notes.json`. The plugin does not require the CLI. See the [original Notes guide](https://github.com/Denzils-repo/Caelestia_Notes) for usage and limitations.

## Verification and limitations

The repository contains focused tests for the voice snapshot validator, socket bridge, stream selection, and dashboard contracts. Run the relevant checks from the repository root:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.mjs integrations/vencord/caelestiaVoice/*.test.mjs
nix flake check --no-write-lock-file
nix build .#default --no-link --no-write-lock-file
```

Live Discord behavior still depends on the Vesktop and Equibop/Equicord builds loaded on the target machine. Test guild calls, private calls, group calls, reconnects, client restarts, missing icons, PipeWire application-volume changes, and dashboard controls after updating the consuming flake. Do not treat a Nix build or an offscreen UI test as proof that a graphical call view works in a running session.

## License and upstream

This fork follows the original project's GPL-3.0-only license and keeps upstream attribution. See the [upstream Caelestia Shell repository](https://github.com/caelestia-dots/shell) for the authoritative license, architecture, and upstream history.
