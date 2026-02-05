import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { sq } from 'date-fns/locale';
import { Bell, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface Reminder {
  id: string;
  title: string;
  deadline: Date;
  isCompleted?: boolean;
}

interface ReminderItemProps {
  reminder: Reminder;
  onDelete?: (id: string) => void;
  onComplete?: (id: string) => void;
}

const ReminderItem = forwardRef<HTMLDivElement, ReminderItemProps>(
  ({ reminder, onDelete, onComplete }, ref) => {
    const isOverdue = isPast(reminder.deadline) && !reminder.isCompleted;
    const isUrgent = !isPast(reminder.deadline) && 
      new Date(reminder.deadline).getTime() - Date.now() < 3600000; // Within 1 hour

    const getTimeLabel = () => {
      if (isToday(reminder.deadline)) {
        return `Sot në ${format(reminder.deadline, 'HH:mm')}`;
      }
      if (isTomorrow(reminder.deadline)) {
        return `Nesër në ${format(reminder.deadline, 'HH:mm')}`;
      }
      return formatDistanceToNow(reminder.deadline, { 
        addSuffix: true, 
        locale: sq 
      });
    };

    const getStatusColor = () => {
      if (reminder.isCompleted) return 'border-aera-success/30 bg-aera-success/5';
      if (isOverdue) return 'border-aera-danger/50 bg-aera-danger/10';
      if (isUrgent) return 'border-aera-warning/50 bg-aera-warning/10';
      return 'border-border/50 bg-card/50';
    };

    const getIconColor = () => {
      if (reminder.isCompleted) return 'text-aera-success';
      if (isOverdue) return 'text-aera-danger';
      if (isUrgent) return 'text-aera-warning';
      return 'text-primary';
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative flex items-center gap-2 p-2 rounded-lg border backdrop-blur-sm',
          getStatusColor()
        )}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20, height: 0 }}
        layout
        whileHover={{ scale: 1.01 }}
      >
        {/* Status icon */}
        <div className={cn('p-1.5 rounded-md bg-secondary/50', getIconColor())}>
          {isOverdue ? (
            <AlertTriangle className="w-3 h-3" />
          ) : isUrgent ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Bell className="w-3 h-3" />
            </motion.div>
          ) : (
            <Clock className="w-3 h-3" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs font-medium truncate',
            reminder.isCompleted && 'line-through text-muted-foreground'
          )}>
            {reminder.title}
          </p>
          <p className={cn(
            'text-[10px]',
            isOverdue ? 'text-aera-danger' : 
            isUrgent ? 'text-aera-warning' : 
            'text-muted-foreground'
          )}>
            {isOverdue ? 'I kaluar • ' : ''}{getTimeLabel()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center">
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-aera-danger"
              onClick={() => onDelete(reminder.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  }
);

ReminderItem.displayName = 'ReminderItem';

export default ReminderItem;