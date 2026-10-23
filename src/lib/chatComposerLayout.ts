/** Safe-area padding belongs to the composer once; adjustResize handles Android IME. */
export function chatComposerBottomPadding(bottomInset: number, keyboardVisible: boolean): number {
  return keyboardVisible ? 8 : Math.max(8, bottomInset);
}
