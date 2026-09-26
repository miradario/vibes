import { vibesTheme } from "../../src/theme/vibesTheme";
export function youtubeFrameHtml(videoId: string, origin: string) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) throw new Error("Video inválido");
  const safeOrigin = JSON.stringify(origin).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body,#player{margin:0;width:100%;height:100%;background:${vibesTheme.colors.background}}</style></head><body><div id="player"></div><script>
  function report(type,code){var data=JSON.stringify({source:'vibes-youtube',type:type,code:code});if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(data)}else{parent.postMessage(data,${safeOrigin})}}
  function onYouTubeIframeAPIReady(){new YT.Player('player',{width:'100%',height:'100%',videoId:'${videoId}',playerVars:{autoplay:0,playsinline:1,origin:${safeOrigin},rel:0},events:{onReady:function(){report('ready')},onError:function(e){report('error',e.data)}}})}
  </script><script src="https://www.youtube.com/iframe_api" onerror="report('error',0)"></script></body></html>`;
}
export type YouTubeFrameProps = {
  videoId: string;
  onState: (error: number | null) => void;
};
