#!/usr/bin/env python3
"""
AERA Smart Mirror - TTS Server (Windows/Pi Compatible)
Uses edge-tts to generate Albanian speech (sq-AL-AnilaNeural)
Run: python3 tts_server.py
"""

import logging
import asyncio
import io
import sys
from flask import Flask, request, Response, jsonify, send_file
from flask_cors import CORS
import edge_tts

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [TTS] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
TTS_PORT = 5001
VOICE = "sq-AL-AnilaNeural"

# --- Async Helper ---
async def _generate_audio(text, voice):
    """
    Internal async function to communicate with Edge TTS.
    """
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            
    return audio_data

# --- Routes ---

@app.route('/', methods=['GET'])
def index():
    """Helper page to test if server is running"""
    return f"""
    <html>
    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>AERA TTS Server is Online 🟢</h1>
        <p>Voice: <strong>{VOICE}</strong></p>
        <p>To test audio, click the button below:</p>
        <button onclick="testAudio()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            Test Audio Playback
        </button>
        <script>
            function testAudio() {{
                fetch('/api/tts', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{text: 'Përshëndetje! Kjo është një provë zëri.'}})
                }})
                .then(res => res.blob())
                .then(blob => {{
                    var url = window.URL.createObjectURL(blob);
                    var audio = new Audio(url);
                    audio.play();
                }})
                .catch(err => alert('Error: ' + err));
            }}
        </script>
    </body>
    </html>
    """

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'online', 'voice': VOICE})

@app.route('/api/tts', methods=['POST'])
def tts_handler():
    """
    Synchronous Route wrapper that runs the Async TTS function.
    This prevents event loop conflicts on Windows.
    """
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
            
        text = data['text']
        logger.info(f"Received request: {text[:30]}...")

        # Run async function in a fresh event loop for this request
        # This is the safest way to mix Flask and Asyncio on Windows
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            audio_bytes = loop.run_until_complete(_generate_audio(text, VOICE))
            loop.close()
        except Exception as e:
            logger.error(f"Async Loop Error: {e}")
            # Fallback for systems where loop management is strict
            audio_bytes = asyncio.run(_generate_audio(text, VOICE))

        if not audio_bytes:
             logger.error("Generated audio was empty")
             return jsonify({'error': 'Empty audio generated'}), 500

        logger.info(f"Success! Sending {len(audio_bytes)} bytes")

        return Response(
            audio_bytes,
            mimetype="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3"
            }
        )
        
    except Exception as e:
        logger.error(f"Server Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info(f"🗣️  AERA TTS Server running on port {TTS_PORT}")
    logger.info(f"   Open http://localhost:{TTS_PORT} to test")
    logger.info("=" * 50)
    
    # Disable reloader to prevent loop conflicts
    app.run(host='0.0.0.0', port=TTS_PORT, debug=True, use_reloader=False)