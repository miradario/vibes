export function groupPhotoPayload(encoded: string) {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.byteLength > 10485760)
    throw new Error("La imagen debe pesar menos de 10 MB.");
  const type =
    bytes[0] === 0xff && bytes[1] === 0xd8
      ? "image/jpeg"
      : bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      ? "image/png"
      : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      ? "image/webp"
      : null;
  if (!type) throw new Error("Elegí una imagen JPG, PNG o WebP.");
  return {
    body: bytes.buffer,
    type,
    ext: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[
      type
    ],
  };
}
