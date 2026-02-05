// Simulation mode utilities for AERA Smart Mirror
// When SIMULATION_MODE=true, simulates sensor data and uses browser camera

import { SensorData } from '@/services/sensorService';

/**
 * Check if simulation mode is enabled
 */
export function isSimulationMode(): boolean {
  const mode = import.meta.env.VITE_SIMULATION_MODE;
  return mode === 'true' || mode === true || mode === '1';
}

/**
 * Generate random simulated sensor data
 */
export function generateSimulatedSensorData(): SensorData {
  // Generate realistic random values
  const temperature = 18 + Math.random() * 10; // 18-28°C
  const humidity = 40 + Math.random() * 30; // 40-70%
  const light = Math.random() * 100; // 0-100%
  
  return {
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity),
    tempAlert: temperature > 26, // Alert if above 26°C
    light: Math.round(light),
    lightIsDark: light < 30, // Dark if below 30%
    motion: Math.random() > 0.7, // 30% chance of motion
    lastMotion: Date.now() - Math.random() * 60000, // Within last minute
    isConnected: true,
    lastUpdated: new Date(),
  };
}

/**
 * Log simulation status
 */
export function logSimulationStatus(): void {
  if (isSimulationMode()) {
    console.info('[AERA] 🎮 Simulation Mode ENABLED');
    console.info('[AERA] Sensors will be simulated');
    console.info('[AERA] Camera will use browser webcam');
    console.info('[AERA] Keyboard shortcuts:');
    console.info('  - SPACE: Send random question to Gemini');
    console.info('  - C: Capture camera image and analyze');
  } else {
    console.info('[AERA] 🔧 Hardware Mode - Connecting to Raspberry Pi');
  }
}
