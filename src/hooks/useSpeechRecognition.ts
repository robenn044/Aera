import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onWakeWord?: () => void;
  wakeWords?: string[];
}

const WAKE_WORDS = [
  'hello aera',
  'hey aera',
  'hi aera',
  'përshëndetje aera',
  'pershendetje aera',
  'tungjatjeta aera',
];

export function useSpeechRecognition({
  language = 'sq-AL',
  continuous = true,
  onResult,
  onWakeWord,
  wakeWords = WAKE_WORDS,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isActivelyListening = useRef(false);
  const wakeWordDetected = useRef(false);

  // Check for browser support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;
    }
  }, [continuous, language]);

  const checkForWakeWord = useCallback((text: string): boolean => {
    const normalized = text.toLowerCase().trim();
    return wakeWords.some(word => normalized.includes(word.toLowerCase()));
  }, [wakeWords]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    // Prevent starting if already listening
    if (isActivelyListening.current) {
      console.debug('Speech recognition already active, skipping start');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    wakeWordDetected.current = false;

    recognitionRef.current.onstart = () => {
      isActivelyListening.current = true;
      setIsListening(true);
    };

    recognitionRef.current.onend = () => {
      isActivelyListening.current = false;
      setIsListening(false);
      // Auto-restart for continuous listening (wake word mode)
      if (continuous && !wakeWordDetected.current) {
        setTimeout(() => {
          if (recognitionRef.current && !isActivelyListening.current) {
            try {
              isActivelyListening.current = true;
              recognitionRef.current.start();
            } catch (e) {
              // Already started or other error - reset flag
              isActivelyListening.current = false;
            }
          }
        }, 200);
      }
    };

    recognitionRef.current.onerror = (event) => {
      // Only log real errors, not expected ones
      if (event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'network') {
        setError(event.error);
        console.error('Speech recognition error:', event.error);
      }
      isActivelyListening.current = false;
      setIsListening(false);
    };

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          currentInterim += result[0].transcript;
        }
      }

      if (currentInterim) {
        setInterimTranscript(currentInterim);
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript('');
        
        // Check for wake word
        if (!wakeWordDetected.current && checkForWakeWord(finalTranscript)) {
          wakeWordDetected.current = true;
          onWakeWord?.();
        }
        
        onResult?.(finalTranscript, true);
      } else if (currentInterim) {
        // Check for wake word in interim results too
        if (!wakeWordDetected.current && checkForWakeWord(currentInterim)) {
          wakeWordDetected.current = true;
          onWakeWord?.();
        }
        
        onResult?.(currentInterim, false);
      }
    };

    try {
      // Set flag before starting to prevent race conditions
      isActivelyListening.current = true;
      recognitionRef.current.start();
    } catch (e) {
      // Handle "already started" error gracefully
      if (e instanceof Error && e.name === 'InvalidStateError') {
        console.debug('Speech recognition was already running');
      } else {
        console.error('Failed to start speech recognition:', e);
        setError('Failed to start');
        isActivelyListening.current = false;
      }
    }
  }, [continuous, checkForWakeWord, onResult, onWakeWord]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      isActivelyListening.current = false;
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    wakeWordDetected.current = false;
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
