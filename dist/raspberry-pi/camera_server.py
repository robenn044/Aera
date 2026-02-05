#!/usr/bin/env python3
"""
AERA Smart Mirror - Camera Server
MJPEG streaming server for Raspberry Pi Camera Module

Streams video at 640x480 for real-time mirror display
and provides snapshot endpoint for Gemini Vision analysis.

Run: python3 camera_server.py
View: http://localhost:8080/stream
Snapshot: http://localhost:8080/snapshot
"""

import io
import logging
import time
from datetime import datetime
from threading import Thread, Lock, Condition
from http.server import HTTPServer, BaseHTTPRequestHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [CAMERA] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480
CAMERA_FPS = 24
CAMERA_ROTATION = 0  # 0, 90, 180, or 270
PORT = 8080

# ============================================================
# CAMERA SETUP
# ============================================================
camera = None
output = None
camera_lock = Lock()

class StreamingOutput:
    """Thread-safe buffer for camera frames"""
    def __init__(self):
        self.frame = None
        self.condition = Condition()
        self.frame_count = 0
    
    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.frame_count += 1
            self.condition.notify_all()
        return len(buf)
    
    def get_frame(self, timeout=5.0):
        with self.condition:
            self.condition.wait(timeout=timeout)
            return self.frame

def init_camera():
    """Initialize the Pi camera"""
    global camera, output
    
    try:
        # Try Picamera2 first (Bullseye/Bookworm)
        from picamera2 import Picamera2
        from picamera2.encoders import MJPEGEncoder
        from picamera2.outputs import FileOutput
        
        logger.info("Using Picamera2 (libcamera)")
        
        camera = Picamera2()
        config = camera.create_video_configuration(
            main={"size": (CAMERA_WIDTH, CAMERA_HEIGHT), "format": "RGB888"},
            encode="main"
        )
        camera.configure(config)
        
        output = StreamingOutput()
        encoder = MJPEGEncoder(bitrate=5000000)
        camera.start_recording(encoder, FileOutput(output))
        
        logger.info(f"✅ Camera started: {CAMERA_WIDTH}x{CAMERA_HEIGHT} @ {CAMERA_FPS}fps")
        return True
        
    except ImportError:
        logger.info("Picamera2 not available, trying legacy picamera...")
        
        try:
            # Fall back to legacy picamera
            import picamera
            
            logger.info("Using legacy picamera")
            
            camera = picamera.PiCamera()
            camera.resolution = (CAMERA_WIDTH, CAMERA_HEIGHT)
            camera.framerate = CAMERA_FPS
            camera.rotation = CAMERA_ROTATION
            
            # Warm up camera
            time.sleep(2)
            
            output = StreamingOutput()
            camera.start_recording(output, format='mjpeg')
            
            logger.info(f"✅ Camera started: {CAMERA_WIDTH}x{CAMERA_HEIGHT} @ {CAMERA_FPS}fps")
            return True
            
        except ImportError:
            logger.error("❌ No camera library available!")
            logger.error("   Install: sudo apt install python3-picamera2")
            return False
        except Exception as e:
            logger.error(f"❌ Legacy camera init failed: {e}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Camera initialization failed: {e}")
        return False

# ============================================================
# HTTP SERVER
# ============================================================
class CameraHandler(BaseHTTPRequestHandler):
    """HTTP request handler for camera streams"""
    
    def log_message(self, format, *args):
        """Custom log formatting"""
        logger.debug(f"{self.address_string()} - {format % args}")
    
    def do_GET(self):
        if self.path == '/':
            self.send_index()
        elif self.path == '/stream':
            self.send_stream()
        elif self.path == '/snapshot' or self.path.startswith('/snapshot?'):
            self.send_snapshot()
        elif self.path == '/health':
            self.send_health()
        else:
            self.send_error(404)
    
    def send_index(self):
        """Send HTML index page"""
        content = b'''<!DOCTYPE html>
<html>
<head><title>AERA Camera</title></head>
<body style="background:#111;color:#fff;font-family:system-ui;text-align:center;padding:20px">
    <h1>AERA Camera Server</h1>
    <img src="/stream" style="max-width:100%;border:2px solid #333;border-radius:8px">
    <p style="margin-top:20px">
        <a href="/stream" style="color:#0af">MJPEG Stream</a> | 
        <a href="/snapshot" style="color:#0af">Snapshot</a> |
        <a href="/health" style="color:#0af">Health</a>
    </p>
</body>
</html>'''
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.send_header('Content-Length', len(content))
        self.end_headers()
        self.wfile.write(content)
    
    def send_stream(self):
        """Send MJPEG stream"""
        if output is None:
            self.send_error(503, 'Camera not initialized')
            return
        
        self.send_response(200)
        self.send_header('Age', 0)
        self.send_header('Cache-Control', 'no-cache, private')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=FRAME')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        logger.info(f"📹 Stream started for {self.address_string()}")
        
        try:
            while True:
                frame = output.get_frame()
                if frame is None:
                    continue
                
                self.wfile.write(b'--FRAME\r\n')
                self.send_header('Content-Type', 'image/jpeg')
                self.send_header('Content-Length', len(frame))
                self.end_headers()
                self.wfile.write(frame)
                self.wfile.write(b'\r\n')
                
        except Exception as e:
            logger.info(f"Stream ended for {self.address_string()}: {e}")
    
    def send_snapshot(self):
        """Send single JPEG frame"""
        if output is None:
            self.send_error(503, 'Camera not initialized')
            return
        
        frame = output.get_frame()
        if frame is None:
            self.send_error(503, 'No frame available')
            return
        
        self.send_response(200)
        self.send_header('Content-Type', 'image/jpeg')
        self.send_header('Content-Length', len(frame))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self.wfile.write(frame)
        
        logger.debug(f"📷 Snapshot sent to {self.address_string()}")
    
    def send_health(self):
        """Send health status as JSON"""
        import json
        health = {
            'status': 'healthy' if output else 'unhealthy',
            'camera': 'running' if camera else 'stopped',
            'resolution': f'{CAMERA_WIDTH}x{CAMERA_HEIGHT}',
            'fps': CAMERA_FPS,
            'frames': output.frame_count if output else 0,
            'timestamp': datetime.now().isoformat()
        }
        content = json.dumps(health).encode()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(content))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(content)

class ThreadedHTTPServer(HTTPServer):
    """Handle requests in separate threads"""
    allow_reuse_address = True
    daemon_threads = True
    
    def handle_error(self, request, client_address):
        logger.debug(f"Connection closed by {client_address}")

# ============================================================
# MAIN
# ============================================================
def main():
    logger.info("=" * 50)
    logger.info("🎥 AERA Camera Server starting...")
    
    if not init_camera():
        logger.error("Failed to initialize camera. Exiting.")
        return
    
    server = ThreadedHTTPServer(('0.0.0.0', PORT), CameraHandler)
    
    logger.info(f"   Streaming at: http://0.0.0.0:{PORT}/stream")
    logger.info(f"   Snapshot at:  http://0.0.0.0:{PORT}/snapshot")
    logger.info("=" * 50)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    finally:
        if camera:
            try:
                camera.stop_recording()
                camera.close()
                logger.info("Camera closed")
            except:
                pass

if __name__ == '__main__':
    main()
