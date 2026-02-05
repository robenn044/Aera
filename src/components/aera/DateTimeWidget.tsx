import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { sq } from 'date-fns/locale';

const DateTimeWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = format(currentTime, 'HH:mm');
  const seconds = format(currentTime, 'ss');
  const date = format(currentTime, 'EEEE, d MMMM', { locale: sq });

  return (
    <motion.div
      className="p-2 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-light text-foreground tracking-tight">
          {time}
        </span>
        <motion.span
          className="text-xs text-muted-foreground"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {seconds}
        </motion.span>
      </div>
      <p className="text-[10px] text-muted-foreground capitalize">
        {date}
      </p>
    </motion.div>
  );
};

export default DateTimeWidget;
