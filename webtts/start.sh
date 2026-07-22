#!/bin/bash
# EdgeTTS Web Application Startup Script
# Usage: bash start.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_FILE="/home/webtts/app.py"
VENV_DIR="/home/webtts/venv"

echo "====================================="
echo "  EdgeTTS Online TTS Web Application"
echo "====================================="

# Check virtual environment
if [ ! -f "$VENV_DIR/bin/python" ]; then
    echo "[ERROR] Virtual environment not found: $VENV_DIR"
    echo "Run: python3 -m venv $VENV_DIR"
    echo "Then: $VENV_DIR/bin/pip install edge-tts flask"
    exit 1
fi

# Check dependencies
echo "[CHECK] Verifying dependencies..."
$VENV_DIR/bin/python -c "import flask; import edge_tts" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[INSTALL] Installing dependencies..."
    $VENV_DIR/bin/pip install edge-tts flask
fi

# Copy app.py to Linux if needed
if [ ! -f "$APP_FILE" ]; then
    cp "$SCRIPT_DIR/app.py" "$APP_FILE"
fi

echo "[START] Starting server..."
echo "[URL] http://127.0.0.1:5000"
echo "====================================="

cd /home/webtts
$VENV_DIR/bin/python app.py