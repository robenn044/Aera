// Browser Camera component for simulation mode
// Uses getUserMedia to access the device camera

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BrowserCameraRef {
  captureImage: () => Promise<string | null>;
}

interface BrowserCameraProps {
  onCapture?: (imageData: string) => void;
}

const BrowserCamera = forwardRef<BrowserCameraRef, BrowserCameraProps>(
  ({ onCapture }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Start camera stream
    const startCamera = useCallback(async () => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsStreaming(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to access camera:', error);
        setHasError(true);
        setIsLoading(false);
        
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setErrorMessage('Leja për kamerën u refuzua');
          } else if (error.name === 'NotFoundError') {
            setErrorMessage('Nuk u gjet kamera');
          } else {
            setErrorMessage('Gabim në hapjen e kamerës');
          }
        }
      }
    }, []);

    // Stop camera stream
    const stopCamera = useCallback(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsStreaming(false);
    }, []);

    // Capture image from video
    const captureImage = useCallback(async (): Promise<string | null> => {
      if (!videoRef.current || !isStreaming) {
        return null;
      }

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }

      // Mirror the image (front camera is usually mirrored)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/jpeg', 0.85);
      onCapture?.(imageData);
      return imageData;
    }, [isStreaming, onCapture]);

    // Expose capture method via ref
    useImperativeHandle(ref, () => ({
      captureImage,
    }), [captureImage]);

    // Start camera on mount
    useEffect(() => {
      startCamera();
      return () => stopCamera();
    }, [startCamera, stopCamera]);

    // Handle retry
    const handleRetry = () => {
      stopCamera();
      startCamera();
    };

    if (hasError) {
      return (
        <motion.div
          className="h-full w-full flex flex-col items-center justify-center bg-card/30 rounded-xl border border-border/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CameraOff className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-xs mb-1">{errorMessage}</p>
          <p className="text-muted-foreground/50 text-[10px] mb-3">
            Simulation Mode
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Provo përsëri
          </Button>
        </motion.div>
      );
    }

    return (
      <motion.div
        className="relative h-full w-full rounded-xl overflow-hidden border border-border/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-6 h-6 text-primary" />
            </motion.div>
          </div>
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror for front camera
          autoPlay
          playsInline
          muted
        />

        {/* Live indicator */}
        {isStreaming && !isLoading && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-green-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-[10px] text-white font-medium">SIMULATION</span>
          </div>
        )}

        {/* Camera icon overlay */}
        <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm">
          <Camera className="w-3 h-3 text-white/70" />
        </div>

        {/* Keyboard shortcut hint */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/30 backdrop-blur-sm">
          <span className="text-[9px] text-white/60">C = Capture</span>
        </div>
      </motion.div>
    );
  }
);

BrowserCamera.displayName = 'BrowserCamera';

export default BrowserCamera;
