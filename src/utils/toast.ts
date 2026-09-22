import { userFacingMessage } from "./userFacingMessage";
import Toast from "react-native-toast-message";
import type { ToastShowParams } from "react-native-toast-message";

export const showToast = (
  message: string,
  options: Partial<ToastShowParams> = {}
): void => {
  const payload: ToastShowParams = {
    type: "error",
    ...options,
    text1: userFacingMessage(options.text1 ?? message),
    text2: options.text2 ? userFacingMessage(options.text2) : undefined,
  };

  Toast.show(payload);
};
