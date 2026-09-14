import { Platform } from "react-native";

const ANDROID_APPLICATION_ID = "com.miradario.vibe";
const IOS_BUNDLE_IDENTIFIER = "com.gurudevelopers.vibes";

type GoogleMapsClientConfig = {
  apiKey: string | undefined;
  headers: Record<string, string>;
};

const normalizeAndroidCertificateSha1 = (value?: string) =>
  value?.trim().replace(/:/g, "").toUpperCase();

export const getGoogleMapsClientConfig = (): GoogleMapsClientConfig => {
  if (Platform.OS === "android") {
    const configuredApiKey =
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY?.trim();
    const certificateSha1 = normalizeAndroidCertificateSha1(
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1,
    );

    return {
      // Never send the Android key without the certificate identity header.
      apiKey: certificateSha1 ? configuredApiKey : undefined,
      headers: {
        "X-Android-Package": ANDROID_APPLICATION_ID,
        ...(certificateSha1
          ? { "X-Android-Cert": certificateSha1 }
          : {}),
      },
    };
  }

  if (Platform.OS === "ios") {
    return {
      apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY?.trim(),
      headers: {
        "X-Ios-Bundle-Identifier": IOS_BUNDLE_IDENTIFIER,
      },
    };
  }

  return {
    apiKey: undefined,
    headers: {},
  };
};
