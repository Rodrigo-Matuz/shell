# CaelestiaVoice for stock Vesktop (opt-in)

`default.nix` is a standalone Home Manager module. It copies the canonical `./caelestiaVoice` sources into the **pinned nixpkgs** Vencord build (currently 1.15.6), preserving its dependency lock, patches and build flags. The stock nixpkgs Vesktop (currently 1.6.7) is overridden to embed that Vencord and uses `programs.vesktop.vencord.useSystem = true`. Nothing is enabled merely by having these files in the shell repository.

## Install later, in `/etc/nixos` (not done here)

1. Publish the shell repository including this module and `caelestiaVoice/`. Update the `/etc/nixos` flake's `caelestia-shell` input to that revision. The currently locked remote shell input **cannot** see these local uncommitted files.
2. Keep the existing `/etc/nixos/home/vesktop/default.nix` import and settings declarations. Add this separate import to `home-manager.users.matuz.imports` in `/etc/nixos/flake.nix`:

   ```nix
   (import "${inputs.caelestia-shell}/integrations/vencord/default.nix")
   ```

   This is an expression inside the imports list, not a change to the shell's existing `homeManagerModules.default`. Do not also install a second copy of Vesktop in `home.packages` or `nix profile`.
3. Before activating, **stop Vesktop** so it cannot write settings during the transition. Back up `~/.config/vesktop/settings/settings.json` (including the target of any symlink) and `~/.config/vesktop/state.json`. Evaluate/build the changed `/etc/nixos` configuration first. A build alone does not change the running application.
4. On the eventual Home Manager activation, its previous managed read-only settings symlink is removed by `linkGeneration`. This module seeds a **regular, mode 0600, writable file** only if the target is absent. It leaves any existing regular file or remaining symlink untouched. The seed preserves every old root-level key exactly, and adds **only** `plugins.CaelestiaVoice.enabled = true`; it intentionally does not migrate the 79 legacy root-level plugin keys into `plugins` or enable them en masse. Those root keys may not have an effect in Vencord's current schema. For a pre-existing writable file, enable CaelestiaVoice explicitly through Vencord's plugin UI (or edit only `plugins.CaelestiaVoice.enabled` yourself); the seed will not overwrite or repair it. Subsequent Nix settings edits do not replace a seeded file.
5. **Only after** the new package is installed and the Home Manager configuration points at system Vencord, remove only the development `vencordDir` field from `~/.config/vesktop/state.json`. Preserve all other state keys. Otherwise Vesktop continues loading the development checkout, masking the packaged plugin. Do not delete or replace the state file wholesale. Start Vesktop and check its plugin list, writable settings, and voice socket in the live session; a build cannot prove runtime behavior.

No activation, restart, flake update, or modification of `/etc/nixos` is performed by this repository module itself.

## Isolated pre-install check

Use a scratch Home Manager consumer with the **pinned `/etc/nixos` nixpkgs and Home Manager inputs**, importing this local `default.nix` and passing the existing Vesktop settings into `programs.vesktop.vencord.settings`. Evaluate that `home.file."${config.xdg.configHome}/vesktop/settings/settings.json".enable` is `false`, then build the consumer's `activationPackage` with `nix build --impure --no-link --no-write-lock-file --expr '(import /path/to/scratch-consumer.nix).activationPackage'`. Do **not** run its `activate` script. Before the eventual switch, test the updated `/etc/nixos` flake with `nix flake check --no-write-lock-file` and `nix build --no-link --no-write-lock-file /etc/nixos#nixosConfigurations.nixos.config.system.build.toplevel` after the shell input update.
