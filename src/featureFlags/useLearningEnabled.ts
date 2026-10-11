// Development-only gate. Release builds cannot expose the prototype accidentally.
export const LEARNING_ENABLED =
  __DEV__ && process.env.EXPO_PUBLIC_LEARNING_ENABLED === "true";
export const useLearningEnabled = () => LEARNING_ENABLED;
