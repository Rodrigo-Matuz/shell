# CaelestiaVoice for stock Vesktop (opt-in)

`homeManagerModules.vesktop-voice` is an opt-in Home Manager module exported by the Caelestia shell flake. It copies the canonical `./caelestiaVoice` sources into the **pinned nixpkgs** Vencord build, preserving its dependency lock, patches and build flags. The stock nixpkgs Vesktop is overridden to embed that Vencord and uses `programs.vesktop.vencord.useSystem = true`. Installing Caelestia alone does not install or enable the Vesktop plugin.

## Install with Home Manager

1. Add/update the `caelestia-shell` input in your flake and lock a revision containing this module.
2. Add the named module alongside the Caelestia module in your Home Manager imports (for NixOS with integrated Home Manager, inside `home-manager.users.<user>.imports`):

   ```nix
   inputs.caelestia-shell.homeManagerModules.default
   inputs.caelestia-shell.homeManagerModules.vesktop-voice
   ```

   The previous path import `(import "${inputs.caelestia-shell}/integrations/vencord/default.nix")` also works; use **one or the other**, not both. Do not install a second Vesktop through `home.packages` or `nix profile`.
3. Stop Vesktop before activating Home Manager. Back up `~/.config/vesktop/settings/settings.json` and `~/.config/vesktop/state.json` if they exist; build the configuration first. A build alone does not change the running application.
4. On activation, the module seeds a **regular, mode 0600, writable settings file** with `plugins.CaelestiaVoice.enabled = true` only if it is absent. It preserves an existing writable file or remaining symlink. If you already have Vesktop settings, enable CaelestiaVoice in Vencord's plugin UI; importing the module will not overwrite your settings. Subsequent Nix settings edits do not replace a seeded file.
5. If you previously configured a development `vencordDir` in `~/.config/vesktop/state.json`, remove **only that field**, after the new package is installed, or Vesktop will keep loading the development checkout. Fresh installations do not need this step. Start Vesktop and check its plugin list and voice socket; a build does not prove runtime behavior.

No activation, restart, flake update, or modification of your system configuration is performed by this repository module itself.

## Isolated pre-install check

Evaluate the exported path with `nix eval --raw --no-write-lock-file .#homeManagerModules.vesktop-voice` in the shell checkout. To test activation without switching, use a scratch Home Manager consumer with the pinned nixpkgs and Home Manager inputs, importing this module and building its `activationPackage`; do **not** run `activate`. Before switching a NixOS installation, check and build its flake with `--no-write-lock-file` after updating the shell input.
