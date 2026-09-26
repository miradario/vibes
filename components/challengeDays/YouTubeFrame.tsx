import React, { useMemo } from "react";
import { WebView } from "react-native-webview";
import { youtubeFrameHtml, YouTubeFrameProps } from "./YouTubeFrameHtml";
const origin = "https://com.gurudevelopers.vibes";
export default function YouTubeFrame({ videoId, onState }: YouTubeFrameProps) {
  const source = useMemo(
    () => ({ html: youtubeFrameHtml(videoId, origin), baseUrl: origin }),
    [videoId]
  );
  return (
    <WebView
      source={source}
      style={{ height: 220 }}
      originWhitelist={["https://*", "about:*"]}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction
      javaScriptEnabled
      onError={() => onState(0)}
      onHttpError={() => onState(0)}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message.source === "vibes-youtube")
            onState(message.type === "ready" ? null : Number(message.code));
        } catch {}
      }}
    />
  );
}
