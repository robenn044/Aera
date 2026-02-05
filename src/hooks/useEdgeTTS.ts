// AERA TTS Hook - Client side
// Connects to local Python server at port 5001
import { useState, useCallback, useRef, useEffect } from 'react';

// Configuration
const TTS_SERVER_PORT = 5001;

interface UseEdgeTTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  rate?: number; 
  pitch?: number;
  volume?: number;
}

export function useEdgeTTS({
  onStart,
  onEnd,
  onError,
}: UseEdgeTTSOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to get the correct URL dynamically
  const getApiUrl = useCallback(() => {
    // Default to localhost if window is undefined (SSR safety)
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:${TTS_SERVER_PORT}/api/tts`;
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text) return;

    try {
      stop();
      setIsSpeaking(true);
      onStart?.();
      
      const apiUrl = getApiUrl();
      console.log(`[TTS] Requesting audio: "${text.slice(0, 20)}..." -> ${apiUrl}`);

      abortControllerRef.current = new AbortController();
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TTS] Server Error ${response.status}:`, errorText);
        throw new Error(`Server Error (${response.status})`);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Received empty audio blob");
      console.log(`[TTS] Audio received: ${blob.size} bytes`);

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Ensure we clean up the URL when done
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
      };

      audio.onended = () => {
        cleanup();
        onEnd?.();
      };

      audio.onerror = (e) => {
        console.error("[TTS] Audio Object Error:", e);
        cleanup();
        onError?.("Playback failed");
      };

      // Attempt playback
      await audio.play().catch(e => {
        console.error("[TTS] Autoplay blocked:", e);
        onError?.("Autoplay blocked - Click page to enable audio");
        setIsSpeaking(false);
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      
      console.error("[TTS] Fetch Error:", error);
      setIsSpeaking(false);
      onError?.(error instanceof Error ? error.message : "Unknown TTS Error");
    }
  }, [getApiUrl, onStart, onEnd, onError, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported: true
  };
}