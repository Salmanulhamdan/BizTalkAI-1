import { X, Mic, MicOff, Volume2, VolumeX, Phone, Clock, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useWebRTCVoice } from "@/hooks/useWebRTCVoice";

import { type Ainager } from "@shared/schema";

interface VoiceModalProps {
  ainager: Ainager;
  isOpen: boolean;
  onClose: () => void;
}

const getCompanyContent = (company: string) => {
  const companyLower = company.toLowerCase();
  
  if (companyLower.includes("bakery")) {
    return {
      greeting: "Hello! Welcome to our bakery. How can I help you today?",
      info: [
        "Fresh bread baked daily from 6 AM",
        "Specialty pastries and custom cakes available",
        "Gluten-free options on request",
        "Catering services for events"
      ]
    };
  } else if (companyLower.includes("restaurant")) {
    return {
      greeting: "Good day! Thank you for calling. What can I do for you?",
      info: [
        "Open 11 AM - 10 PM daily",
        "Reservations recommended for weekends",
        "Traditional and contemporary cuisine",
        "Private dining rooms available"
      ]
    };
  } else if (companyLower.includes("clinic") || companyLower.includes("health")) {
    return {
      greeting: "Hello, you've reached our clinic. How may I assist you?",
      info: [
        "Walk-in appointments welcome",
        "Specialist consultations available",
        "Health check-up packages offered",
        "Emergency services 24/7"
      ]
    };
  } else if (companyLower.includes("hotel")) {
    return {
      greeting: "Welcome! Thank you for contacting us. How can I help?",
      info: [
        "Luxury accommodations with modern amenities",
        "Conference facilities for business events",
        "Fine dining restaurant on premises",
        "Spa and wellness center available"
      ]
    };
  } else if (companyLower.includes("bank")) {
    return {
      greeting: "Hello! You've reached our banking services. What can I help you with?",
      info: [
        "Personal and business banking solutions",
        "Investment and loan services",
        "24/7 online banking available",
        "Financial advisory services"
      ]
    };
  } else if (companyLower.includes("tech") || companyLower.includes("digital") || companyLower.includes("systems")) {
    return {
      greeting: "Hi there! Welcome to our tech solutions. How can I assist?",
      info: [
        "Custom software development",
        "Cloud infrastructure solutions",
        "IT consulting and support",
        "Digital transformation services"
      ]
    };
  } else if (companyLower.includes("industries") || companyLower.includes("solutions")) {
    return {
      greeting: "Hello! Thank you for reaching out. What can I do for you?",
      info: [
        "Industrial equipment and machinery",
        "Custom manufacturing solutions",
        "Quality control and testing",
        "Worldwide shipping available"
      ]
    };
  } else if (companyLower.includes("logistics") || companyLower.includes("travel")) {
    return {
      greeting: "Welcome! How can we help with your logistics needs today?",
      info: [
        "Domestic and international shipping",
        "Real-time package tracking",
        "Express delivery options",
        "Warehouse and distribution services"
      ]
    };
  } else if (companyLower.includes("foods")) {
    return {
      greeting: "Hello! Welcome to our food services. What can I help you with?",
      info: [
        "Premium quality food products",
        "Wholesale and retail distribution",
        "Fresh produce delivered daily",
        "Bulk order discounts available"
      ]
    };
  } else {
    return {
      greeting: "Hello! Thank you for calling. How may I assist you today?",
      info: [
        "Professional business services",
        "Customer-focused solutions",
        "Quality guaranteed",
        "Serving the community since years"
      ]
    };
  }
};

export default function VoiceModal({ ainager, isOpen, onClose }: VoiceModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [sessionDuration, setSessionDuration] = useState(0);
  const transcriptionEndRef = useRef<HTMLDivElement>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    state,
    startSession,
    stopSession,
    setAudioElement,
    addTranscriptionMessage
  } = useWebRTCVoice({
    company: ainager.ainagerName,
    ainagerId: ainager.ainagerId,
    enabled: isOpen,
  });

  // Enhanced log function for debugging voice flow
  const logActivity = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[VoiceModal] ${timestamp} - ${message}`, data || '');
  };

  // Set up audio element for playback
  useEffect(() => {
    logActivity("Setting up audio element for playback");
    const audioElement = document.createElement('audio');
    audioElement.autoplay = true;
    audioElement.preload = 'auto';
    audioElement.controls = false;
    audioElement.style.display = 'none';
    
    // Add to DOM so it can play audio
    document.body.appendChild(audioElement);
    setAudioElement(audioElement);
    logActivity("Audio element created and added to DOM", { autoplay: true, preload: 'auto' });
    
    return () => {
      logActivity("Cleaning up audio element");
      audioElement.pause();
      audioElement.srcObject = null;
      document.body.removeChild(audioElement);
    };
  }, [setAudioElement]);

  // Removed auto-start - user must click the green call button to connect

  // Add demo messages when session is connected (only for testing)
  useEffect(() => {
    if (state.connectionStatus === "connected" && state.transcription.length === 0) {
      // Don't add automatic greeting - let the real transcription handle it
      logActivity("Session connected - ready for real-time transcription", { 
        connectionStatus: state.connectionStatus,
        transcriptionCount: state.transcription.length 
      });
    }
  }, [state.connectionStatus, state.transcription.length, addTranscriptionMessage]);

  // Demo function to simulate user input
  const simulateUserInput = () => {
    const userMessages = [
      "Hi, I'd like to make a reservation",
      "What are your opening hours?",
      "Do you have vegetarian options?",
      "Can I get a table for 4 people?",
      "What's your address?"
    ];
    const randomMessage = userMessages[Math.floor(Math.random() * userMessages.length)];
    addTranscriptionMessage("You", randomMessage);
    
    // Simulate Efa response after a delay
    setTimeout(() => {
      const efaResponses = [
        "Of course! I'd be happy to help you with that reservation.",
        "We're open from 11 AM to 10 PM daily.",
        "Yes, we have several delicious vegetarian options on our menu.",
        "Absolutely! Let me check availability for 4 people.",
        "We're located at 123 Main Street, Dubai."
      ];
      const randomResponse = efaResponses[Math.floor(Math.random() * efaResponses.length)];
      addTranscriptionMessage("Efa", randomResponse);
    }, 1000);
  };


  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    transcriptionEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.transcription]);

  // Session duration timer
  useEffect(() => {
    if (state.connectionStatus === "connected") {
      setSessionDuration(0);
      sessionTimerRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      if (state.connectionStatus === "idle") {
        setSessionDuration(0);
      }
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [state.connectionStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  if (!isOpen) return null;

  const companyInitial = ainager.ainagerName.charAt(0).toUpperCase();
  const content = getCompanyContent(ainager.ainagerName);

  // Determine visual state based on connection state
  const visualState = state.connectionStatus === "connecting" 
    ? "connecting"
    : state.connectionStatus === "error"
    ? "error"
    : state.connectionStatus === "connected"
    ? "connected"
    : "idle";

  const handleHangup = () => {
    logActivity("User clicked hangup button", { action: 'hangup' });
    stopSession();
    onClose();
  };

  const handleCallButton = () => {
    logActivity("User clicked call button", { 
      currentStatus: state.connectionStatus,
      action: 'start_call' 
    });
    if (state.connectionStatus === "idle" || state.connectionStatus === "error" || state.connectionStatus === "disconnected") {
      startSession();
    }
  };


  return (
    <div
      className="fixed inset-0 z-50 bg-background"
      style={{
        animation: "slideUp 300ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
      data-testid="modal-voice"
    >
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(0.95);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.7;
          }
          100% {
            transform: scale(0.95);
            opacity: 1;
          }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {companyInitial}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold tracking-tight" data-testid="text-company-name">
                  {ainager.ainagerName}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Waves className="w-3 h-3" />
                  Enterprise Friend Ainager
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-muted rounded-full"
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        {state.connectionStatus === "connecting" && (
          <div className="px-6 py-3 bg-gradient-to-r from-blue-500/10 via-primary/10 to-blue-500/10 border-b border-primary/20">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <p className="text-sm text-primary font-medium" data-testid="status-connecting">
                Dialing...
              </p>
            </div>
          </div>
        )}

        {state.connectionStatus === "error" && (
          <div className="px-6 py-3 bg-destructive/10 border-b border-destructive/20">
            <p className="text-sm text-center text-destructive font-medium" data-testid="status-error">
              ⚠️ Connection lost. Please try again.
            </p>
          </div>
        )}

        {state.connectionStatus === "connected" && (
          <div className="px-6 py-3 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 border-b border-green-500/20">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-green-700 dark:text-green-400 font-medium" data-testid="status-ready">
                  Live
                </p>
              </div>
              {state.latency && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>•</span>
                  <span>{state.latency}ms</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(sessionDuration)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Call Controls Layout */}
        <div className="relative py-12">
          {/* Background gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
          
          <div className="relative flex items-center justify-center gap-12">
            {/* Green Call Button */}
            <div className="relative">
              {state.connectionStatus === "connected" && (
                <div 
                  className="absolute inset-0 bg-green-500/30 rounded-full blur-xl"
                  style={{ animation: "pulse-ring 2s ease-in-out infinite" }}
                ></div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`relative w-20 h-20 rounded-full shadow-2xl transition-all duration-300 ${
                  state.connectionStatus === "idle" || state.connectionStatus === "error" || state.connectionStatus === "disconnected"
                    ? "bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 hover:scale-110"
                    : state.connectionStatus === "connected"
                    ? "bg-gradient-to-br from-green-500 to-green-600"
                    : "bg-green-500/50 cursor-not-allowed"
                }`}
                onClick={handleCallButton}
                disabled={state.connectionStatus === "connected" || state.connectionStatus === "connecting"}
                data-testid="button-call"
              >
                <Phone className="w-9 h-9 text-white drop-shadow-lg" />
              </Button>
              <p className="text-xs text-center mt-3 text-muted-foreground font-medium">
                {state.connectionStatus === "connected" ? "In Call" : "Call"}
              </p>
            </div>

            {/* Visualizer bars when connected */}
            {state.connectionStatus === "connected" && (
              <div className="flex items-center gap-1 h-16">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-primary to-primary/50 rounded-full"
                    style={{
                      height: "100%",
                      animation: `wave ${0.5 + i * 0.1}s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            )}

            {/* Red End Call Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative w-20 h-20 rounded-full shadow-2xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:scale-110 transition-all duration-300"
                onClick={handleHangup}
                data-testid="button-hangup"
              >
                <Phone className="w-8 h-8 text-white rotate-[135deg] drop-shadow-lg" />
              </Button>
              <p className="text-xs text-center mt-3 text-muted-foreground font-medium">End</p>
            </div>
          </div>

          {/* Additional Controls */}
          <div className="flex items-center justify-center gap-6 mt-8">
            {/* Mute Button */}
            <Button
              variant="ghost"
              size="icon"
              className={`w-14 h-14 rounded-full transition-all ${
                isMuted 
                  ? "bg-red-500/20 hover:bg-red-500/30" 
                  : "bg-muted hover:bg-muted/80"
              }`}
              onClick={() => {
                logActivity("User clicked mute button", { 
                  currentMuteState: isMuted, 
                  newMuteState: !isMuted 
                });
                setIsMuted(!isMuted);
              }}
              data-testid="button-mute"
            >
              {isMuted ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5" />}
            </Button>

            {/* Speaker Button */}
            <Button
              variant="ghost"
              size="icon"
              className={`w-14 h-14 rounded-full transition-all ${
                !speakerOn 
                  ? "bg-red-500/20 hover:bg-red-500/30" 
                  : "bg-muted hover:bg-muted/80"
              }`}
              onClick={() => {
                logActivity("User clicked speaker button", { 
                  currentSpeakerState: speakerOn, 
                  newSpeakerState: !speakerOn 
                });
                setSpeakerOn(!speakerOn);
              }}
              data-testid="button-speaker"
            >
              {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-500" />}
            </Button>
          </div>
        </div>

        {/* Chat Transcript Section */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-gradient-to-b from-background to-transparent py-3 z-10">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Conversation
            </h3>
            {state.transcription.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {state.transcription.length} {state.transcription.length === 1 ? 'message' : 'messages'}
              </span>
            )}
          </div>
          
          {state.transcription.length === 0 && state.connectionStatus !== "connected" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Click the green button to start your call
              </p>
            </div>
          ) : state.transcription.length === 0 && state.connectionStatus === "connected" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 animate-pulse">
                <Mic className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Listening... Start speaking
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.transcription.map((message, index) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.speaker === "You" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      message.speaker === "You"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold opacity-70">
                        {message.speaker}
                      </span>
                      <span className="text-xs opacity-50">
                        {message.timestamp}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {message.text}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={transcriptionEndRef} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
