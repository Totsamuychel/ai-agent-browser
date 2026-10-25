#!/usr/bin/env bash
# AI Agent Browser Launcher
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$DIR/dist/app/AI Agent Browser-0.1.0.AppImage" ]; then
    echo "🚀 Starting AI Agent Browser (AppImage)..."
    "$DIR/dist/app/AI Agent Browser-0.1.0.AppImage" "$@"
elif [ -f "$DIR/dist/app/linux-unpacked/ai-agent-browser" ]; then
    echo "🚀 Starting AI Agent Browser (unpacked)..."
    "$DIR/dist/app/linux-unpacked/ai-agent-browser" "$@"
else
    echo "🚀 Starting AI Agent Browser in dev mode..."
    cd "$DIR" && npm run startElectron "$@"
fi
