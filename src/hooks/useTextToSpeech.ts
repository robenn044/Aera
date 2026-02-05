import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTextToSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  preferredVoice?: string;
  language?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useTextToSpeech({
  rate = 1,
  pitch = 1,
  volume = 1,
  preferredVoice = 'sq-AL-AnilaNeural',
  language = 'sq-AL',
  onStart,
  onEnd,
}: UseTextToSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechQueue = useRef<string[]>([]);
  const isProcessingQueue = useRef(false);

  // Load available voices
  useEffect(() => {
    setIsSupported('speechSynthesis' in window);

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Try to find the best voice
      // Priority: preferred voice > female English voice > any English voice > first voice
      const pref = preferredVoice?.toLowerCase();
      let voice: SpeechSynthesisVoice | undefined;

      if (pref) {
        voice = availableVoices.find(v => {
          const name = v.name?.toLowerCase() || '';
          const uri = v.voiceURI?.toLowerCase() || '';
          return (
            name.includes(pref) ||
            uri.includes(pref) ||
            (v.lang && v.lang.toLowerCase().includes(pref))
          );
        });
      }

      if (!voice) {
        // Look for Microsoft Zira (female) or similar female voices
        voice = availableVoices.find(v => 
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('female') ||
          (v.name.toLowerCase().includes('google') && v.lang.startsWith('en'))
        );
      }

      if (!voice) {
        // Fallback to any English voice
        voice = availableVoices.find(v => v.lang.startsWith('en'));
      }

      if (!voice && availableVoices.length > 0) {
        voice = availableVoices[0];
      }

      if (voice) {
        setSelectedVoice(voice);
        console.info(`[TTS] Selected voice: ${voice.name} | ${voice.lang} | ${voice.voiceURI}`);
        if (pref && !(voice.name.toLowerCase().includes(pref) || (voice.voiceURI && voice.voiceURI.toLowerCase().includes(pref)))) {
          console.warn(`[TTS] Preferred voice "${preferredVoice}" not found; using "${voice.name}" instead.`);
        }
      }

      if (!voice) {
        // Fallback to any English voice
        voice = availableVoices.find(v => v.lang.startsWith('en'));
      }

      if (!voice && availableVoices.length > 0) {
        voice = availableVoices[0];
      }

      if (voice) {
        setSelectedVoice(voice);
      }
    };

    loadVoices();

    // Some browsers load voices asynchronously
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [preferredVoice]);

  const processQueue = useCallback(() => {
    if (isProcessingQueue.current || speechQueue.current.length === 0) return;

    isProcessingQueue.current = true;
    const text = speechQueue.current.shift();

    if (!text) {
      isProcessingQueue.current = false;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      onStart?.();
    };

    utterance.onend = () => {
      isProcessingQueue.current = false;
      
      if (speechQueue.current.length > 0) {
        processQueue();
      } else {
        setIsSpeaking(false);
        onEnd?.();
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      isProcessingQueue.current = false;
      setIsSpeaking(false);
      
      // Try next in queue
      if (speechQueue.current.length > 0) {
        processQueue();
      } else {
        onEnd?.();
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [rate, pitch, volume, selectedVoice, onStart, onEnd]);

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    speechQueue.current = [];
    isProcessingQueue.current = false;

    // Split long text into sentences for better handling
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    speechQueue.current = sentences.map(s => s.trim()).filter(s => s.length > 0);

    processQueue();
  }, [isSupported, processQueue]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    speechQueue.current = [];
    isProcessingQueue.current = false;
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice: (voice: SpeechSynthesisVoice) => setSelectedVoice(voice),
  };
}
