# AGENTS

- When implementing a modal (especially bottom-sheet style with backdrop), use `components/AnimatedSheetModal.tsx` instead of creating a new ad-hoc `Modal` animation.
- For new screens, use `components/ScreenContainer.tsx` as the base container unless there is a concrete reason not to.
