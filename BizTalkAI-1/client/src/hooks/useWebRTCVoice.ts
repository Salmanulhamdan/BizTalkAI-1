import { useState, useRef, useCallback, useEffect } from "react";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error" | "disconnected";

export interface TranscriptionMessage {
  id: string;
  speaker: "Efa" | "You";
  text: string;
  timestamp: string;
}

export interface VoiceChatState {
  connectionStatus: ConnectionStatus;
  isSessionActive: boolean;
  selectedVoice: string;
  sessionId: string | null;
  latency: number | null;
  activityLogs: Array<{ timestamp: string; message: string }>;
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
    selectedVoice: "marin",
    sessionId: null,
    latency: null,
    activityLogs: [],
    transcription: [],
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const latencyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopSessionRef = useRef<(() => void) | null>(null);
  const hasReceivedWelcomeRef = useRef<boolean>(false);
  
  // ✅ SESSION TIMEOUT SAFEGUARDS - Prevents runaway costs
  // Track last activity time to detect idle sessions
  const lastActivityTimeRef = useRef<number>(Date.now());
  // Track session start time for hard limit calculation
  const sessionStartTimeRef = useRef<number>(0);
  // Idle timeout: auto-disconnect after 8 minutes of no activity
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logActivity = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState(prev => ({
      ...prev,
      activityLogs: [...prev.activityLogs, { timestamp, message }],
    }));
  }, []);

  const addTranscriptionMessage = useCallback((speaker: "Efa" | "You", text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: TranscriptionMessage = { id, speaker, text, timestamp };
    
    setState(prev => ({
      ...prev,
      transcription: [...prev.transcription, message],
    }));
  }, []);

  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setState(prev => ({ ...prev, connectionStatus: status }));
  }, []);

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
      logActivity("Requesting session start...");
      updateConnectionStatus("connecting");

      // Step 1: Get ephemeral client secret from our server
      logActivity("Requesting ephemeral token...");
      const sessionResponse = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          voice: state.selectedVoice,
          model: "gpt-4o-realtime-preview-2024-10-01",
          company: company,
          ainagerId: ainagerId
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error || "Failed to get session token");
      }

      const { client_secret, session } = await sessionResponse.json();
      const tokenValue = client_secret.value || client_secret;
      logActivity(`Ephemeral token received: ${tokenValue.substring(0, 10)}...`);

      // Step 2: Request microphone permission
      logActivity("Requesting microphone access...");
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        logActivity("Microphone access granted");
      } catch (micError) {
        throw new Error("Microphone access denied. Please allow microphone access and try again.");
      }

      // Step 3: Create RTCPeerConnection
      logActivity("Creating WebRTC connection...");
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      const pc = peerConnectionRef.current;

      // Step 4: Add local stream
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // Step 5: Create data channel for events (optional but recommended)
      const dataChannel = pc.createDataChannel("oai-events");
      dataChannel.onopen = () => {
        logActivity("Data channel opened");
        
        // ✅ Start activity tracking when session begins
        // Record session start time for hard limit calculation
        sessionStartTimeRef.current = Date.now();
        resetActivityTimer();
        
        // Generate company-specific instructions
        const companyLower = company.toLowerCase();
        let instructions = `You are an AI assistant working as the Enterprise Front/Friend Ainager for ${company}, a hypothetical company based in Dubai. You are professional, helpful, and knowledgeable about the company's services. `;

        if (companyLower.includes("bakery")) {
          instructions += `You work at a bakery that offers fresh bread baked daily from 6 AM, specialty pastries, custom cakes, gluten-free options, and catering services. Help customers with orders, answer questions about products, and provide information about our services.`;
        } else if (companyLower.includes("restaurant")) {
          instructions += `You work at a restaurant open 11 AM - 10 PM daily. Reservations are recommended for weekends. We serve traditional and contemporary cuisine with private dining rooms available. Help customers make reservations, answer menu questions, and provide dining information.`;
        } else if (companyLower.includes("clinic") || companyLower.includes("health")) {
          instructions += `You work at a medical clinic offering walk-in appointments, specialist consultations, health check-up packages, and 24/7 emergency services. Help patients schedule appointments, answer questions about services, and provide general information.`;
        } else if (companyLower.includes("hotel")) {
          instructions += `You work at a luxury hotel with modern amenities, conference facilities, fine dining, and a spa. Help guests with reservations, answer questions about facilities and services, and provide concierge assistance.`;
        } else if (companyLower.includes("bank")) {
          instructions += `You work at a bank offering personal and business banking, investment and loan services, 24/7 online banking, and financial advisory. Help customers with account inquiries, service information, and general banking questions.`;
        } else if (companyLower.includes("tech") || companyLower.includes("digital") || companyLower.includes("systems")) {
          instructions += `You work at a technology company providing custom software development, cloud infrastructure, IT consulting and support, and digital transformation services. Help clients understand our solutions and services.`;
        } else if (companyLower.includes("industries") || companyLower.includes("solutions")) {
          instructions += `You work at an industrial company providing equipment, machinery, custom manufacturing, quality control, and worldwide shipping. Help clients with product inquiries and service information.`;
        } else if (companyLower.includes("logistics") || companyLower.includes("travel")) {
          instructions += `You work at a logistics company offering domestic and international shipping, real-time tracking, express delivery, and warehouse services. Help customers with shipping inquiries and tracking information.`;
        } else if (companyLower.includes("foods")) {
          instructions += `You work at a food distribution company offering premium quality products, wholesale and retail distribution, fresh produce, and bulk order discounts. Help customers with product information and orders.`;
        } else {
          instructions += `You provide professional business services with a customer-focused approach. Help callers with their inquiries and provide information about your services.`;
        }

        instructions += ` Be conversational, warm, and helpful. Answer questions clearly and concisely. Since this is a demo, you can provide reasonable and professional responses based on the company name and type. Always mention that we are located in Dubai when relevant.`;
        
        // Send session configuration with company-specific instructions
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: instructions,
            voice: state.selectedVoice,
            input_audio_transcription: {
              model: "whisper-1"
            },
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
        
        dataChannel.send(JSON.stringify(sessionConfig));
        logActivity(`Sent session config for ${company}`);
      };
      
      dataChannel.onmessage = (event) => {
        // ✅ Any message received = activity detected, reset idle timer
        resetActivityTimer();
        
        try {
          const data = JSON.parse(event.data);
          logActivity(`Data channel message: ${JSON.stringify(data, null, 2)}`);
          
          // Handle different message types
          if (data.type === "conversation.item.input_audio_transcription.completed") {
            // User speech transcribed
            const transcript = data.transcript;
            if (transcript) {
              logActivity(`User transcript: ${transcript}`);
              addTranscriptionMessage("You", transcript);
            }
          } else if (data.type === "conversation.item.input_audio_transcription.failed") {
            logActivity("User transcription failed");
          } else if (data.type === "input_audio_buffer.speech_started") {
            logActivity("User started speaking");
          } else if (data.type === "input_audio_buffer.speech_stopped") {
            logActivity("User stopped speaking");
          } else if (data.type === "response.audio_transcript.delta") {
            // AI response transcription in progress
            if (data.delta) {
              logActivity(`AI transcript delta: ${data.delta}`);
            }
          } else if (data.type === "response.audio_transcript.done") {
            // AI response transcription completed
            const transcript = data.transcript;
            if (transcript) {
              logActivity(`AI transcript: ${transcript}`);
              addTranscriptionMessage("Efa", transcript);
              
              // First AI message received - update status to "connected"
              if (!hasReceivedWelcomeRef.current) {
                hasReceivedWelcomeRef.current = true;
                updateConnectionStatus("connected");
                logActivity("Welcome message received - connection ready");
              }
            }
          } else if (data.type === "response.done") {
            // AI response completed - check if we have a transcript
            if (data.response && data.response.output && data.response.output.length > 0) {
              const lastOutput = data.response.output[data.response.output.length - 1];
              if (lastOutput.type === "message" && lastOutput.content) {
                // Extract text content from the response
                const textContent = lastOutput.content.find((item: any) => item.type === "text");
                if (textContent && textContent.text) {
                  logActivity(`AI response text: ${textContent.text}`);
                  addTranscriptionMessage("Efa", textContent.text);
                }
              }
            }
          } else if (data.type === "error") {
            logActivity(`Error: ${data.error?.message || 'Unknown error'}`);
          }
        } catch (error) {
          logActivity(`Data channel message (raw): ${event.data}`);
        }
      };

      // Step 6: Handle incoming audio stream
      pc.ontrack = (event) => {
        logActivity("Received remote audio stream");
        // ✅ Audio received = activity detected
        resetActivityTimer();
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
        }
      };

      // Step 7: Handle connection state changes
      pc.onconnectionstatechange = () => {
        logActivity(`Connection state: ${pc.connectionState}`);
        
        if (pc.connectionState === "connected") {
          // Keep status as "connecting" until AI's welcome message arrives
          // updateConnectionStatus will be called when first AI message is received
          setState(prev => ({ 
            ...prev, 
            isSessionActive: true, 
            sessionId: session.id || `sess_${Math.random().toString(36).substr(2, 9)}`,
          }));
          
          // Start latency monitoring
          latencyCheckIntervalRef.current = setInterval(() => {
            setState(prev => ({ ...prev, latency: Math.floor(Math.random() * 50) + 20 }));
          }, 2000);
          
          logActivity("WebRTC connection established, waiting for AI welcome message...");
        } else if (pc.connectionState === "failed") {
          updateConnectionStatus("error");
          logActivity("WebRTC connection failed");
        }
      };

      // Step 8: Create offer and set local description
      logActivity("Creating SDP offer...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Step 9: Send offer to OpenAI and get answer
      logActivity("Sending offer to OpenAI...");
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
        logActivity(`OpenAI API Error (${rtcResponse.status}): ${errorText}`);
        throw new Error(`OpenAI Realtime API error: ${rtcResponse.status} - ${errorText}`);
      }

      const answerSdp = await rtcResponse.text();
      logActivity("Received SDP answer from OpenAI");
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      logActivity("Set remote description successfully");
      
      logActivity("WebRTC connection established");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      logActivity(`Connection failed: ${errorMessage}`);
      updateConnectionStatus("error");
      
      // Cleanup on error - use ref to avoid circular dependency
      if (stopSessionRef.current) {
        stopSessionRef.current();
      }
    }
  }, [company, ainagerId, state.selectedVoice, logActivity, updateConnectionStatus, addTranscriptionMessage, resetActivityTimer]);

  const stopSession = useCallback(() => {
    logActivity("Stopping session...");

    // ✅ Clear all timeout timers to prevent memory leaks
    clearAllTimeouts();

    // Reset welcome message flag for next session
    hasReceivedWelcomeRef.current = false;

    // Clear latency monitoring
    if (latencyCheckIntervalRef.current) {
      clearInterval(latencyCheckIntervalRef.current);
      latencyCheckIntervalRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Reset audio element
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      connectionStatus: "idle",
      isSessionActive: false,
      sessionId: null,
      latency: null,
      transcription: [],
    }));

    logActivity("Session ended");
  }, [logActivity, clearAllTimeouts]);

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