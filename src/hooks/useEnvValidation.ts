import { useEffect, useState } from 'react';
import { validateEnv, EnvConfig } from '@/lib/env';
import { useToast } from '@/hooks/use-toast';

interface EnvValidationState {
  isLoading: boolean;
  isValid: boolean;
  config: EnvConfig | null;
  warnings: string[];
  errors: string[];
}

/**
 * Hook to validate environment variables on app startup
 * Shows toast notifications for warnings and errors
 */
export function useEnvValidation() {
  const { toast } = useToast();
  const [state, setState] = useState<EnvValidationState>({
    isLoading: true,
    isValid: false,
    config: null,
    warnings: [],
    errors: [],
  });

  useEffect(() => {
    const result = validateEnv();

    setState({
      isLoading: false,
      isValid: result.isValid,
      config: result.config,
      warnings: result.warnings,
      errors: result.errors,
    });

    // Show warnings
    result.warnings.forEach((warning) => {
      console.warn('[AERA Config]', warning);
      toast({
        title: 'Paralajmërim konfigurimi',
        description: warning,
        variant: 'default',
      });
    });

    // Show errors
    result.errors.forEach((error) => {
      console.error('[AERA Config]', error);
      toast({
        title: 'Gabim konfigurimi',
        description: error,
        variant: 'destructive',
      });
    });

    // Log successful config
    if (result.isValid && result.warnings.length === 0) {
      console.info('[AERA] Environment configuration validated successfully');
    }
  }, [toast]);

  return state;
}
