// Environment variable validation for AERA Smart Mirror
// Updated for Groq Integration

export interface EnvConfig {
  groqApiKey: string | null;
  raspberryPiIp: string | null;
  sensorPort: string;
  cameraPort: string;
  simulationMode: boolean;
}

interface EnvValidationResult {
  isValid: boolean;
  config: EnvConfig;
  warnings: string[];
  errors: string[];
}

export function validateEnv(): EnvValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Migrate to Groq Key
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || null;
  const raspberryPiIp = import.meta.env.VITE_RASPBERRY_PI_IP || null;
  const sensorPort = import.meta.env.VITE_SENSOR_PORT || '5000';
  const cameraPort = import.meta.env.VITE_CAMERA_PORT || '8080';
  const simulationMode = import.meta.env.VITE_SIMULATION_MODE === 'true';

  // Check API Key
  if (!groqApiKey) {
    errors.push('VITE_GROQ_API_KEY is missing. Please get a free key from console.groq.com');
  } else if (!groqApiKey.startsWith('gsk_')) {
    warnings.push('API Key does not look like a standard Groq key (starts with gsk_).');
  }

  // Check Hardware config
  if (!raspberryPiIp && !simulationMode) {
    warnings.push('VITE_RASPBERRY_PI_IP is not set. Hardware features disabled.');
  }
  
  if (simulationMode) {
    console.info('[AERA] Running in SIMULATION MODE');
  }

  const config: EnvConfig = {
    groqApiKey,
    raspberryPiIp,
    sensorPort,
    cameraPort,
    simulationMode,
  };

  return {
    isValid: errors.length === 0,
    config,
    warnings,
    errors,
  };
}

export function getEnvConfig(): EnvConfig {
  return {
    groqApiKey: import.meta.env.VITE_GROQ_API_KEY || null,
    raspberryPiIp: import.meta.env.VITE_RASPBERRY_PI_IP || null,
    sensorPort: import.meta.env.VITE_SENSOR_PORT || '5000',
    cameraPort: import.meta.env.VITE_CAMERA_PORT || '8080',
    simulationMode: import.meta.env.VITE_SIMULATION_MODE === 'true',
  };
}