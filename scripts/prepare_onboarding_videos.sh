#!/usr/bin/env bash
set -euo pipefail
# Composite the original near-white backdrop onto the white onboarding surface.
# Explicit BT.709 metadata avoids a pink/gray rectangle on Android decoders.
cd "$(dirname "$0")/.."
for name in boarding bienvenidx; do
  size=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "assets/videos/${name}.mp4")
  ffmpeg -hide_banner -loglevel error -i "assets/videos/${name}.mp4" \
    -f lavfi -i "color=c=white:s=${size}:r=30" \
    -filter_complex '[0:v]fps=30,format=rgba,colorkey=0xF6F6F4:0.055:0.035[fg];[1:v][fg]overlay=shortest=1,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[out]' \
    -map '[out]' -an -c:v libx264 -crf 16 -preset fast \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -movflags +faststart -y "assets/videos/${name}-integrated.mp4"
done
