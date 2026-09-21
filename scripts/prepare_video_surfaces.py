#!/usr/bin/env python3
"""Remove the baked-in pale matte and composite onto the app surface.

Requires ffmpeg/ffprobe. Originals stay untouched. MP4/H.264 has no alpha:
outputs are surface-specific, not transparent. Playback timing is preserved.
"""
import json
from pathlib import Path
import statistics
import subprocess

ROOT = Path(__file__).resolve().parents[1]
VIDEOS = ROOT / "assets/videos"
OUTPUT = VIDEOS / "surfaces"


def probe(path):
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)
    ]))


def backdrop(path, duration):
    # Sample corners away from the illustration, at multiple points in time.
    samples = []
    for fraction in (0.1, 0.5, 0.9):
        raw = subprocess.check_output([
            "ffmpeg", "-v", "error", "-ss", str(duration * fraction), "-i", str(path),
            "-frames:v", "1", "-vf", "crop=8:8:0:0,format=rgb24", "-f", "rawvideo", "-"
        ])
        samples.extend(zip(raw[0::3], raw[1::3], raw[2::3]))
    color = [round(statistics.median(p[c] for p in samples)) for c in range(3)]
    if min(color) < 225 or max(color) - min(color) > 20:
        raise ValueError(f"Review non-neutral background in {path}: {color}")
    return "0x" + "".join(f"{c:02x}" for c in color)


def main():
    manifest = []
    sources = sorted(p for p in VIDEOS.rglob("*.mp4")
                     if OUTPUT not in p.parents and "-integrated" not in p.stem)
    jobs = [(p, p.relative_to(VIDEOS), "0xFFFFFF" if "meditation" in p.parts else "0xFEFEFD")
            for p in sources]
    # These screens use an explicitly white surface.
    jobs += [(VIDEOS / f"{name}.mp4", Path(f"{name}-integrated.mp4"), "0xFFFFFF")
             for name in ("boarding", "bienvenidx")]
    for source, relative, surface in jobs:
        info = probe(source)
        video = next(s for s in info["streams"] if s["codec_type"] == "video")
        duration = float(info["format"]["duration"])
        key = backdrop(source, duration)
        destination = OUTPUT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(".tmp.mp4")
        size = f'{video["width"]}x{video["height"]}'
        rate = video["r_frame_rate"]
        filters = (
            f"[0:v]format=rgba,colorkey={key}:0.018:0.025[fg];"
            "[1:v][fg]overlay=shortest=1:format=rgb,"
            "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[out]"
        )
        subprocess.run([
            "ffmpeg", "-v", "error", "-i", str(source), "-f", "lavfi", "-i",
            f"color=c={surface}:s={size}:r={rate},format=rgb24", "-filter_complex", filters,
            "-map", "[out]", "-map", "0:a?", "-c:a", "copy", "-c:v", "libx264",
            "-crf", "16", "-preset", "fast", "-threads", "4",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
            "-color_range", "tv", "-movflags", "+faststart", "-y", str(temporary)
        ], check=True)
        result = probe(temporary)
        assert abs(float(result["format"]["duration"]) - duration) < 0.06, relative
        encoded = next(s for s in result["streams"] if s["codec_type"] == "video")
        assert (encoded["width"], encoded["height"]) == (video["width"], video["height"]), relative
        assert encoded.get("nb_frames") == video.get("nb_frames"), relative
        temporary.replace(destination)
        manifest.append({"file": str(relative), "key": key, "surface": surface, "duration": duration})
        print(f"Prepared {relative}", flush=True)
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
