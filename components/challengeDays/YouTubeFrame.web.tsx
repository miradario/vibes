import React, { useEffect, useMemo, useRef } from "react";
import { youtubeFrameHtml, YouTubeFrameProps } from "./YouTubeFrameHtml";
export default function YouTubeFrame({ videoId, onState }: YouTubeFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(
    () => youtubeFrameHtml(videoId, window.location.origin),
    [videoId]
  );
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== window.location.origin
      )
        return;
      try {
        const message = JSON.parse(event.data);
        if (message.source === "vibes-youtube")
          onState(message.type === "ready" ? null : Number(message.code));
      } catch {}
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onState]);
  return (
    <iframe
      ref={frame}
      title="Video de YouTube"
      srcDoc={html}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
      style={{ width: "100%", height: 220, border: 0 }}
    />
  );
}
