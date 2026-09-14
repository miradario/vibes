# Google Maps API keys

Production uses separate keys for Android and iOS. The old
`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` variable is intentionally unsupported.

## Android key

- Environment variable: `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`
- Application restriction: **Android apps**
- Package name: `com.miradario.vibe`
- Register the SHA-1 fingerprint of the Google Play App Signing certificate.
- API restrictions: only **Maps Static API** and **Geocoding API**.
- Set the same SHA-1 in `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1`; either
  colon-delimited or plain hexadecimal input is accepted.

## iOS key

- Environment variable: `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`
- Application restriction: **iOS apps**
- Bundle identifier: `com.gurudevelopers.vibes`
- API restrictions: only **Maps Static API** and **Geocoding API**.

Set the variables for each EAS build environment. Never commit actual keys.
After applying the Google Cloud restrictions, verify that requests made with an
incorrect package, certificate, or bundle identifier are rejected. If either
endpoint does not enforce mobile application restrictions, move that request to
an authenticated server-side proxy before releasing it.
