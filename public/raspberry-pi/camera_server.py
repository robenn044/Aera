#!/usr/bin/env python3
"""
AERA Smart Mirror - Camera Server (USB/V4L2 Fixed)
Forced to use Index 0 with V4L2 backend.

Run: python3 camera_server.py
View: http://localhost:8080/stream
"""

import logging
import time
import io
import json
import os
import sys
from threading import Condition, Thread
from http.server import HTTPServer, BaseHTTPRequestHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [CAMERA] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================
CAMERA_INDEX = 0  # Confirmed by scanner
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480
CAMERA_FPS = 30
PORT = 8080

# ============================================================
# GLOBAL STATE
# ============================================================
output = None

# ============================================================
# STREAMING BUFFER
# ============================================================
class StreamingOutput(io.BufferedIOBase):
    """Thread-safe buffer for camera frames"""
    def __init__(self):
        self.frame = None
        self.condition = Condition()
        self.frame_count = 0
    
    def writable(self):
        return True
    
    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.frame_count += 1
            self.condition.notify_all()
        return len(buf)
    
    def get_frame(self, timeout=5.0):
        with self.condition:
            if self.condition.wait(timeout=timeout):
                return self.frame
            return None

# ============================================================
# CAMERA INIT
# ============================================================
def start_camera():
    """Start USB Camera using OpenCV with V4L2 backend"""
    global output
    
    try:
        import cv2
    except ImportError:
        logger.error("❌ OpenCV not installed. Run: pip install opencv-python-headless")
        return False

    # Force V4L2 backend (Crucial fix based on scanner success)
    os.environ["OPENCV_VIDEOIO_PRIORITY_MSMF"] = "0"
    
    logger.info(f"🔌 Opening Camera Index {CAMERA_INDEX} (V4L2)...")
    
    # Explicitly ask for V4L2
    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_V4L2)
    
    # Configure
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
    cap.set(cv2.CAP_PROP_FPS, CAMERA_FPS)
    
    # Validate
    if not cap.isOpened():
        logger.error(f"❌ Failed to open Camera Index {CAMERA_INDEX}")
        return False

    # Double check we can actually read
    ret, frame = cap.read()
    if not ret:
        logger.error("❌ Camera opened but returned no frame.")
        return False

    logger.info(f"✅ Camera Started! Resolution: {CAMERA_WIDTH}x{CAMERA_HEIGHT}")
    
    # Start capture thread
    output = StreamingOutput()
    
    def capture_loop():
        while cap.isOpened():
            ret, frame = cap.read()
            if ret:
                # Encode to JPEG
                _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                output.write(buffer.tobytes())
            else:
                time.sleep(0.1)
        logger.warning("Camera stream ended unexpectedly")
    
    t = Thread(target=capture_loop, daemon=True)
    t.start()
    return True

# ============================================================
# HTTP SERVER
# ============================================================
class CameraHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return # Silence logs

    def do_GET(self):
        if self.path == '/stream':
            self.send_stream()
        elif self.path == '/snapshot':
            self.send_snapshot()
        elif self.path == '/health':
            self.send_health()
        else:
            self.send_error(404)

    def send_stream(self):
        if output is None:
            self.send_error(503)
            return
        
        self.send_response(200)
        self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=FRAME')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            while True:
                frame = output.get_frame()
                if frame:
                    self.wfile.write(b'--FRAME\r\n')
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', len(frame))
                    self.end_headers()
                    self.wfile.write(frame)
                    self.wfile.write(b'\r\n')
                else:
                    break
        except:
            pass
    
    def send_snapshot(self):
        if output is None:
            self.send_error(503)
            return
        frame = output.get_frame()
        if frame:
            self.send_response(200)
            self.send_header('Content-Type', 'image/jpeg')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(frame)
        else:
            self.send_error(503)

    def send_health(self):
        status = {
            'status': 'healthy' if output else 'error',
            'frames': output.frame_count if output else 0
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(status).encode())

if __name__ == '__main__':
    if start_camera():
        server = HTTPServer(('0.0.0.0', PORT), CameraHandler)
        logger.info(f"🚀 Camera Server running at http://0.0.0.0:{PORT}/stream")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
    else:
        logger.error("❌ Exiting.")