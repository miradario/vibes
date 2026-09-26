// Export browser recordings as mono WAV so they also play on native iOS/Android.
export async function normalizeDayRecording(uri: string) {
  const bytes = await (await fetch(uri)).arrayBuffer();
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(bytes);
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * 22050),
      22050
    );
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const buffer = await offline.startRendering();
    const samples = buffer.getChannelData(0);
    const wav = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(wav);
    const text = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++)
        view.setUint8(offset + i, value.charCodeAt(i));
    };
    text(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 22050, true);
    view.setUint32(28, 44100, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(
        44 + i * 2,
        sample < 0 ? sample * 32768 : sample * 32767,
        true
      );
    }
    return {
      uri: URL.createObjectURL(new Blob([wav], { type: "audio/wav" })),
      name: "Grabación.wav",
      mime: "audio/wav",
    };
  } finally {
    await context.close();
  }
}
