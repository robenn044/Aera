#!/usr/bin/env python3
"""
AERA Ultimate Server
- Voice: TTS (Edge) & STT (Groq)
- Eyes: Sensors (PIR, KY-028, LM393)
- Layout: Spaced Out (Top/Middle/Bottom)
Run: python3 tts_server.py
"""

import logging
import asyncio
import sys
import os
import time
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import edge_tts
from groq import Groq

# Hardware Imports (Try/Except to allow running on PC without crashing)
try:
    from gpiozero import MotionSensor, DigitalInputDevice
    HARDWARE_AVAILABLE = True
except (ImportError, Exception):
    HARDWARE_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [AERA] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- CONFIGURATION ---
PORT = 5001
TTS_VOICE = "sq-AL-AnilaNeural"
STT_MODEL = "whisper-large-v3"
IS_WINDOWS = sys.platform == "win32"

# --- HARDWARE SETUP (NEW SPACED LAYOUT) ---
sensors = {}

if HARDWARE_AVAILABLE:
    try:
        # 1. Motion Sensor (PIR) - GPIO 14 (Pin 8 - Top Right)
        # We use a short queue to prevent noise
        sensors['pir'] = MotionSensor(14, queue_len=1, threshold=0.5)
        
        # 2. Temp Sensor (KY-028) - GPIO 4 (Pin 7 - Top Left)
        # This is a digital switch. HIGH = Temp > Threshold
        sensors['temp'] = DigitalInputDevice(4, pull_up=False) 
        
        # 3. Light Sensor (LM393) - GPIO 21 (Pin 40 - Bottom Right)
        # Digital switch. HIGH = Dark (usually), LOW = Bright
        sensors['light'] = DigitalInputDevice(21, pull_up=False)
        
        logger.info("✅ Hardware Sensors Initialized:")
        logger.info("   - Motion (PIR) : GPIO 14 (Pin 8)")
        logger.info("   - Temp (KY-028): GPIO 4  (Pin 7)")
        logger.info("   - Light (LM393): GPIO 21 (Pin 40)")
        
    except Exception as e:
        logger.error(f"⚠️ Sensor Init Failed: {e}")
        HARDWARE_AVAILABLE = False
else:
    logger.warning("⚠️ GPIO libraries not found. Running in SIMULATION MODE.")

# ---------------------------------------------------------------------------
# SENSOR ENDPOINT
# ---------------------------------------------------------------------------
@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    if not HARDWARE_AVAILABLE:
        # Return mock data for testing if hardware fails
        return jsonify({
            "temperature": 24, "humidity": 45, "tempAlert": False,
            "light": 800, "lightIsDark": False,
            "motion": False, "isConnected": False
        })

    try:
        # Read Real Hardware
        motion_detected = sensors['pir'].motion_detected
        
        # KY-028 logic: 1 = Threshold exceeded (Hot), 0 = Normal
        temp_alert = bool(sensors['temp'].value)
        
        # LM393 logic: 1 = Dark, 0 = Light (Typical behavior)
        is_dark = bool(sensors['light'].value)

        return jsonify({
            # Digital Sensor Estimates (Since we don't get raw numbers)
            "temperature": 28 if temp_alert else 22, 
            "humidity": 50, # KY-028 doesn't measure humidity
            "tempAlert": temp_alert,
            
            "light": 20 if is_dark else 100, 
            "lightIsDark": is_dark,
            
            "motion": motion_detected,
            "isConnected": True
        })
    except Exception as e:
        logger.error(f"Sensor Read Error: {e}")
        return jsonify({"error": str(e), "isConnected": False}), 500

# ---------------------------------------------------------------------------
# TTS (Text-to-Speech)
# ---------------------------------------------------------------------------
async def _generate_audio_stream(text):
    communicate = edge_tts.Communicate(text, TTS_VOICE)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]

# WINDOWS HANDLER
def tts_handler_windows():
    try:
        data = request.json
        text = data.get('text') if data else None
        if not text: return jsonify({'error': 'No text'}), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        audio_bytes = b""
        async def collect():
            nonlocal audio_bytes
            async for chunk in _generate_audio_stream(text):
                audio_bytes += chunk
        loop.run_until_complete(collect())
        loop.close()
        
        return Response(audio_bytes, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# LINUX HANDLER (Raspberry Pi)
async def tts_handler_linux():
    try:
        text = request.args.get('text')
        if request.method == 'POST':
            data = request.json
            text = data.get('text')
            
        if not text: return jsonify({'error': 'No text'}), 400
        return Response(_generate_audio_stream(text), mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if IS_WINDOWS:
    app.add_url_rule('/api/tts', view_func=tts_handler_windows, methods=['POST'])
else:
    app.add_url_rule('/api/tts', view_func=tts_handler_linux, methods=['GET', 'POST'])

# ---------------------------------------------------------------------------
# STT (Speech-to-Text)
# ---------------------------------------------------------------------------
@app.route('/api/stt', methods=['POST'])
def stt_handler():
    try:
        if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
        api_key = request.headers.get('x-groq-key')
        if not api_key: return jsonify({'error': 'No API Key'}), 401
        
        file = request.files['file']
        client = Groq(api_key=api_key)
        
        transcription = client.audio.transcriptions.create(
            file=("input.webm", file.read()),
            model=STT_MODEL,
            language="sq",
            temperature=0.0
        )
        return jsonify({'text': transcription.text})
    except Exception as e:
        logger.error(f"STT Error: {e}")
        return jsonify({'error': str(e)}), 500

# ---------------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------------
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'online', 
        'hardware': 'active' if HARDWARE_AVAILABLE else 'simulation'
    })

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info(f"🚀 AERA Server running on port {PORT}")
    if HARDWARE_AVAILABLE:
        logger.info("   ✅ Hardware Sensors Enabled (Spaced Layout)")
    else:
        logger.info("   ⚠️  Hardware Sensors Disabled (Libraries not found)")
    logger.info("=" * 60)
    
    app.run(host='0.0.0.0', port=PORT, debug=False, use_reloader=False)