export async function synthesizeReportAudio(_text, _options = {}) {
  // Future extension point for Chatterbox or another local TTS engine.
  // Return a file path or URL when a TTS provider is configured.
  return { available: false, url: null };
}
