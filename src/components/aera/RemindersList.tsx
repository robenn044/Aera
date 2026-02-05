import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus } from 'lucide-react';
import ReminderItem, { Reminder } from './ReminderItem';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RemindersListProps {
  reminders: Reminder[];
  onDeleteReminder?: (id: string) => void;
  onCompleteReminder?: (id: string) => void;
  maxHeight?: string;
}

const RemindersList = ({ 
  reminders, 
  onDeleteReminder, 
  onCompleteReminder,
  maxHeight = '300px'
}: RemindersListProps) => {
  const activeReminders = reminders
    .filter(r => !r.isCompleted)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return (
    <motion.div
      className="flex flex-col gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Bell className="w-3 h-3 text-primary" />
          <h3 className="text-xs font-medium text-foreground">Kujtesat</h3>
          {activeReminders.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">
              {activeReminders.length}
            </span>
          )}
        </div>
      </div>

      {/* Reminders List */}
      <ScrollArea style={{ maxHeight }} className="pr-2">
        {activeReminders.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mb-2">
              <Bell className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Nuk ka kujtesa</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Thuaj "Shto një kujtesë"
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <AnimatePresence mode="popLayout">
              {activeReminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  onDelete={onDeleteReminder}
                  onComplete={onCompleteReminder}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
};

export default RemindersList;
