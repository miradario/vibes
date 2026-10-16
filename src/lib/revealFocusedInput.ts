import type { ScrollView, TextInput } from "react-native";

/** Reveal against the measured viewport, after either native resize or IME padding. */
export function revealFocusedInput(
  input: TextInput | null,
  scroll: ScrollView | null,
  scrollY: { current: number },
  focusedInput: { current: TextInput | null },
) {
  if (!input?.isFocused() || !scroll) return;
  scroll.getNativeScrollRef()?.measureInWindow((_sx: number, top: number, _sw: number, height: number) => {
    input.measureInWindow((_ix, inputTop, _iw, inputHeight) => {
      // Measurements are asynchronous: never scroll a different field into view.
      if (focusedInput.current !== input || !input.isFocused() || height <= 0) return;
      const below = inputTop + inputHeight - (top + height - 16);
      const above = inputTop - (top + 16);
      const delta = below > 0 ? below : above < 0 ? above : 0;
      if (Math.abs(delta) > 1) {
        scroll.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: false });
      }
    });
  });
}
