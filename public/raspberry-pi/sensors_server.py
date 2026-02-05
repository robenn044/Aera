#!/usr/bin/env python3
"""
AERA Smart Mirror - Sensors & Voice Server
UPDATED FOR RASPBERRY PI 5 (Using gpiozero + lgpio)

Sensors (3-pin digital):
- PIR HC-SR501  → Motion detection      → GPIO 14
- KY-028        → Temperature threshold → GPIO 4
- LM393         → Light level           → GPIO 21

Voice:
- Microsoft Edge TTS (sq-AL-AnilaNeural)

Run: python3 sensors_server.py
"""

import logging
import time
import os
import asyncio
import tempfile
from datetime import datetime
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# ============================================================
# PI 5 COMPATIBLE IMPORTS
# ============================================================
# We use gpiozero because RPi.GPIO does not work on Pi 5
from gpiozero import MotionSensor, DigitalInputDevice, Device
from gpiozero.pins.lgpio import LGPIOFactory
import edge_tts

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [AERA-BACKEND] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

# ============================================================
# HARDWARE SETUP (Pi 5 Specific)
# ============================================================
HARDWARE_MODE = False
pir = None
temp_sensor = None
light_sensor = None

# GPIO pin assignments (BCM numbering)
PIN_PIR = 14      # Motion sensor
PIN_TEMP = 4      # Temperature threshold
PIN_LIGHT = 21    # Light sensor

try:
    # 1. Force gpiozero to use the Pi 5 compatible factory
    Device.pin_factory = LGPIOFactory()
    
    # 2. Initialize Sensors
    logger.info("🔌 Initializing Pi 5 GPIO sensors...")
    
    # PIR Motion Sensor
    # queue_len=1 helps filter out tiny electrical noise
    pir = MotionSensor(PIN_PIR, queue_len=1, threshold=0.5)
    
    # KY-028 & LM393 are simple digital switches (ON/OFF)
    # pull_up=False matches the behavior of the old setup (PUD_DOWN)
    temp_sensor = DigitalInputDevice(PIN_TEMP, pull_up=False)
    light_sensor = DigitalInputDevice(PIN_LIGHT, pull_up=False)

    HARDWARE_MODE = True
    logger.info(f"✅ Hardware Initialized Successfully!")
    logger.info(f"   PIR: GPIO{PIN_PIR} | TEMP: GPIO{PIN_TEMP} | LIGHT: GPIO{PIN_LIGHT}")

except Exception as e:
    logger.error(f"❌ GPIO Init Failed: {e}")
    logger.warning("   Running in SIMULATION MODE (Fake Data)")

# State tracking for API
last_motion_time = None

# ============================================================
# SENSOR READING FUNCTIONS
# ============================================================
def get_readings():
    """Read all sensors safely"""
    global last_motion_time
    
    if not HARDWARE_MODE:
        # Simulation data if hardware failed
        import random
        return {
            'motion': random.random() < 0.1,
            'tempAlert': False,
            'lightIsDark': False
        }

    try:
        # Read actual hardware
        is_motion = pir.motion_detected
        is_temp_high = bool(temp_sensor.value)  # True = High Temp/Threshold exceeded
        is_dark = bool(light_sensor.value)      # True = Dark (usually)

        if is_motion:
            last_motion_time = time.time()
            
        return {
            'motion': is_motion,
            'tempAlert': is_temp_high,
            'lightIsDark': is_dark
        }
    except Exception as e:
        logger.error(f"Sensor read error: {e}")
        return {'motion': False, 'tempAlert': False, 'lightIsDark': False}

# ============================================================
# API ENDPOINTS
# ============================================================
@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    """Main endpoint - returns all sensor data"""
    readings = get_readings()
    
    data = {
        'motion': readings['motion'],
        'lastMotion': last_motion_time,
        'tempAlert': readings['tempAlert'],
        'lightIsDark': readings['lightIsDark'],
        'timestamp': datetime.now().isoformat(),
        'status': 'ok',
        'hardware': HARDWARE_MODE
    }
    return jsonify(data)

@app.route('/api/tts', methods=['POST'])
def generate_tts():
    """
    Generates Albanian Audio using Microsoft Edge Neural Voice
    """
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    logger.info(f"🗣️ TTS Request: '{text[:30]}...'")

    try:
        # Create temp file
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio:
            output_file = temp_audio.name

        # Async generation
        async def _generate_audio():
            communicate = edge_tts.Communicate(text, "sq-AL-AnilaNeural")
            await communicate.save(output_file)

        asyncio.run(_generate_audio())

        return send_file(output_file, mimetype="audio/mpeg")

    except Exception as e:
        logger.error(f"❌ TTS Failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'hardware': HARDWARE_MODE,
        'uptime': time.time()
    })

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("🚀 AERA Server (Pi 5 Edition) Starting...")
    logger.info("=" * 50)
    
    # Run Flask
    app.run(host='0.0.0.0', port=5000, threaded=True)