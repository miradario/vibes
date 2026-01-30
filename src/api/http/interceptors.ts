import type { AxiosInstance } from "axios";
import { buildAuthHeaders } from "../auth/headers";

export const attachInterceptors = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(async (config) => {
    const headers = await buildAuthHeaders();
    config.headers = {
      ...(config.headers ?? {}),
      ...headers,
    };
    return config;
  });
};
