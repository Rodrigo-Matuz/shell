// PipeWire output streams are playback; input streams are microphone capture.
function findVesktopPlayback(streams) {
    for (const stream of streams) {
        const properties = stream?.properties;
        if (properties?.["media.class"] === "Stream/Output/Audio"
                && properties?.["application.name"]?.toLowerCase() === "vesktop")
            return stream;
    }
    return null;
}
