import { AxiosHeaders, type AxiosInstance } from "axios";
import { buildAuthHeaders } from "../auth/headers";

export const attachInterceptors = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(async (config) => {
    const headers = await buildAuthHeaders();

    const existing = config.headers;

    if (existing && typeof (existing as any).set === "function") {
      // AxiosHeaders instance
      for (const [key, value] of Object.entries(headers)) {
        if (value != null) (existing as any).set(key, value as any);
      }
      config.headers = existing;
      return config;
    }

    config.headers = AxiosHeaders.from({
      ...(existing as any),
      ...headers,
    });

    return config;
  });
};
