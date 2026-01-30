import axios from "axios";
import { attachInterceptors } from "./interceptors";

const getBaseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL");
  }
  return `${url.replace(/\/$/, "")}/functions/v1`;
};

export const http = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

attachInterceptors(http);
