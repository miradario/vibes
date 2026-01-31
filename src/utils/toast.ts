import Toast from "react-native-toast-message";
import type { ToastShowParams } from "react-native-toast-message";

export const showToast = (
  message: string,
  options: Partial<ToastShowParams> = {}
): void => {
  const payload: ToastShowParams = {
    type: "error",
    text1: options.text1 ?? message,
    ...options,
  };

  Toast.show(payload);
};
