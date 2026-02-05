import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface VoiceOrbProps {
  state: OrbState;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const stateColors = {
  idle: 'from-aera-orb-idle to-primary',
  listening: 'from-aera-orb-listening to-emerald-400',
  thinking: 'from-aera-orb-thinking to-orange-400',
  speaking: 'from-aera-orb-speaking to-purple-400',
};

const stateGlows = {
  idle: 'shadow-[0_0_60px_rgba(0,180,216,0.3)]',
  listening: 'shadow-[0_0_80px_rgba(16,185,129,0.5)]',
  thinking: 'shadow-[0_0_60px_rgba(245,158,11,0.4)]',
  speaking: 'shadow-[0_0_80px_rgba(168,85,247,0.5)]',
};

const sizes = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

const stateLabels: Record<OrbState, string> = {
  idle: 'AERA gati për të dëgjuar',
  listening: 'AERA po dëgjon',
  thinking: 'AERA po mendon',
  speaking: 'AERA po flet',
};

const VoiceOrb = ({ state, onClick, size = 'lg' }: VoiceOrbProps) => {
  const getAnimation = (): { scale?: number[]; rotate?: number[]; transition: object } => {
    switch (state) {
      case 'listening':
        return {
          scale: [1, 1.15, 1],
          transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' as const },
        };
      case 'thinking':
        return {
          rotate: [0, 360],
          scale: [1, 1.05, 1],
          transition: { 
            rotate: { duration: 3, repeat: Infinity, ease: 'linear' as const },
            scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' as const },
          },
        };
      case 'speaking':
        return {
          scale: [1, 1.1, 0.95, 1.05, 1],
          transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' as const },
        };
      default:
        return {
          scale: [1, 1.03, 1],
          transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const },
        };
    }
  };

  const getInnerAnimation = () => {
    switch (state) {
      case 'listening':
        return {
          scale: [0.6, 0.8, 0.6],
          opacity: [0.3, 0.6, 0.3],
        };
      case 'thinking':
        return {
          scale: [0.5, 0.7, 0.5],
          opacity: [0.2, 0.5, 0.2],
          rotate: [360, 0],
        };
      case 'speaking':
        return {
          scale: [0.4, 0.9, 0.5, 0.8, 0.4],
          opacity: [0.3, 0.7, 0.4, 0.6, 0.3],
        };
      default:
        return {
          scale: [0.6, 0.65, 0.6],
          opacity: [0.2, 0.3, 0.2],
        };
    }
  };

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative rounded-full bg-gradient-to-br cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        sizes[size],
        stateColors[state],
        stateGlows[state],
        'transition-shadow duration-500'
      )}
      animate={getAnimation()}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label={stateLabels[state]}
      aria-live="polite"
      role="button"
      tabIndex={0}
    >
      {/* Inner glow layers */}
      <motion.div
        className="absolute inset-4 rounded-full bg-white/20 blur-sm"
        animate={getInnerAnimation()}
        transition={{ duration: state === 'speaking' ? 0.5 : 2, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-8 rounded-full bg-white/30 blur-md"
        animate={{
          scale: state === 'speaking' ? [0.3, 0.6, 0.3] : [0.5, 0.6, 0.5],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: state === 'speaking' ? 0.3 : 1.5, repeat: Infinity }}
      />
      
      {/* Center core */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={state === 'listening' ? { scale: [1, 0.9, 1] } : {}}
        transition={{ duration: 0.3, repeat: Infinity }}
      >
        <div className="w-1/4 h-1/4 rounded-full bg-white/60 blur-sm" />
      </motion.div>

      {/* Ripple effect for listening */}
      {state === 'listening' && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-aera-orb-listening"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-aera-orb-listening"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}
    </motion.button>
  );
};

export default VoiceOrb;
