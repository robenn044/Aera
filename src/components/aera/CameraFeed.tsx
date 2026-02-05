import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraFeedProps {
  streamUrl?: string;
  isConnected?: boolean;
}

const CameraFeed = ({ streamUrl, isConnected = false }: CameraFeedProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (streamUrl) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [streamUrl]);

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
  };

  if (!isConnected || !streamUrl) {
    return (
      <motion.div
        className="h-full w-full flex flex-col items-center justify-center bg-card/30 rounded-xl border border-border/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        role="region"
        aria-label="Kamera nuk është e disponueshme"
      >
        <CameraOff className="w-12 h-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
        <p className="text-muted-foreground text-xs">Kamera nuk është e lidhur</p>
        <p className="text-muted-foreground/50 text-[10px] mt-1">
          Lidheni Raspberry Pi
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative h-full w-full rounded-xl overflow-hidden border border-border/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="img"
      aria-label="Transmetim live nga kamera"
    >
      {/* Loading state */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-6 h-6 text-primary" />
          </motion.div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 z-10">
          <CameraOff className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-xs mb-3">Gabim në lidhje</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Provo përsëri
          </Button>
        </div>
      )}

      {/* Camera feed */}
      <img
        src={streamUrl}
        alt="Camera Feed"
        className="h-full w-full object-cover"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {/* Live indicator */}
      {!isLoading && !hasError && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[10px] text-white font-medium">LIVE</span>
        </div>
      )}

      {/* Camera icon overlay */}
      <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm">
        <Camera className="w-3 h-3 text-white/70" />
      </div>
    </motion.div>
  );
};

export default CameraFeed;
