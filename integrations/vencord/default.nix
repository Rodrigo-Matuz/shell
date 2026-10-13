# Opt-in Home Manager module; import only alongside the existing Vesktop module.
{ config, lib, pkgs, ... }:
let
  # Keep the pinned nixpkgs derivation's patches, pnpm dependencies and build flags.
  vencordWithVoice = pkgs.vencord.overrideAttrs (old: {
    postPatch = (old.postPatch or "") + ''
      # A real directory inside Vencord is required for @utils / @webpack imports.
      mkdir -p src/userplugins/caelestiaVoice
      cp -r ${./caelestiaVoice}/. src/userplugins/caelestiaVoice/
    '';
  });
  vesktopWithVoice = pkgs.vesktop.override { vencord = vencordWithVoice; };
  settings = config.programs.vesktop.vencord.settings;
  # Retain legacy root-level keys verbatim. Only CaelestiaVoice is opted in under
  # plugins; moving every old root-level key there would enable all plugins.
  seed = pkgs.writeText "caelestia-vencord-initial-settings.json" (builtins.toJSON (
    settings // {
      plugins = (settings.plugins or { }) // {
        CaelestiaVoice = ((settings.plugins or { }).CaelestiaVoice or { }) // { enabled = true; };
      };
    }
  ));
  target = "${config.xdg.configHome}/vesktop/settings/settings.json";
in
{
  programs.vesktop = {
    enable = true;
    package = lib.mkForce vesktopWithVoice;
    vencord.useSystem = true;
  };

  # Home Manager's Vesktop module otherwise links settings.json read-only from
  # programs.vesktop.vencord.settings, causing Vesktop's EROFS writes.
  home.file."${target}".enable = lib.mkForce false;
  home.activation.seedCaelestiaVoiceSettings = lib.hm.dag.entryAfter [ "linkGeneration" ] ''
    # linkGeneration has first removed the old HM-managed read-only link.
    # Never follow or replace a remaining link, nor overwrite a writable file.
    if [ ! -e "${target}" ] && [ ! -L "${target}" ]; then
      run mkdir -p "${config.xdg.configHome}/vesktop/settings"
      run install -m 600 "${seed}" "${target}"
    fi
  '';
}
