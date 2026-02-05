// AERA Speech-to-Text Hook (Groq Whisper)
// Features: VAD (Voice Activity Detection), Silence Auto-Stop, and Volume Monitoring

import { useState, useCallback, useRef, useEffect } from 'react';

const SERVER_URL = `http://${window.location.hostname || 'localhost'}:5001/api/stt`;

// VAD Configuration
const VAD_THRESHOLD = 20;        // Volume level (0-255) to consider as "speech"
const SILENCE_DURATION = 1500;   // Wait 1.5s of silence before stopping

export interface UseGroqSTTResult {
  isListening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}

export function useGroqSTT(): UseGroqSTTResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // VAD Refs (Voice Activity Detection)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const lastSpeechTimeRef = useRef<number>(0);
  const isSpeechDetectedRef = useRef<boolean>(false);

  // Cleanup audio resources
  const cleanupAudio = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      cleanupAudio(); // Ensure clean state
      setError(null);
      setTranscript('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // --- VAD SETUP (Silence Detection) ---
      // We use the Web Audio API to analyze volume in real-time
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      
      // Reset logic
      lastSpeechTimeRef.current = 0;
      isSpeechDetectedRef.current = false;

      // --- RECORDER SETUP ---
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Release mic
        stream.getTracks().forEach(track => track.stop()); 
        setIsListening(false);

        // Only process if we actually detected speech to save API calls
        if (isSpeechDetectedRef.current && audioBlob.size > 1000) {
           await processAudio(audioBlob);
        } else {
           console.log('[STT] Ignored: Silence/Noise only.');
           // If we ignored it, we might want to signal that so the app can restart listening
           // But simply not setting transcript is usually enough
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      console.log('[STT] Listening with Auto-Stop...');

      // --- VAD LOOP ---
      const checkVolume = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;

        const now = Date.now();

        // 1. Detect Speech Start
        if (average > VAD_THRESHOLD) {
          if (!isSpeechDetectedRef.current) {
            console.log('[STT] Speech detected!');
          }
          isSpeechDetectedRef.current = true;
          lastSpeechTimeRef.current = now;
        }

        // 2. Detect Silence AFTER Speech
        if (isSpeechDetectedRef.current) {
            const timeSinceSpeech = now - lastSpeechTimeRef.current;
            if (timeSinceSpeech > SILENCE_DURATION) {
                console.log('[STT] Silence detected. Stopping...');
                stopListening();
                return; // End loop
            }
        } else {
            // OPTIONAL: Timeout if no speech is detected at all for 10 seconds?
            // For now, we let it run until manual stop or page reload to support lock screen waiting.
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();

    } catch (err) {
      console.error('[STT] Init Error:', err);
      setError('Microphone access denied');
      setIsListening(false);
    }
  }, [cleanupAudio]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const processAudio = async (audioBlob: Blob) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return setError('Missing API Key');

    const formData = new FormData();
    formData.append('file', audioBlob);

    try {
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'x-groq-key': apiKey },
            body: formData
        });

        if (!response.ok) throw new Error(`Server ${response.status}`);

        const data = await response.json();
        if (data.text) {
            const cleanText = data.text.trim();
            console.log(`[STT] Transcript: "${cleanText}"`);
            // Only set transcript if it's not empty
            if (cleanText.length > 0) {
                setTranscript(cleanText);
            }
        }
    } catch (err) {
        console.error('[STT] Upload Error:', err);
        setError('Transcription failed');
    }
  };

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    error
  };
}