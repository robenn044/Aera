# AERA Smart Mirror - Complete Production Setup Guide

> **Version**: 2.0.0 | **Target**: Raspberry Pi 4/5 | **Display**: 7" (800x480 or 1024x600)
> 
> **Your Sensors**: PIR HC-SR501, KY-028 Temperature, LM393 Light

---

## 📋 Table of Contents

1. [Hardware Overview](#1-hardware-overview)
2. [Wiring Guide](#2-wiring-guide)
3. [Raspberry Pi OS Installation](#3-raspberry-pi-os-installation)
4. [Initial System Setup](#4-initial-system-setup)
5. [Sensor Server Setup](#5-sensor-server-setup)
6. [Camera Server Setup](#6-camera-server-setup)
7. [Kiosk Mode Setup](#7-kiosk-mode-setup)
8. [Audio Configuration](#8-audio-configuration)
9. [Remote Access from Any Network](#9-remote-access-from-any-network)
10. [Gemini API Setup](#10-gemini-api-setup)
11. [Deployment & Go-Live](#11-deployment--go-live)
12. [Troubleshooting](#12-troubleshooting)
13. [Quick Reference](#13-quick-reference)

---

## 1. Hardware Overview

### Your Specific Sensors (All 3-Pin Digital)

| Sensor | Model | Function | Output Type |
|--------|-------|----------|-------------|
| **Motion** | PIR HC-SR501 | Detect presence | Digital (HIGH/LOW) |
| **Temperature** | KY-028 | Temperature threshold | Digital (HIGH when hot) |
| **Light** | LM393 | Ambient light level | Digital (HIGH when dark) |

> ⚠️ **Important**: The KY-028 is a **threshold sensor**, not a temperature reader. It outputs HIGH when temperature exceeds the threshold set by the potentiometer. It does NOT provide actual °C readings.

### Complete Parts List

| Component | Notes |
|-----------|-------|
| Raspberry Pi 4 (4GB+) or Pi 5 | Pi 5 recommended |
| 32GB+ microSD Card | Class 10 or better |
| 5V 3A USB-C Power Supply | Official Pi PSU recommended |
| 7" Display (HDMI or DSI) | 800x480 or 1024x600 |
| Pi Camera Module v2/v3 or USB Webcam | For live feed |
| USB Microphone | Any USB mic works |
| Speaker (3.5mm or USB) | For voice output |
| PIR HC-SR501 | Motion sensor |
| KY-028 | Temperature threshold sensor |
| LM393 | Light sensor module |
| Jumper Wires (Female-to-Female) | 9 wires minimum |

---

## 2. Wiring Guide

### GPIO Pinout Reference

```
┌─────────────────────────────────────────────────────────────┐
│                    RASPBERRY PI GPIO HEADER                  │
│                         (Top View)                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   3.3V  (1) ●────────────────────────● (2)  5V ◄─── PIR VCC │
│  GPIO2  (3) ●                        ● (4)  5V               │
│  GPIO3  (5) ●                        ● (6)  GND ◄── KY-028   │
│  GPIO4  (7) ●◄─── KY-028 DO          ● (8)  GPIO14           │
│    GND  (9) ●◄─── PIR GND            ● (10) GPIO15           │
│ GPIO17 (11) ●◄─── LM393 DO           ● (12) GPIO18           │
│ GPIO27 (13) ●◄─── PIR OUT            ● (14) GND ◄── LM393   │
│ GPIO22 (15) ●                        ● (16) GPIO23           │
│   3.3V (17) ●◄─── LM393 VCC          ● (18) GPIO24           │
│              ◄─── KY-028 VCC                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Sensor Wiring Details

#### 🔴 PIR HC-SR501 (Motion Sensor)

```
    PIR HC-SR501              Raspberry Pi
    ┌───────────┐
    │    VCC    │ ──────────► Pin 2  (5V)      ⚠️ Requires 5V!
    │    OUT    │ ──────────► Pin 13 (GPIO27)
    │    GND    │ ──────────► Pin 9  (GND)
    └───────────┘

    Adjust PIR potentiometers:
    • Left pot (Sensitivity): Clockwise = more sensitive (3-7m range)
    • Right pot (Time delay): How long OUT stays HIGH (5s-300s)
    • Jumper: Set to "H" for repeatable trigger mode
```

#### 🟠 KY-028 (Temperature Threshold Sensor)

```
    KY-028                    Raspberry Pi
    ┌───────────┐
    │   VCC (+) │ ──────────► Pin 17 (3.3V)
    │    DO     │ ──────────► Pin 7  (GPIO4)
    │   GND (-) │ ──────────► Pin 6  (GND)
    └───────────┘

    ⚠️ This sensor does NOT give temperature readings!
    It outputs HIGH when temp exceeds the threshold.
    
    Adjust the potentiometer:
    • Turn clockwise = higher threshold (triggers at higher temp)
    • Turn counter-clockwise = lower threshold
    • LED lights up when threshold exceeded
```

#### 🟡 LM393 (Light Sensor Module)

```
    LM393                     Raspberry Pi
    ┌───────────┐
    │   VCC (+) │ ──────────► Pin 17 (3.3V)
    │    DO     │ ──────────► Pin 11 (GPIO17)
    │   GND (-) │ ──────────► Pin 14 (GND)
    └───────────┘

    Output behavior:
    • DO = LOW (0)  → Bright light detected
    • DO = HIGH (1) → Dark/low light
    
    Adjust potentiometer to set light threshold.
```

### Complete Wiring Summary Table

| Sensor | VCC Pin | Signal Pin | GND Pin |
|--------|---------|------------|---------|
| PIR HC-SR501 | Pin 2 (5V) | Pin 13 (GPIO27) | Pin 9 (GND) |
| KY-028 Temp | Pin 17 (3.3V) | Pin 7 (GPIO4) | Pin 6 (GND) |
| LM393 Light | Pin 17 (3.3V) | Pin 11 (GPIO17) | Pin 14 (GND) |

---

## 3. Raspberry Pi OS Installation

### Step 1: Download Raspberry Pi Imager

Download from: https://www.raspberrypi.com/software/

### Step 2: Prepare the SD Card

1. Insert microSD card into your computer
2. Open **Raspberry Pi Imager**
3. Click **"Choose Device"** → Select your Pi model
4. Click **"Choose OS"** → **Raspberry Pi OS (64-bit)** → **Desktop version**
5. Click **"Choose Storage"** → Select your SD card
6. Click the **gear icon (⚙️)** for advanced settings

### Step 3: Configure Settings

```
☑️ Set hostname: aera-mirror

☑️ Set username and password:
   Username: aera
   Password: [choose a strong password - save it!]

☑️ Configure wireless LAN:
   SSID: [your WiFi network name]
   Password: [your WiFi password]
   Country: AL (or your country code)

☑️ Set locale settings:
   Time zone: Europe/Tirane (or your timezone)
   Keyboard layout: us

☑️ Enable SSH: Use password authentication
```

### Step 4: Write and Boot

1. Click **"Save"** then **"Write"**
2. Wait for completion (5-10 minutes)
3. Insert SD card into Raspberry Pi
4. Connect display, power on
5. Wait 2-3 minutes for first boot

---

## 4. Initial System Setup

### Step 1: Connect via SSH

From your computer (same WiFi network):

```bash
# Using hostname
ssh aera@aera-mirror.local

# Or find Pi's IP and use that
ssh aera@192.168.1.XXX
```

Enter your password when prompted.

### Step 2: Update the System

```bash
sudo apt update && sudo apt full-upgrade -y
sudo reboot
```

Wait 1 minute, then reconnect:

```bash
ssh aera@aera-mirror.local
```

### Step 3: Install Required Packages

```bash
# Install all dependencies in one command
sudo apt install -y \
    chromium-browser \
    unclutter \
    xdotool \
    python3-pip \
    python3-venv \
    python3-picamera2 \
    python3-opencv \
    python3-rpi.gpio \
    libgpiod2 \
    git
```

### Step 4: Create Python Environment

```bash
# Create virtual environment for AERA
python3 -m venv ~/aera-env

# Activate it
source ~/aera-env/bin/activate

# Install Python packages
pip install flask flask-cors RPi.GPIO
```

### Step 5: Enable Camera Interface

```bash
sudo raspi-config
```

Navigate:
- **Interface Options** → **Camera** → **Enable**
- **Interface Options** → **VNC** → **Enable** (for remote desktop)

```bash
sudo reboot
```

---

## 5. Sensor Server Setup

### Step 1: Create Directory

```bash
ssh aera@aera-mirror.local
mkdir -p ~/aera-sensors
cd ~/aera-sensors
```

### Step 2: Create Sensor Server Script

```bash
nano ~/aera-sensors/sensor_server.py
```

**Paste this entire script** (optimized for your 3-pin sensors):

```python
#!/usr/bin/env python3
"""
AERA Smart Mirror - Sensor API Server
Optimized for: PIR HC-SR501, KY-028, LM393 (all 3-pin digital sensors)
"""

from flask import Flask, jsonify
from flask_cors import CORS
import RPi.GPIO as GPIO
import time
import threading

app = Flask(__name__)
CORS(app)

# ============ GPIO Pin Configuration ============
# All your 3-pin sensors use digital output

PIR_PIN = 27      # PIR HC-SR501 OUT → GPIO27 (Pin 13)
TEMP_PIN = 4      # KY-028 DO → GPIO4 (Pin 7)  
LIGHT_PIN = 17    # LM393 DO → GPIO17 (Pin 11)

# ============ Initialize GPIO ============
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(PIR_PIN, GPIO.IN)
GPIO.setup(TEMP_PIN, GPIO.IN)
GPIO.setup(LIGHT_PIN, GPIO.IN)

# ============ Sensor Data Cache ============
sensor_cache = {
    'motion': False,
    'last_motion': None,
    'temp_alert': False,      # KY-028: True = temperature above threshold
    'light_level': 100,       # Estimated: 100 = bright, 20 = dark
    'light_is_dark': False,
    'timestamp': time.time(),
    'sensors_ok': True
}

cache_lock = threading.Lock()

def read_sensors():
    """Background thread to continuously read sensors"""
    global sensor_cache
    
    while True:
        try:
            # Read PIR motion sensor
            motion = GPIO.input(PIR_PIN)
            
            # Read KY-028 temperature threshold sensor
            # HIGH = temperature ABOVE threshold (hot)
            # LOW = temperature BELOW threshold (normal)
            temp_alert = GPIO.input(TEMP_PIN)
            
            # Read LM393 light sensor
            # LOW = bright light
            # HIGH = dark/low light
            light_dark = GPIO.input(LIGHT_PIN)
            light_level = 20 if light_dark else 100
            
            with cache_lock:
                sensor_cache['motion'] = bool(motion)
                if motion:
                    sensor_cache['last_motion'] = time.time()
                    
                sensor_cache['temp_alert'] = bool(temp_alert)
                sensor_cache['light_level'] = light_level
                sensor_cache['light_is_dark'] = bool(light_dark)
                sensor_cache['timestamp'] = time.time()
                sensor_cache['sensors_ok'] = True
                
        except Exception as e:
            print(f"Sensor read error: {e}")
            with cache_lock:
                sensor_cache['sensors_ok'] = False
        
        time.sleep(0.5)  # Read every 500ms for responsive motion detection

# Start background sensor thread
sensor_thread = threading.Thread(target=read_sensors, daemon=True)
sensor_thread.start()

@app.route('/sensors')
def get_sensors():
    """
    Return all sensor data.
    Compatible with AERA frontend expectations.
    """
    with cache_lock:
        return jsonify({
            # Motion detection
            'motion': sensor_cache['motion'],
            'last_motion': sensor_cache['last_motion'],
            
            # Temperature (KY-028 threshold only - no actual reading)
            'temperature': None,  # KY-028 doesn't provide actual temp
            'temp_alert': sensor_cache['temp_alert'],  # True = above threshold
            'humidity': None,     # Not available with KY-028
            
            # Light level (estimated from digital output)
            'light': sensor_cache['light_level'],
            'light_is_dark': sensor_cache['light_is_dark'],
            
            # Metadata
            'timestamp': sensor_cache['timestamp'],
            'sensors_ok': sensor_cache['sensors_ok']
        })

@app.route('/motion')
def get_motion():
    """Motion sensor status"""
    with cache_lock:
        return jsonify({
            'motion': sensor_cache['motion'],
            'last_motion': sensor_cache['last_motion']
        })

@app.route('/temperature')
def get_temperature():
    """
    Temperature status.
    Note: KY-028 only provides threshold alert, not actual temperature.
    """
    with cache_lock:
        return jsonify({
            'temperature': None,
            'temp_alert': sensor_cache['temp_alert'],
            'unit': 'threshold_only',
            'note': 'KY-028 provides threshold alert only, not actual temperature reading'
        })

@app.route('/light')
def get_light():
    """Light sensor status"""
    with cache_lock:
        return jsonify({
            'light': sensor_cache['light_level'],
            'is_dark': sensor_cache['light_is_dark']
        })

@app.route('/health')
def health():
    """Health check endpoint"""
    with cache_lock:
        return jsonify({
            'status': 'ok' if sensor_cache['sensors_ok'] else 'error',
            'service': 'aera-sensors',
            'sensors': {
                'pir': 'PIR HC-SR501 on GPIO27',
                'temp': 'KY-028 on GPIO4 (threshold only)',
                'light': 'LM393 on GPIO17'
            }
        })

@app.route('/')
def index():
    """Root endpoint with API documentation"""
    return jsonify({
        'service': 'AERA Sensor Server',
        'version': '2.0.0',
        'sensors': {
            'motion': 'PIR HC-SR501 (GPIO27)',
            'temperature': 'KY-028 threshold sensor (GPIO4)',
            'light': 'LM393 (GPIO17)'
        },
        'endpoints': {
            '/sensors': 'All sensor data',
            '/motion': 'Motion detection only',
            '/temperature': 'Temperature threshold status',
            '/light': 'Light level status',
            '/health': 'Service health check'
        },
        'note': 'KY-028 provides HIGH/LOW threshold only, not actual temperature readings'
    })

def cleanup():
    """Cleanup GPIO on exit"""
    GPIO.cleanup()

import atexit
atexit.register(cleanup)

if __name__ == '__main__':
    print("=" * 50)
    print("AERA Sensor Server v2.0.0")
    print("=" * 50)
    print("Sensors configured:")
    print(f"  • PIR HC-SR501 → GPIO{PIR_PIN}")
    print(f"  • KY-028 Temp  → GPIO{TEMP_PIN}")
    print(f"  • LM393 Light  → GPIO{LIGHT_PIN}")
    print("=" * 50)
    print("Starting server on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, threaded=True)
```

Save: **Ctrl+X**, then **Y**, then **Enter**

### Step 3: Create Systemd Service

```bash
sudo nano /etc/systemd/system/aera-sensors.service
```

Paste:

```ini
[Unit]
Description=AERA Smart Mirror - Sensor API Server
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=aera
Group=gpio
WorkingDirectory=/home/aera/aera-sensors
Environment="PATH=/home/aera/aera-env/bin:/usr/bin:/bin"
ExecStart=/home/aera/aera-env/bin/python3 sensor_server.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save and exit.

### Step 4: Enable and Start

```bash
# Add user to gpio group
sudo usermod -aG gpio aera

# Reload systemd
sudo systemctl daemon-reload

# Enable at boot
sudo systemctl enable aera-sensors

# Start now
sudo systemctl start aera-sensors

# Check status
sudo systemctl status aera-sensors
```

### Step 5: Test the API

```bash
curl http://localhost:5000/sensors
```

Expected output:
```json
{
  "motion": false,
  "last_motion": null,
  "temperature": null,
  "temp_alert": false,
  "humidity": null,
  "light": 100,
  "light_is_dark": false,
  "timestamp": 1234567890.123,
  "sensors_ok": true
}
```

---

## 6. Camera Server Setup

### Step 1: Create Camera Server Script

```bash
nano ~/aera-sensors/camera_server.py
```

Paste:

```python
#!/usr/bin/env python3
"""
AERA Smart Mirror - Camera Stream Server
Provides MJPEG stream for live camera feed
"""

from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import time
import threading

app = Flask(__name__)
CORS(app)

# ============ Configuration ============
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480
JPEG_QUALITY = 70
FRAME_RATE = 15

# ============ Global Variables ============
camera = None
is_running = False
frame_lock = threading.Lock()

def init_camera():
    """Initialize camera (works with both Pi Camera and USB webcam)"""
    global camera, is_running
    
    # Try Pi Camera first
    try:
        from picamera2 import Picamera2
        camera = Picamera2()
        config = camera.create_video_configuration(
            main={"size": (CAMERA_WIDTH, CAMERA_HEIGHT), "format": "RGB888"}
        )
        camera.configure(config)
        camera.start()
        is_running = True
        print(f"Pi Camera initialized: {CAMERA_WIDTH}x{CAMERA_HEIGHT}")
        return 'picamera'
    except Exception as e:
        print(f"Pi Camera not available: {e}")
    
    # Fallback to USB webcam
    try:
        camera = cv2.VideoCapture(0)
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
        if camera.isOpened():
            is_running = True
            print(f"USB Camera initialized: {CAMERA_WIDTH}x{CAMERA_HEIGHT}")
            return 'usb'
    except Exception as e:
        print(f"USB Camera not available: {e}")
    
    print("No camera found!")
    return None

camera_type = init_camera()

def get_frame():
    """Capture a single frame"""
    global camera
    
    if camera_type == 'picamera':
        return camera.capture_array()
    elif camera_type == 'usb':
        ret, frame = camera.read()
        if ret:
            return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return None

def generate_frames():
    """Generator for MJPEG stream"""
    while is_running:
        try:
            frame = get_frame()
            if frame is not None:
                # Convert RGB to BGR for encoding
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                _, buffer = cv2.imencode('.jpg', frame_bgr, 
                    [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                frame_bytes = buffer.tobytes()
                
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            time.sleep(1.0 / FRAME_RATE)
        except Exception as e:
            print(f"Frame error: {e}")
            time.sleep(0.1)

@app.route('/stream')
def stream():
    """MJPEG stream endpoint"""
    if not is_running:
        return jsonify({'error': 'Camera not available'}), 503
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@app.route('/snapshot')
def snapshot():
    """Single JPEG snapshot"""
    if not is_running:
        return jsonify({'error': 'Camera not available'}), 503
    
    frame = get_frame()
    if frame is not None:
        frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        _, buffer = cv2.imencode('.jpg', frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
        return Response(buffer.tobytes(), mimetype='image/jpeg')
    return jsonify({'error': 'Failed to capture frame'}), 500

@app.route('/health')
def health():
    """Health check"""
    return jsonify({
        'status': 'ok' if is_running else 'error',
        'service': 'aera-camera',
        'camera_type': camera_type or 'none',
        'resolution': f"{CAMERA_WIDTH}x{CAMERA_HEIGHT}"
    })

@app.route('/')
def index():
    return jsonify({
        'service': 'AERA Camera Server',
        'camera': camera_type or 'none',
        'endpoints': {
            '/stream': 'MJPEG video stream',
            '/snapshot': 'Single JPEG image',
            '/health': 'Health check'
        }
    })

if __name__ == '__main__':
    if is_running:
        print("Starting AERA Camera Server on http://0.0.0.0:8080")
        app.run(host='0.0.0.0', port=8080, threaded=True)
    else:
        print("No camera available. Exiting.")
        exit(1)
```

Save and exit.

### Step 2: Create Systemd Service

```bash
sudo nano /etc/systemd/system/aera-camera.service
```

Paste:

```ini
[Unit]
Description=AERA Smart Mirror - Camera Stream Server
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=aera
Group=video
WorkingDirectory=/home/aera/aera-sensors
Environment="PATH=/home/aera/aera-env/bin:/usr/bin:/bin"
ExecStart=/home/aera/aera-env/bin/python3 camera_server.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Step 3: Enable and Start

```bash
sudo usermod -aG video aera
sudo systemctl daemon-reload
sudo systemctl enable aera-camera
sudo systemctl start aera-camera
sudo systemctl status aera-camera
```

### Step 4: Test Camera

Open in browser: `http://[PI-IP]:8080/stream`

---

## 7. Kiosk Mode Setup

### Step 1: Create Startup Script

```bash
nano ~/start-aera.sh
```

Paste (**replace YOUR_AERA_URL with your deployed URL**):

```bash
#!/bin/bash
#############################################
# AERA Smart Mirror - Kiosk Startup Script
#############################################

# ====== CONFIGURATION ======
# Replace this with your deployed AERA URL after publishing
AERA_URL="YOUR_AERA_URL"

# ====== Wait for Network ======
echo "[AERA] Waiting for network..."
for i in {1..30}; do
    if ping -c 1 8.8.8.8 &> /dev/null; then
        echo "[AERA] Network connected!"
        break
    fi
    sleep 1
done

# ====== Disable Screen Blanking ======
export DISPLAY=:0
xset s off
xset -dpms
xset s noblank

# ====== Hide Mouse Cursor ======
unclutter -idle 3 -root &

# ====== Kill Any Existing Browser ======
pkill -f chromium 2>/dev/null
sleep 2

# ====== Start Chromium in Kiosk Mode ======
echo "[AERA] Starting browser..."
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --no-first-run \
    --start-fullscreen \
    --autoplay-policy=no-user-gesture-required \
    --use-fake-ui-for-media-stream \
    --enable-features=WebSpeechAPI \
    --disable-features=TranslateUI \
    --disable-pinch \
    --check-for-update-interval=31536000 \
    "$AERA_URL" &

echo "[AERA] Started successfully!"
```

Make executable:

```bash
chmod +x ~/start-aera.sh
```

### Step 2: Configure Auto-Start on Boot

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/aera.desktop
```

Paste:

```ini
[Desktop Entry]
Type=Application
Name=AERA Smart Mirror
Comment=Start AERA in kiosk mode
Exec=/home/aera/start-aera.sh
Terminal=false
X-GNOME-Autostart-enabled=true
```

### Step 3: Disable Screen Blanking System-Wide

```bash
sudo nano /etc/lightdm/lightdm.conf
```

Find `[Seat:*]` and add:

```ini
[Seat:*]
xserver-command=X -s 0 -dpms
```

### Step 4: Disable in LXDE

```bash
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
```

Add at the end:

```
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 3 -root
```

---

## 8. Audio Configuration

### Step 1: Test Speakers

```bash
# Test speaker output
speaker-test -t wav -c 2

# If no sound, configure audio:
sudo raspi-config
# → System Options → Audio → Select output device
```

### Step 2: Set Volume

```bash
alsamixer
# Use arrow keys to adjust, ESC to exit
```

### Step 3: Configure USB Microphone

```bash
# List recording devices
arecord -l

# Test recording (5 seconds)
arecord -d 5 -f cd test.wav && aplay test.wav
```

### Step 4: Set Default Audio Devices

```bash
sudo nano /etc/asound.conf
```

Paste (adjust numbers based on `arecord -l` and `aplay -l`):

```
pcm.!default {
    type asym
    playback.pcm "hw:0,0"
    capture.pcm "hw:1,0"
}

ctl.!default {
    type hw
    card 0
}
```

---

## 9. Remote Access from Any Network

### Method 1: Tailscale (Recommended - Easiest & Most Secure)

#### On Raspberry Pi:

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate (opens browser URL)
sudo tailscale up

# Get your Tailscale IP
tailscale ip -4
```

#### On Your Computer:

1. Go to https://tailscale.com and create free account
2. Download Tailscale app for your OS
3. Log in with same account
4. Your Pi appears in the device list!

Now you can SSH from anywhere:
```bash
ssh aera@[tailscale-ip]
# Example: ssh aera@100.64.0.1
```

### Method 2: VNC (Remote Desktop)

Already enabled in Step 4. Use RealVNC Viewer:

1. Download: https://www.realvnc.com/download/viewer/
2. Connect to: `[tailscale-ip]:5900` or `aera-mirror.local:5900`

### Method 3: SSH Port Forwarding (Advanced)

If you want to use your own domain:

1. Get Dynamic DNS from https://www.duckdns.org
2. Configure router port forwarding: External 2222 → Pi:22
3. Access: `ssh -p 2222 aera@your-domain.duckdns.org`

---

## 10. Gemini API Setup

### Step 1: Get API Key

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

### Step 2: Configure in Lovable

When you publish your AERA app in Lovable:

1. Click the **"Publish"** button
2. Before deploying, add environment variables:
   - `VITE_GEMINI_API_KEY` = your API key
   - `VITE_RASPBERRY_PI_IP` = your Pi's local IP (e.g., 192.168.1.100)
   - `VITE_SENSOR_PORT` = 5000
   - `VITE_CAMERA_PORT` = 8080

### Step 3: Security (Important!)

Restrict your API key to your domain:

1. Go to https://console.cloud.google.com/apis/credentials
2. Click your API key
3. Under **"Application restrictions"** → **"HTTP referrers"**
4. Add: `https://your-app.lovable.app/*`

---

## 11. Deployment & Go-Live

### Step 1: Publish in Lovable

1. In Lovable, click **"Publish"**
2. Copy your deployed URL

### Step 2: Update Pi Startup Script

```bash
nano ~/start-aera.sh
```

Replace `YOUR_AERA_URL` with your actual URL:

```bash
AERA_URL="https://your-app-name.lovable.app"
```

### Step 3: Find Pi's IP Address

```bash
hostname -I
```

### Step 4: Final Reboot

```bash
sudo reboot
```

Your mirror should now:
1. Boot directly to AERA in fullscreen
2. Show camera feed
3. Display sensor status
4. Respond to voice commands

---

## 12. Troubleshooting

### Check Service Status

```bash
# Sensors
sudo systemctl status aera-sensors
journalctl -u aera-sensors -f

# Camera
sudo systemctl status aera-camera
journalctl -u aera-camera -f
```

### Test APIs

```bash
# Sensors
curl http://localhost:5000/sensors

# Camera
curl http://localhost:8080/health
```

### Common Issues

| Problem | Solution |
|---------|----------|
| Sensors show "null" | Check wiring. All sensors to correct GPIO pins. |
| Camera not starting | Run `sudo systemctl status aera-camera` |
| Voice not working | Use HTTPS. Check mic permissions in browser. |
| PIR always HIGH | Adjust sensitivity potentiometer (turn counter-clockwise) |
| Light sensor wrong | Adjust threshold potentiometer |
| Browser not starting | Check `~/.config/autostart/aera.desktop` |

### Exit Kiosk Mode

- **Alt+F4** - Close browser
- **Ctrl+Alt+T** - Open terminal
- **F11** - Toggle fullscreen

### View Logs

```bash
# All system logs
journalctl -b

# Chromium errors
cat ~/.xsession-errors
```

---

## 13. Quick Reference

### Service Commands

```bash
# Restart sensors
sudo systemctl restart aera-sensors

# Restart camera
sudo systemctl restart aera-camera

# Check Pi temperature
vcgencmd measure_temp

# Check disk space
df -h
```

### GPIO Pin Summary

| GPIO | Pin | Sensor |
|------|-----|--------|
| GPIO27 | 13 | PIR HC-SR501 (OUT) |
| GPIO4 | 7 | KY-028 (DO) |
| GPIO17 | 11 | LM393 (DO) |

### API Endpoints

| URL | Description |
|-----|-------------|
| `http://[PI-IP]:5000/sensors` | All sensor data |
| `http://[PI-IP]:5000/health` | Sensor service health |
| `http://[PI-IP]:8080/stream` | Camera MJPEG stream |
| `http://[PI-IP]:8080/snapshot` | Single camera frame |

### Final Checklist

- [ ] PIR motion sensor wired to GPIO27 (Pin 13)
- [ ] KY-028 temp sensor wired to GPIO4 (Pin 7)
- [ ] LM393 light sensor wired to GPIO17 (Pin 11)
- [ ] Camera connected and streaming
- [ ] Microphone working (`arecord -d 3 test.wav`)
- [ ] Speakers working (`speaker-test -t wav`)
- [ ] AERA URL updated in `~/start-aera.sh`
- [ ] Gemini API key configured
- [ ] Tailscale installed for remote access
- [ ] Auto-start working (reboot test)

---

**🪞 AERA Smart Mirror - Production Ready! ✨**
