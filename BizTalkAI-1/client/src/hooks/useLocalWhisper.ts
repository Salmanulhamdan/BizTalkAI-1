import { useState, useRef, useCallback } from "react";

export interface LocalTranscription {
  id: string;
  text: string;
  timestamp: string;
  confidence?: number;
  isFinal: boolean;
}

export interface UseLocalWhisperProps {
  enabled: boolean;
  onTranscriptionUpdate: (transcription: LocalTranscription) => void;
}

export function useLocalWhisper({ enabled, onTranscriptionUpdate }: UseLocalWhisperProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Configuration
  const SILENCE_THRESHOLD = 3000; // 3 seconds of silence before processing
  const MIN_AUDIO_LENGTH = 500; // Minimum 0.5 second of audio before processing
  const MAX_AUDIO_LENGTH = 15000; // Maximum 15 seconds of audio

  const logActivity = useCallback((message: string) => {
    console.log(`[LocalWhisper] ${message}`);
  }, []);

  const processAudioWithWhisper = useCallback(async (audioBlob: Blob) => {
    if (!enabled) {
      logActivity("Local Whisper disabled, skipping transcription");
      return;
    }
    
    setIsProcessing(true);
    logActivity(`Processing audio with local Whisper... (${audioBlob.size} bytes, ${audioBlob.type})`);
    
    try {
      // Create FormData for the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('language', 'en'); // You can make this configurable
      
      logActivity("Sending request to /api/whisper/transcribe...");
      
      // Call your backend endpoint that proxies to OpenAI Whisper
      const response = await fetch('/api/whisper/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      logActivity(`Response received: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logActivity(`Error response: ${errorText}`);
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      logActivity(`Whisper result:`, result);
      
      if (result.text && result.text.trim()) {
        const transcription: LocalTranscription = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: result.text.trim(),
          timestamp: new Date().toLocaleTimeString(),
          confidence: result.segments?.[0]?.avg_logprob ? Math.exp(result.segments[0].avg_logprob) : undefined,
          isFinal: true
        };
        
        logActivity(`Local transcription successful: "${transcription.text}"`);
        onTranscriptionUpdate(transcription);
      } else {
        logActivity("No transcription text received from Whisper API");
      }
    } catch (error) {
      logActivity(`Local transcription error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Local Whisper error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [enabled, onTranscriptionUpdate, logActivity]);

  const startRecording = useCallback(async (stream: MediaStream) => {
    if (!enabled || isRecording) {
      logActivity(`Recording skipped - enabled: ${enabled}, isRecording: ${isRecording}`);
      return;
    }
    
    try {
      logActivity("Starting MediaRecorder...");
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Check if MediaRecorder supports the preferred format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        logActivity("Falling back to audio/webm format");
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        logActivity("Falling back to audio/mp4 format");
      }
      
      // Create MediaRecorder with high quality settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });
      
      logActivity(`MediaRecorder created with mimeType: ${mimeType}`);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          logActivity(`Audio chunk received: ${event.data.size} bytes`);
        }
      };
      
      mediaRecorder.onstop = () => {
        logActivity("MediaRecorder stopped, processing audio...");
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          logActivity(`Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
          
          // Only process if audio is long enough
          if (audioBlob.size > 0) {
            // Estimate duration (rough approximation)
            const estimatedDuration = (audioBlob.size / 128000) * 1000; // Rough estimate in ms
            
            if (estimatedDuration >= MIN_AUDIO_LENGTH) {
              logActivity(`Processing audio blob (${estimatedDuration}ms estimated duration)`);
              processAudioWithWhisper(audioBlob);
            } else {
              logActivity(`Audio too short (${estimatedDuration}ms), skipping transcription`);
            }
          } else {
            logActivity("Audio blob is empty, skipping transcription");
          }
        } else {
          logActivity("No audio chunks available, skipping transcription");
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      logActivity("Local recording started");
      
      // Set up silence detection
      const resetSilenceTimer = () => {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        silenceTimeoutRef.current = setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            logActivity("Silence detected, stopping local recording");
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
        }, SILENCE_THRESHOLD);
      };
      
      resetSilenceTimer();
      
      // Set maximum recording time
      processingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          logActivity("Maximum recording time reached, stopping local recording");
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, MAX_AUDIO_LENGTH);
      
    } catch (error) {
      logActivity(`Failed to start local recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [enabled, isRecording, processAudioWithWhisper, logActivity]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      logActivity("Local recording stopped");
    }
    
    // Clear timeouts
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, [logActivity]);

  const cleanup = useCallback(() => {
    stopRecording();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsProcessing(false);
    
    logActivity("Local Whisper cleanup completed");
  }, [stopRecording, logActivity]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    cleanup
  };
}
