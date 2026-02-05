// Raspberry Pi Sensor Service for AERA Smart Mirror
// Production-ready with error handling and type safety
// Supports simulation mode for development without hardware

import { isSimulationMode, generateSimulatedSensorData } from '@/lib/simulation';

const PI_IP = import.meta.env.VITE_RASPBERRY_PI_IP || '';
const SENSOR_PORT = import.meta.env.VITE_SENSOR_PORT || '5000';
const CAMERA_PORT = import.meta.env.VITE_CAMERA_PORT || '8080';

export interface SensorData {
  temperature: number | null;      // Will be null with KY-028 (threshold only)
  humidity: number | null;         // Not available with KY-028
  tempAlert: boolean;              // KY-028: true = above threshold
  light: number | null;            // Estimated 20-100 from LM393
  lightIsDark: boolean;            // LM393: true = dark
  motion: boolean;                 // PIR HC-SR501
  lastMotion: number | null;
  isConnected: boolean;
  lastUpdated: Date;
}

export interface HardwareStatus {
  sensorsConnected: boolean;
  cameraConnected: boolean;
  cameraUrl: string | null;
  isSimulation: boolean;
}

// Default sensor data when not connected
const DEFAULT_SENSOR_DATA: SensorData = {
  temperature: null,
  humidity: null,
  tempAlert: false,
  light: null,
  lightIsDark: false,
  motion: false,
  lastMotion: null,
  isConnected: false,
  lastUpdated: new Date(),
};

// Get sensor data from Raspberry Pi Flask API or simulation
export async function fetchSensorData(): Promise<SensorData> {
  // Return simulated data in simulation mode
  if (isSimulationMode()) {
    return generateSimulatedSensorData();
  }

  if (!PI_IP) {
    return { ...DEFAULT_SENSOR_DATA, lastUpdated: new Date() };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`http://${PI_IP}:${SENSOR_PORT}/sensors`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Sensor API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      temperature: typeof data.temperature === 'number' ? data.temperature : null,
      humidity: typeof data.humidity === 'number' ? data.humidity : null,
      tempAlert: Boolean(data.temp_alert),
      light: typeof data.light === 'number' ? data.light : null,
      lightIsDark: Boolean(data.light_is_dark),
      motion: Boolean(data.motion),
      lastMotion: typeof data.last_motion === 'number' ? data.last_motion : null,
      isConnected: true,
      lastUpdated: new Date(),
    };
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn('Failed to fetch sensor data:', error.message);
    }
    return { ...DEFAULT_SENSOR_DATA, lastUpdated: new Date() };
  }
}

// Check if camera is available
export async function checkCameraConnection(): Promise<boolean> {
  // In simulation mode, check if browser has camera
  if (isSimulationMode()) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  if (!PI_IP) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`http://${PI_IP}:${CAMERA_PORT}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// Get camera stream URL (null in simulation mode - use browser camera)
export function getCameraStreamUrl(): string | null {
  if (isSimulationMode()) {
    return null; // Will use browser camera
  }
  if (!PI_IP) return null;
  return `http://${PI_IP}:${CAMERA_PORT}/stream`;
}

// Get camera snapshot URL
export function getCameraSnapshotUrl(): string | null {
  if (isSimulationMode()) {
    return null; // Will use browser camera
  }
  if (!PI_IP) return null;
  return `http://${PI_IP}:${CAMERA_PORT}/snapshot`;
}

// Check if using browser camera (simulation mode)
export function useBrowserCamera(): boolean {
  return isSimulationMode();
}

// Get full hardware status
export async function getHardwareStatus(): Promise<HardwareStatus> {
  const [sensorData, cameraConnected] = await Promise.all([
    fetchSensorData(),
    checkCameraConnection(),
  ]);

  return {
    sensorsConnected: sensorData.isConnected,
    cameraConnected,
    cameraUrl: cameraConnected ? getCameraStreamUrl() : null,
    isSimulation: isSimulationMode(),
  };
}

// Polling hook helper with cleanup
export function createSensorPoller(
  interval: number = 5000,
  onData: (data: SensorData) => void,
  onError?: (error: Error) => void
): () => void {
  let isPolling = true;
  let timeoutId: ReturnType<typeof setTimeout>;

  const poll = async () => {
    if (!isPolling) return;

    try {
      const data = await fetchSensorData();
      if (isPolling) {
        onData(data);
      }
    } catch (error) {
      if (isPolling) {
        onError?.(error as Error);
      }
    }

    if (isPolling) {
      timeoutId = setTimeout(poll, interval);
    }
  };

  // Start polling
  poll();

  // Return cleanup function
  return () => {
    isPolling = false;
    clearTimeout(timeoutId);
  };
}

// Check if hardware is configured
export function isHardwareConfigured(): boolean {
  return Boolean(PI_IP) || isSimulationMode();
}
