import { useState, useRef, useCallback, useEffect } from "react";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error" | "disconnected";

export interface TranscriptionMessage {
  id: string;
  speaker: "Efa" | "You";
  text: string;
  timestamp: string;
  isLocal?: boolean;
  confidence?: number;
}

export interface VoiceChatState {
  connectionStatus: ConnectionStatus;
  isSessionActive: boolean;
  sessionId: string | null;
  transcription: TranscriptionMessage[];
}

export interface UseWebRTCVoiceProps {
  company: string;
  ainagerId?: string;
  enabled: boolean;
}

export function useWebRTCVoice({ company, ainagerId, enabled }: UseWebRTCVoiceProps) {
  const [state, setState] = useState<VoiceChatState>({
    connectionStatus: "idle",
    isSessionActive: false,
    sessionId: null,
    transcription: [],
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const stopSessionRef = useRef<(() => void) | null>(null);
  const hasReceivedWelcomeRef = useRef<boolean>(false);
  
  // ✅ SESSION TIMEOUT SAFEGUARDS - Prevents runaway costs
  const lastActivityTimeRef = useRef<number>(Date.now());
  // Track session start time for hard limit calculation
  const sessionStartTimeRef = useRef<number>(0);
  // Idle timeout: auto-disconnect after 8 minutes of no activity
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logActivity = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[useWebRTCVoice] ${timestamp} - ${message}`, data || '');
  }, []);

  const addTranscriptionMessage = useCallback((speaker: "Efa" | "You", text: string, isLocal?: boolean, confidence?: number) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: TranscriptionMessage = { 
      id, 
      speaker, 
      text, 
      timestamp, 
      isLocal: isLocal || false,
      confidence 
    };
    
    logActivity(`📝 Adding ${speaker} message: "${text}"${isLocal ? ' (local)' : ''}`);
    
    logActivity(`Adding transcription message`, { speaker, text: text.substring(0, 50) + '...', id });
    
    setState(prev => ({
      ...prev,
      transcription: [...prev.transcription, message],
    }));
  }, [logActivity]);

  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    logActivity(`Connection status changed`, { 
      previousStatus: state.connectionStatus, 
      newStatus: status 
    });
    setState(prev => ({ ...prev, connectionStatus: status }));
  }, [logActivity, state.connectionStatus]);

  // ✅ Reset activity timer whenever there's any activity
  // This keeps the session alive as long as user/AI are actively communicating
  const resetActivityTimer = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    
    // Clear and restart idle timeout (8 minutes)
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    idleTimeoutRef.current = setTimeout(() => {
      const idleMinutes = Math.floor((Date.now() - lastActivityTimeRef.current) / 1000 / 60);
      const totalMinutes = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000 / 60);
      
      // Check if session has exceeded 15 minutes total when becoming idle
      if (totalMinutes >= 15) {
        logActivity(`⏱️ Session auto-closed: 15-minute hard limit reached (${totalMinutes} minutes total, idle for ${idleMinutes} minutes)`);
        console.log(`[Cost Safeguard] Auto-disconnecting: session exceeded 15 minutes (${totalMinutes} min) and is now idle`);
      } else {
        logActivity(`⏱️ Session auto-closed: No activity for ${idleMinutes} minutes (idle timeout)`);
        console.log(`[Cost Safeguard] Auto-disconnecting due to ${idleMinutes} minutes of inactivity`);
      }
      // Use ref to avoid circular dependency
      if (stopSessionRef.current) {
        stopSessionRef.current();
      }
    }, 8 * 60 * 1000); // 8 minutes in milliseconds
  }, [logActivity]);

  // ✅ Clear all timeout timers to prevent memory leaks and phantom disconnects
  const clearAllTimeouts = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  const startSession = useCallback(async () => {
    try {
      logActivity("🚀 Starting voice session", { 
        company, 
        ainagerId
      });
      updateConnectionStatus("connecting");

      // Step 1: Get ephemeral client secret from our server
      logActivity("📡 Requesting ephemeral token from server", { 
        endpoint: "/api/session",
        payload: { 
          voice: "marin",
          model: "gpt-4o-realtime-preview-2024-10-01",
          company: company,
          ainagerId: ainagerId
        }
      });
      const sessionResponse = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          voice: "marin",
          model: "gpt-4o-realtime-preview-2024-10-01",
          company: company,
          ainagerId: ainagerId
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        logActivity("❌ Session request failed", { 
          status: sessionResponse.status, 
          error: errorData 
        });
        throw new Error(errorData.error || "Failed to get session token");
      }

      const { client_secret, session } = await sessionResponse.json();
      const tokenValue = client_secret.value || client_secret;
      logActivity("✅ Ephemeral token received", { 
        tokenPrefix: tokenValue.substring(0, 10) + '...',
        sessionId: session?.id 
      });

      // Step 2: Request microphone permission
      logActivity("🎤 Requesting microphone access", { 
        constraints: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        logActivity("✅ Microphone access granted", { 
          trackCount: localStreamRef.current.getTracks().length,
          audioTracks: localStreamRef.current.getAudioTracks().length
        });
      } catch (micError) {
        logActivity("❌ Microphone access denied", { error: micError instanceof Error ? micError.message : String(micError) });
        throw new Error("Microphone access denied. Please allow microphone access and try again.");
      }

      // Step 3: Create RTCPeerConnection
      logActivity("🔗 Creating WebRTC connection", { 
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      const pc = peerConnectionRef.current;

      // Step 4: Add local stream
      logActivity("📤 Adding local audio stream to peer connection", { 
        trackCount: localStreamRef.current.getTracks().length 
      });
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
      
      logActivity(`Local stream available: ${!!localStreamRef.current}`);
      logActivity(`Local stream tracks: ${localStreamRef.current?.getTracks().length || 0}`);

      // Step 5: Create data channel for events (optional but recommended)
      logActivity("📡 Creating data channel for OpenAI events");
      const dataChannel = pc.createDataChannel("oai-events");
      dataChannel.onopen = () => {
        logActivity("✅ Data channel opened successfully");
        
        // ✅ Start activity tracking when session begins
        // Record session start time for hard limit calculation
        sessionStartTimeRef.current = Date.now();
        resetActivityTimer();
        
        logActivity("🔄 Starting activity timer and session tracking", { 
          sessionStartTime: new Date(sessionStartTimeRef.current).toISOString()
        });
        
        // Send session configuration with instructions from server
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice: "marin",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            // DISABLED: input_audio_transcription (we use local Whisper instead)
            // input_audio_transcription: {
            //   model: "whisper-1"
            // },
            output_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              silence_duration_ms: 500
            }
          }
        };
        
        logActivity("📤 Sending session configuration", { 
          company,
          voice: "marin",
          config: sessionConfig
        });
        
        dataChannel.send(JSON.stringify(sessionConfig));
        logActivity(`✅ Session config sent for ${company}`);
      };
      
      dataChannel.onmessage = (event) => {
        // ✅ Any message received = activity detected, reset idle timer
        resetActivityTimer();
        
        try {
          const data = JSON.parse(event.data);
          
          // Only log important events to avoid spam
          if (data.type && (data.type.includes('input_audio') || data.type.includes('transcription'))) {
            logActivity(`🎤 Voice event: ${data.type}`);
          }
          
          // Handle different message types
          // DISABLED: OpenAI Realtime user transcription (we use local Whisper instead)
          if (data.type === "conversation.item.input_audio_transcription.completed") {
            // User speech transcribed - DISABLED to avoid duplicates with local Whisper
            const transcript = data.transcript;
            if (transcript) {
              logActivity(`🎤 OpenAI user transcription (DISABLED): "${transcript}"`);
              // addTranscriptionMessage("You", transcript); // DISABLED
            }
          } else if (data.type === "conversation.item.input_audio_transcription.failed") {
            logActivity("❌ ❌ User transcription failed", { error: data.error });
          } else if (data.type === "input_audio_buffer.speech_started") {
            logActivity("🎙️ 🎤 User started speaking - listening for voice input");
          } else if (data.type === "input_audio_buffer.speech_stopped") {
            logActivity("🎙️ 🔇 User stopped speaking - processing voice input");
          } else if (data.type === "conversation.item.input_audio_transcription.delta") {
            // User transcription in progress - DISABLED
            if (data.delta) {
              logActivity(`🎤 User transcript delta (DISABLED): ${data.delta}`);
            }
          } else if (data.type === "input_audio_buffer.committed") {
            // User audio buffer committed - this might be the correct event
            logActivity("🎙️ User audio buffer committed - processing transcription");
          } else if (data.type === "conversation.item.input_audio_transcription.started") {
            logActivity("🎤 User transcription started");
          } else if (data.type === "conversation.item.input_audio_transcription.done") {
            // Alternative completion event - DISABLED
            const transcript = data.transcript;
            if (transcript) {
              logActivity(`🎤 OpenAI user transcription done (DISABLED): "${transcript}"`);
              // addTranscriptionMessage("You", transcript); // DISABLED
            }
          } else if (data.type === "conversation.item.input_audio_transcription.created") {
            // Transcription created event
            logActivity(`🎤 User transcription created`);
          } else if (data.type === "conversation.item.input_audio_transcription.updated") {
            // Transcription updated event - DISABLED
            const transcript = data.transcript;
            if (transcript) {
              logActivity(`🎤 OpenAI user transcription updated (DISABLED): "${transcript}"`);
              // addTranscriptionMessage("You", transcript); // DISABLED
            }
          } else if (data.type === "response.audio_transcript.delta") {
            // AI response transcription in progress
            if (data.delta) {
              logActivity(`🤖 AI transcript delta`, { 
                delta: data.delta.substring(0, 50) + '...',
                deltaLength: data.delta.length
              });
            }
          } else if (data.type === "response.audio_transcript.done") {
            // AI response transcription completed
            const transcript = data.transcript;
            if (transcript) {
              logActivity(`🤖 AI transcript completed`, { 
                transcript: transcript.substring(0, 100) + '...',
                fullLength: transcript.length
              });
              addTranscriptionMessage("Efa", transcript);
              
              // First AI message received - update status to "connected"
              if (!hasReceivedWelcomeRef.current) {
                hasReceivedWelcomeRef.current = true;
                updateConnectionStatus("connected");
                logActivity("Welcome message received - connection ready");
              }
            }
          } else if (data.type === "input_audio_buffer.committed") {
            // User audio buffer committed - this triggers transcription
            logActivity("🎙️ User audio committed - requesting transcription");
          } else if (data.type === "conversation.item.input_audio_transcription.created") {
            // Transcription object created
            logActivity("🎤 User transcription object created");
          } else if (data.type === "conversation.item.input_audio_transcription.updated") {
            // Transcription updated with results
            if (data.transcript) {
              logActivity(`🎤 User transcription updated: "${data.transcript}"`);
              addTranscriptionMessage("You", data.transcript);
            }
          } else if (data.type === "response.done") {
            // AI response completed - check if we have a transcript
            logActivity(`✅ AI response completed`, { 
              hasResponse: !!data.response,
              hasOutput: !!(data.response && data.response.output),
              outputLength: data.response?.output?.length || 0
            });
            if (data.response && data.response.output && data.response.output.length > 0) {
              const lastOutput = data.response.output[data.response.output.length - 1];
              if (lastOutput.type === "message" && lastOutput.content) {
                // Extract text content from the response
                const textContent = lastOutput.content.find((item: any) => item.type === "text");
                if (textContent && textContent.text) {
                  logActivity(`📝 AI response text extracted`, { 
                    text: textContent.text.substring(0, 100) + '...',
                    textLength: textContent.text.length
                  });
                  addTranscriptionMessage("Efa", textContent.text);
                }
              }
            }
          } else if (data.type === "error") {
            logActivity(`Error: ${data.error?.message || 'Unknown error'}`);
          }
          
          // Simple fallback: Check for direct transcript property - DISABLED
          if (data.transcript && typeof data.transcript === 'string' && data.transcript.trim()) {
            logActivity(`🎤 Direct transcript found (DISABLED): "${data.transcript}"`);
            // addTranscriptionMessage("You", data.transcript); // DISABLED
          }
        } catch (error) {
          logActivity(`❌ Failed to parse data channel message`, { 
            rawData: event.data.substring(0, 200) + '...',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      };

      // Step 6: Handle incoming audio stream
      pc.ontrack = (event) => {
        logActivity("🔊 Received remote audio stream", { 
          streamCount: event.streams.length,
          trackCount: event.track ? 1 : 0,
          trackKind: event.track?.kind
        });
        // ✅ Audio received = activity detected
        resetActivityTimer();
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
          logActivity("✅ Audio stream assigned to audio element");
        }
      };

      // Step 7: Handle connection state changes
      pc.onconnectionstatechange = () => {
        logActivity(`🔗 Connection state changed`, { 
          newState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          iceGatheringState: pc.iceGatheringState
        });
        
        if (pc.connectionState === "connected") {
          // Keep status as "connecting" until AI's welcome message arrives
          // updateConnectionStatus will be called when first AI message is received
          setState(prev => ({ 
            ...prev, 
            isSessionActive: true, 
            sessionId: session.id || `sess_${Math.random().toString(36).substr(2, 9)}`,
          }));
          
          logActivity("🎉 WebRTC connection established successfully", { 
            sessionId: session.id,
            isSessionActive: true
          });
          
          logActivity("✅ WebRTC connection established, waiting for AI welcome message...");
        } else if (pc.connectionState === "failed") {
          updateConnectionStatus("error");
          logActivity("❌ WebRTC connection failed", { 
            iceConnectionState: pc.iceConnectionState,
            iceGatheringState: pc.iceGatheringState
          });
        }
      };

      // Step 8: Create offer and set local description
      logActivity("📋 Creating SDP offer", { 
        offerType: "offer",
        iceGatheringState: pc.iceGatheringState
      });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      logActivity("✅ Local description set", { 
        offerType: offer.type,
        sdpLength: offer.sdp?.length || 0
      });

      // Step 9: Send offer to OpenAI and get answer
      logActivity("📤 Sending offer to OpenAI", { 
        endpoint: "https://api.openai.com/v1/realtime",
        model: "gpt-4o-realtime-preview-2024-10-01",
        tokenPrefix: tokenValue.substring(0, 10) + '...'
      });
      const rtcResponse = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenValue}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!rtcResponse.ok) {
        const errorText = await rtcResponse.text();
        logActivity(`❌ OpenAI API Error`, { 
          status: rtcResponse.status,
          statusText: rtcResponse.statusText,
          errorText: errorText.substring(0, 200) + '...'
        });
        throw new Error(`OpenAI Realtime API error: ${rtcResponse.status} - ${errorText}`);
      }

      const answerSdp = await rtcResponse.text();
      logActivity("✅ Received SDP answer from OpenAI", { 
        answerLength: answerSdp.length,
        answerPrefix: answerSdp.substring(0, 100) + '...'
      });
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      logActivity("✅ Remote description set successfully");
      
      logActivity("🎉 WebRTC connection flow completed");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      logActivity(`❌ Connection failed`, { 
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack?.substring(0, 200) + '...' : undefined
      });
      updateConnectionStatus("error");
      
      // Cleanup on error - use ref to avoid circular dependency
      if (stopSessionRef.current) {
        logActivity("🧹 Cleaning up session due to error");
        stopSessionRef.current();
      }
    }
  }, [company, ainagerId, logActivity, updateConnectionStatus, addTranscriptionMessage, resetActivityTimer]);

  const stopSession = useCallback(() => {
    logActivity("🛑 Stopping session", { 
      currentStatus: state.connectionStatus,
      isSessionActive: state.isSessionActive,
      sessionId: state.sessionId
    });

    // ✅ Clear all timeout timers to prevent memory leaks
    clearAllTimeouts();
    
    // Reset welcome message flag for next session
    hasReceivedWelcomeRef.current = false;

    // Close peer connection
    if (peerConnectionRef.current) {
      logActivity("🔌 Closing peer connection", { 
        connectionState: peerConnectionRef.current.connectionState,
        iceConnectionState: peerConnectionRef.current.iceConnectionState
      });
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      const trackCount = localStreamRef.current.getTracks().length;
      logActivity("🎤 Stopping local audio stream", { trackCount });
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Reset audio element
    if (audioElementRef.current) {
      logActivity("🔊 Resetting audio element");
      audioElementRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      connectionStatus: "idle",
      isSessionActive: false,
      sessionId: null,
      latency: null,
      transcription: [],
      localTranscription: [],
    }));

    logActivity("✅ Session ended and cleaned up");
  }, [logActivity, clearAllTimeouts, state.connectionStatus, state.isSessionActive, state.sessionId]);

  // Update the ref whenever stopSession changes
  stopSessionRef.current = stopSession;

  const setAudioElement = useCallback((element: HTMLAudioElement) => {
    audioElementRef.current = element;
  }, []);

  // ✅ Cleanup on page unload/refresh to prevent orphaned sessions
  // This ensures timers are cleared and connections are closed properly
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (state.isSessionActive) {
        console.log("[Cost Safeguard] Cleaning up session on page unload");
        clearAllTimeouts();
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
        }
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also cleanup when component unmounts
      if (state.isSessionActive) {
        console.log("[Cost Safeguard] Cleaning up session on component unmount");
        clearAllTimeouts();
      }
    };
  }, [state.isSessionActive, clearAllTimeouts]);

  return {
    state,
    startSession,
    stopSession,
    setAudioElement,
    addTranscriptionMessage,
  };
}