#!/bin/bash
# AERA Smart Mirror - Startup Script V6 (VNC Safe Mode)

# --- CONFIGURATION ---
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_URL="http://localhost:8081" 

# --- 1. SETUP DISPLAY ---
export DISPLAY=${DISPLAY:-:0}

# Fix for VNC: Use wayland-0 if nothing else is found
if [ -z "$WAYLAND_DISPLAY" ]; then
    if [ -e "/run/user/$(id -u)/wayland-0" ]; then
        export WAYLAND_DISPLAY=wayland-0
    else
        # Fallback for some VNC setups
        export WAYLAND_DISPLAY=wayland-0
    fi
fi

echo "📺 Using Display: $DISPLAY / $WAYLAND_DISPLAY"

# --- 2. FIND VENV ---
# Search hierarchy for venv
if [ -d "$WORK_DIR/venv" ]; then
    VENV_PATH="$WORK_DIR/venv"
elif [ -d "$WORK_DIR/../venv" ]; then
    VENV_PATH="$WORK_DIR/../venv"
elif [ -d "$WORK_DIR/../../venv" ]; then
    VENV_PATH="$WORK_DIR/../../venv"
elif [ -d "/home/admin/Aera/venv" ]; then
    VENV_PATH="/home/admin/Aera/venv"
else
    echo "❌ ERROR: Could not find 'venv' folder."
    exit 1
fi

echo "🐍 Using Venv at: $VENV_PATH"
source "$VENV_PATH/bin/activate"

# --- 3. START SERVERS ---
echo "🚀 Starting AERA Servers..."

pkill -f sensors_server.py
pkill -f camera_server.py

# Go to script dir
cd "$WORK_DIR"

echo "   Starting Sensors..."
python3 sensors_server.py > sensors.log 2>&1 &

echo "   Starting Camera..."
python3 camera_server.py > camera.log 2>&1 &

sleep 3

# --- 4. LAUNCH INTERFACE (VNC SAFE MODE) ---
echo "   Launching AERA Interface..."

if [ -z "$DISPLAY" ]; then
    echo "⚠️  WARNING: No X11 Display found."
else
    # ADDED FLAGS: --disable-gpu --disable-software-rasterizer
    # These fix the "Unsupported GLX version" crash in VNC
# ... previous lines ...
    chromium \
      --kiosk \
      --no-default-browser-check \
      --no-first-run \
      --disable-infobars \
      --disable-session-crashed-bubble \
      --overscroll-history-navigation=0 \
      --check-for-update-interval=31536000 \
      --disable-features=TranslateUI,Translate \
      --autoplay-policy=no-user-gesture-required \
      --disable-gpu \
      --disable-software-rasterizer \
      --disable-dev-shm-usage \
      "$TARGET_URL" &
fi

echo "✅ AERA Backend Started!"
echo "   - Sensors: Port 5000"
echo "   - Camera:  Port 8080"
echo "   - Frontend: Port 5173 (Must be running in other terminal!)"