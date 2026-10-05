type PixelStoreContext = {
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: number;
  UNPACK_COLORSPACE_CONVERSION_WEBGL: number;
  pixelStorei: (parameter: number, value: number | boolean) => void;
};
const prepared = new WeakSet<PixelStoreContext>();

// Expo GL implements UNPACK_FLIP_Y_WEBGL and UNPACK_ALIGNMENT, but not
// these two browser-only conversions. Scope the adapter to Vibi's context.
export function prepareExpoGLContext(context: PixelStoreContext) {
  if (prepared.has(context)) return;
  const pixelStorei = context.pixelStorei.bind(context);
  context.pixelStorei = (parameter, value) => {
    if (
      parameter === context.UNPACK_PREMULTIPLY_ALPHA_WEBGL ||
      parameter === context.UNPACK_COLORSPACE_CONVERSION_WEBGL
    )
      return;
    pixelStorei(parameter, value);
  };
  prepared.add(context);
}
