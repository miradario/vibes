export async function normalizeDayRecording(uri: string) {
  return { uri, name: "Grabación.m4a", mime: "audio/mp4" };
}
