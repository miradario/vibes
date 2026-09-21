#!/usr/bin/env bash
set -euo pipefail
# Unified pipeline: onboarding, authentication, challenges and meditation.
cd "$(dirname "$0")/.."
exec python3 scripts/prepare_video_surfaces.py
