// PipeWire output streams are playback; input streams are microphone capture.
// The voice integration is shared by Discord-compatible Linux clients rather
// than being tied to Vesktop's application name.
const DISCORD_CLIENT_NAMES = new Set(["equibop", "vesktop"]);

function isDiscordClient(value) {
    return typeof value === "string" && DISCORD_CLIENT_NAMES.has(value.trim().toLowerCase());
}

function findDiscordClientPlayback(streams) {
    for (const stream of streams) {
        const properties = stream?.properties;
        if (properties?.["media.class"] !== "Stream/Output/Audio")
            continue;

        if (isDiscordClient(properties["application.name"])
                || isDiscordClient(properties["application.process.binary"])
                || isDiscordClient(properties["node.name"]))
            return stream;
    }
    return null;
}
