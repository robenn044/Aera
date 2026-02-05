#!/bin/bash
# ============================================================
# AERA Smart Mirror - Startup Script
# ============================================================
# This script starts all AERA services and opens the mirror UI
# Place in /home/pi/aera/ and add to autostart
#
# Usage: ./start_aera.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
AERA_URL="${AERA_URL:-http://localhost:5173}"

# Create log directory
mkdir -p "$LOG_DIR"

echo "========================================"
echo "🪞 AERA Smart Mirror - Starting..."
echo "========================================"

# Function to check if a port is in use
check_port() {
    nc -z localhost "$1" 2>/dev/null
    return $?
}

# Function to wait for a service
wait_for_service() {
    local port=$1
    local name=$2
    local max_wait=30
    local waited=0
    
    echo -n "   Waiting for $name on port $port..."
    while ! check_port "$port" && [ $waited -lt $max_wait ]; do
        sleep 1
        waited=$((waited + 1))
        echo -n "."
    done
    
    if check_port "$port"; then
        echo " ✓"
        return 0
    else
        echo " ✗ (timeout)"
        return 1
    fi
}

# ============================================================
# 1. Start Sensors Server
# ============================================================
echo ""
echo "1️⃣  Starting Sensors Server..."

if check_port 5000; then
    echo "   Port 5000 already in use, skipping..."
else
    cd "$SCRIPT_DIR"
    python3 sensors_server.py >> "$LOG_DIR/sensors.log" 2>&1 &
    SENSORS_PID=$!
    echo "   PID: $SENSORS_PID"
    wait_for_service 5000 "Sensors API"
fi

# ============================================================
# 2. Start Camera Server
# ============================================================
echo ""
echo "2️⃣  Starting Camera Server..."

if check_port 8080; then
    echo "   Port 8080 already in use, skipping..."
else
    cd "$SCRIPT_DIR"
    python3 camera_server.py >> "$LOG_DIR/camera.log" 2>&1 &
    CAMERA_PID=$!
    echo "   PID: $CAMERA_PID"
    wait_for_service 8080 "Camera Stream"
fi

# ============================================================
# 3. Start AERA Frontend (Chromium Kiosk)
# ============================================================
echo ""
echo "3️⃣  Starting AERA UI in Chromium Kiosk..."

# Hide cursor
unclutter -idle 0.5 -root &

# Disable screen blanking
xset s off
xset s noblank
xset -dpms

# Start Chromium in kiosk mode
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --disable-features=TranslateUI \
    --check-for-update-interval=31536000 \
    --disable-component-update \
    --autoplay-policy=no-user-gesture-required \
    --enable-features=WebSpeechAPI \
    --use-fake-ui-for-media-stream \
    --enable-speech-dispatcher \
    --force-dark-mode \
    --window-size=1024,600 \
    --window-position=0,0 \
    "$AERA_URL" >> "$LOG_DIR/chromium.log" 2>&1 &

CHROMIUM_PID=$!
echo "   PID: $CHROMIUM_PID"
echo "   URL: $AERA_URL"

# ============================================================
# Done
# ============================================================
echo ""
echo "========================================"
echo "✅ AERA Smart Mirror is running!"
echo "========================================"
echo ""
echo "📊 Services:"
echo "   Sensors API: http://localhost:5000/api/sensors"
echo "   Camera:      http://localhost:8080/stream"
echo "   AERA UI:     $AERA_URL"
echo ""
echo "📁 Logs: $LOG_DIR/"
echo ""
echo "🛑 To stop: pkill -f sensors_server.py && pkill -f camera_server.py && pkill chromium"
echo ""

# Keep script running to maintain child processes
wait
