import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  type: 'dashboard' | 'sensor' | 'camera' | 'reminders';
}

const LoadingSkeleton = ({ type }: LoadingSkeletonProps) => {
  switch (type) {
    case 'sensor':
      return (
        <div className="p-3 rounded-xl bg-card/30 border border-border/30">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-8 w-20" />
        </div>
      );

    case 'camera':
      return (
        <div className="relative h-full w-full rounded-2xl overflow-hidden bg-card/20">
          <Skeleton className="absolute inset-0" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-16 h-16 rounded-full border-4 border-muted border-t-primary"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </div>
      );

    case 'reminders':
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 mb-3" />
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card/20">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      );

    case 'dashboard':
    default:
      return (
        <motion.div
          className="h-screen w-screen bg-background p-3 flex gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Left - Camera placeholder */}
          <div className="flex-1 h-full">
            <Skeleton className="h-full w-full rounded-2xl" />
          </div>

          {/* Right - Dashboard skeleton */}
          <div className="w-[280px] h-full flex flex-col gap-2">
            {/* Date/time */}
            <div className="p-3 rounded-xl bg-card/30">
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Sensors */}
            <div className="grid grid-cols-2 gap-2">
              <LoadingSkeleton type="sensor" />
              <LoadingSkeleton type="sensor" />
            </div>

            {/* Orb placeholder */}
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="w-32 h-32 rounded-full" />
            </div>

            {/* Reminders */}
            <LoadingSkeleton type="reminders" />
          </div>
        </motion.div>
      );
  }
};

export default LoadingSkeleton;
