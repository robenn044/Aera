import { motion } from 'framer-motion';
import { Thermometer, Sun, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SensorWidgetProps {
  type: 'temperature' | 'light';
  value: number | null;
  unit?: string;
  isConnected?: boolean;
  isAlert?: boolean; // For KY-028 temperature threshold alert
  isDark?: boolean;  // For LM393 light sensor
}

const SensorWidget = ({ 
  type, 
  value, 
  unit, 
  isConnected = true,
  isAlert = false,
  isDark = false
}: SensorWidgetProps) => {
  const Icon = type === 'temperature' 
    ? (isAlert ? AlertTriangle : Thermometer) 
    : Sun;
  const ConnectionIcon = isConnected ? Wifi : WifiOff;
  
  const getLabel = () => {
    if (type === 'temperature') return isAlert ? 'Temp. Lartë!' : 'Temperatura';
    return isDark ? 'Errët' : 'Ndriçimi';
  };

  const getDisplayValue = () => {
    if (!isConnected) return '--';
    
    if (type === 'temperature') {
      // KY-028 is threshold-only, show alert status
      if (value !== null) return `${value}°C`;
      return isAlert ? 'LARTË' : 'OK';
    }
    
    // Light sensor
    if (value !== null) return `${value}%`;
    return isDark ? 'Errët' : 'Ndritshëm';
  };

  const getColor = () => {
    if (!isConnected) return 'text-muted-foreground';
    
    if (type === 'temperature') {
      if (isAlert) return 'text-orange-400';
      if (value !== null) {
        if (value < 18) return 'text-blue-400';
        if (value > 26) return 'text-orange-400';
      }
      return 'text-aera-success';
    }
    
    // Light
    if (isDark) return 'text-muted-foreground';
    if (value !== null) {
      if (value < 30) return 'text-muted-foreground';
      if (value > 70) return 'text-yellow-400';
    }
    return 'text-foreground';
  };

  return (
    <motion.div
      className="relative flex items-center gap-1.5 p-1.5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      role="status"
      aria-label={`${getLabel()}: ${getDisplayValue()}`}
      aria-live="polite"
    >
      {/* Icon */}
      <div className={cn('p-1.5 rounded-md bg-secondary', getColor())}>
        <Icon className="w-3 h-3" aria-hidden="true" />
      </div>

      {/* Value */}
      <div className="flex-1 min-w-0">
        <p className="text-[8px] text-muted-foreground uppercase tracking-wider truncate">
          {getLabel()}
        </p>
        <p className={cn('text-sm font-light', getColor())}>
          {getDisplayValue()}
        </p>
      </div>

      {/* Connection indicator */}
      <div 
        className="absolute top-0.5 right-0.5"
        aria-label={isConnected ? 'Sensori i lidhur' : 'Sensori i shkëputur'}
      >
        <ConnectionIcon 
          className={cn(
            'w-2 h-2',
            isConnected ? 'text-aera-success' : 'text-muted-foreground'
          )}
          aria-hidden="true"
        />
      </div>
    </motion.div>
  );
};

export default SensorWidget;
