import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { sq } from 'date-fns/locale';

interface LockScreenProps {
  onUnlock: () => void;
  isListening?: boolean;
}

const LockScreen = ({ onUnlock, isListening = false }: LockScreenProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = format(currentTime, 'HH');
  const minutes = format(currentTime, 'mm');
  const dateStr = format(currentTime, 'EEEE, d MMMM', { locale: sq });

  return (
    <motion.div
      className="h-screen w-screen flex flex-col items-center justify-center bg-background cursor-pointer overflow-hidden"
      onClick={onUnlock}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onUnlock();
        }
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5 }}
      role="button"
      tabIndex={0}
      aria-label="Prek ose shtyp Enter për të hapur AERA"
    >
      {/* Breathing indicator */}
      <motion.div
        className="absolute w-20 h-20 rounded-full bg-primary/10"
        style={{ top: '25%' }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Time Display - optimized for 7" screen */}
      <div className="relative z-10 text-center">
        <motion.div
          className="flex items-baseline justify-center gap-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-7xl font-thin leading-none text-foreground/90 tracking-tighter">
            {hours}
          </span>
          <motion.span
            className="text-7xl font-thin leading-none text-foreground/90"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            :
          </motion.span>
          <span className="text-7xl font-thin leading-none text-foreground/90 tracking-tighter">
            {minutes}
          </span>
        </motion.div>

        <motion.p
          className="mt-1.5 text-base font-light text-muted-foreground capitalize"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {dateStr}
        </motion.p>
      </div>

      {/* AERA Status */}
      <motion.div
        className="absolute bottom-5 flex flex-col items-center gap-1.5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[10px] text-muted-foreground">
            Thuaj: Përshëndetje Aera
          </span>
        </div>
        <p className="text-[9px] text-muted-foreground/50">
          Prek për të hapur
        </p>
      </motion.div>
    </motion.div>
  );
};

export default LockScreen;
