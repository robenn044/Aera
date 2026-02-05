import { motion } from 'framer-motion';
import CameraFeed from './CameraFeed';
import BrowserCamera from './BrowserCamera';
import DateTimeWidget from './DateTimeWidget';
import SensorWidget from './SensorWidget';
import VoiceOrb, { OrbState } from './VoiceOrb';
import RemindersList from './RemindersList';
import { Reminder } from './ReminderItem';

interface SensorData {
  temperature: number | null;
  humidity: number | null;
  tempAlert: boolean;         // KY-028 threshold alert
  light: number | null;
  lightIsDark: boolean;       // LM393 dark detection
  motion: boolean;            // PIR HC-SR501
  lastMotion: number | null;
  isConnected: boolean;
  lastUpdated: Date;
}

interface DashboardProps {
  sensorData: SensorData;
  cameraUrl?: string;
  isCameraConnected?: boolean;
  usesBrowserCamera?: boolean;
  orbState: OrbState;
  onOrbClick: () => void;
  reminders: Reminder[];
  onDeleteReminder: (id: string) => void;
  onCompleteReminder: (id: string) => void;
  onAddReminder: (reminder: Omit<Reminder, 'id'>) => Reminder;
  conversationText?: string;
  isLoading?: boolean;
}

const Dashboard = ({
  sensorData,
  cameraUrl,
  isCameraConnected = false,
  usesBrowserCamera = false,
  orbState,
  onOrbClick,
  reminders,
  onDeleteReminder,
  onCompleteReminder,
  onAddReminder,
  conversationText,
  isLoading,
}: DashboardProps) => {
  return (
    <motion.div
      className="h-screen w-screen bg-background p-2 flex gap-2 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left Panel - Camera Feed */}
      <motion.div
        className="flex-1 h-full min-w-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        {usesBrowserCamera ? (
          <BrowserCamera />
        ) : (
          <CameraFeed 
            streamUrl={cameraUrl}
            isConnected={isCameraConnected}
          />
        )}
      </motion.div>

      {/* Right Panel - Dashboard */}
      <motion.div
        className="w-[240px] h-full flex flex-col gap-1.5 overflow-hidden"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Date & Time */}
        <DateTimeWidget />

        {/* Sensors */}
        <div className="grid grid-cols-2 gap-1.5">
          <SensorWidget
            type="temperature"
            value={sensorData.temperature}
            isConnected={sensorData.isConnected}
            isAlert={sensorData.tempAlert}
          />
          <SensorWidget
            type="light"
            value={sensorData.light}
            isConnected={sensorData.isConnected}
            isDark={sensorData.lightIsDark}
          />
        </div>

        {/* Voice Orb Section */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center min-h-0"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <VoiceOrb state={orbState} onClick={onOrbClick} size="sm" />
          
          {/* State indicator */}
          <motion.p
            className="mt-1.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {orbState === 'idle' && 'Gati për të dëgjuar'}
            {orbState === 'listening' && 'Po dëgjoj...'}
            {orbState === 'thinking' && 'Po mendoj...'}
            {orbState === 'speaking' && 'Po flas...'}
          </motion.p>
          
          {/* Conversation text */}
          {conversationText && (
            <motion.p
              className="mt-1.5 text-center text-[10px] text-muted-foreground max-w-[220px] leading-relaxed line-clamp-2"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              key={conversationText.slice(0, 50)}
            >
              {conversationText}
            </motion.p>
          )}
        </motion.div>

        {/* Reminders */}
        <motion.div
          className="flex-shrink-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <RemindersList
            reminders={reminders}
            onDeleteReminder={onDeleteReminder}
            onCompleteReminder={onCompleteReminder}
            maxHeight="100px"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
