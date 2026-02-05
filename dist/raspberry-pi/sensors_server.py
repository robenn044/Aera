#!/usr/bin/env python3
"""
AERA Smart Mirror - Sensors & Voice Server
Flask API for reading sensors AND generating Neural TTS audio.

Sensors (3-pin digital):
- PIR HC-SR501  → Motion detection      → GPIO27
- KY-028        → Temperature threshold → GPIO4
- LM393         → Light level           → GPIO17

Voice:
- Microsoft Edge TTS (sq-AL-AnilaNeural)

Run: python3 sensors_server.py
"""

import logging
import time
import os
import asyncio
import tempfile
import random
from datetime import datetime
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [AERA-BACKEND] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from AERA frontend

# ============================================================
# EDGE TTS SETUP
# ============================================================
import edge_tts

# ============================================================
# HARDWARE VS SIMULATION MODE
# ============================================================
# Try to import RPi.GPIO. If it fails (e.g. on Windows), switch to simulation.
try:
    import RPi.GPIO as GPIO
    HARDWARE_MODE = True
    logger.info("✅ RPi.GPIO detected. Running in HARDWARE MODE.")
except (ImportError, RuntimeError):
    HARDWARE_MODE = False
    logger.warning("⚠️  RPi.GPIO not found. Running in SIMULATION MODE (Windows/Mac).")

# GPIO pin assignments (BCM numbering)
PIN_PIR = 27      # Motion sensor
PIN_TEMP = 4      # Temperature threshold (KY-028)
PIN_LIGHT = 17    # Light sensor (LM393)

# State tracking
last_motion_time = None
motion_detected = False

# ============================================================
# GPIO SETUP
# ============================================================
if HARDWARE_MODE:
    try:
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        
        # Setup input pins with pull-down resistors
        GPIO.setup(PIN_PIR, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        GPIO.setup(PIN_TEMP, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        GPIO.setup(PIN_LIGHT, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        
        logger.info(f"   PIR on GPIO{PIN_PIR}, TEMP on GPIO{PIN_TEMP}, LIGHT on GPIO{PIN_LIGHT}")
    except Exception as e:
        logger.error(f"❌ GPIO setup failed: {e}")
        HARDWARE_MODE = False

# ============================================================
# SENSOR READING FUNCTIONS
# ============================================================
def read_pir():
    """Read PIR motion sensor (HIGH = motion detected)"""
    global motion_detected, last_motion_time
    
    if HARDWARE_MODE:
        try:
            state = GPIO.input(PIN_PIR)
            if state == GPIO.HIGH:
                motion_detected = True
                last_motion_time = time.time()
            elif motion_detected and (time.time() - (last_motion_time or 0)) > 5:
                # Reset motion after 5 seconds of no motion
                motion_detected = False
            return motion_detected
        except Exception as e:
            logger.error(f"PIR read error: {e}")
            return False
    else:
        # Simulation: random motion occasionally
        return random.random() < 0.1

def read_temp_alert():
    """Read KY-028 temperature threshold (HIGH = threshold exceeded)"""
    if HARDWARE_MODE:
        try:
            return GPIO.input(PIN_TEMP) == GPIO.HIGH
        except Exception as e:
            logger.error(f"Temp sensor read error: {e}")
            return False
    else:
        # Simulation: rarely trigger alert
        return random.random() < 0.05

def read_light_dark():
    """Read LM393 light sensor (HIGH = dark, LOW = bright)"""
    if HARDWARE_MODE:
        try:
            return GPIO.input(PIN_LIGHT) == GPIO.HIGH
        except Exception as e:
            logger.error(f"Light sensor read error: {e}")
            return True
    else:
        # Simulation: time-based light level
        hour = datetime.now().hour
        return hour < 6 or hour > 20

# ============================================================
# API ENDPOINTS
# ============================================================
@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    """Main endpoint - returns all sensor data"""
    try:
        data = {
            'motion': read_pir(),
            'lastMotion': last_motion_time,
            'tempAlert': read_temp_alert(),
            'lightIsDark': read_light_dark(),
            'timestamp': datetime.now().isoformat(),
            'status': 'ok',
            'hardware': HARDWARE_MODE
        }
        return jsonify(data)
    except Exception as e:
        logger.error(f"❌ Sensor read failed: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/tts', methods=['POST'])
def generate_tts():
    """
    Generates Albanian Audio using Microsoft Edge Neural Voice
    Input: JSON { "text": "Hello world" }
    Output: Audio file stream (audio/mpeg)
    """
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    logger.info(f"🗣️ Generating TTS for: '{text[:30]}...'")

    try:
        # Create a temporary file for the audio
        # delete=False is required for Windows to allow opening the file again
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio:
            output_file = temp_audio.name

        # Define the async TTS generation
        async def _generate_audio():
            # VOICE: sq-AL-AnilaNeural (Female) or sq-AL-IlirNeural (Male)
            communicate = edge_tts.Communicate(text, "sq-AL-AnilaNeural")
            await communicate.save(output_file)

        # Run the async function
        asyncio.run(_generate_audio())

        # Send the file back to the frontend
        # The browser will play this file
        return send_file(output_file, mimetype="audio/mpeg")

    except Exception as e:
        logger.error(f"❌ TTS Generation failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'hardware': HARDWARE_MODE,
        'uptime': time.time(),
        'pins': {
            'pir': PIN_PIR,
            'temp': PIN_TEMP,
            'light': PIN_LIGHT
        }
    })

# ============================================================
# CLEANUP
# ============================================================
def cleanup():
    """Clean up GPIO on exit"""
    if HARDWARE_MODE:
        try:
            import RPi.GPIO as GPIO
            GPIO.cleanup()
            logger.info("GPIO cleaned up")
        except:
            pass

import atexit
atexit.register(cleanup)

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("🚀 AERA Sensors & Voice Server starting...")
    logger.info(f"   Hardware Mode: {HARDWARE_MODE}")
    logger.info(f"   Listening on: http://0.0.0.0:5000")
    logger.info("=" * 50)
    
    try:
        # Threaded=True is important for handling multiple requests (sensors + tts)
        app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    finally:
        cleanup()