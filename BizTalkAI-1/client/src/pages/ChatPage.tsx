import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { type Ainager } from "@shared/schema";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebRTCVoice } from "@/hooks/useWebRTCVoice";

interface Message {
  id: string;
  speaker: "Efa" | "You";
  text: string;
  timestamp: string;
  isVoice?: boolean;
  isLocal?: boolean;
  confidence?: number;
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const ainager = history.state?.ainager as Ainager;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if no ainager data
  useEffect(() => {
    if (!ainager) {
      setLocation("/");
    }
  }, [ainager, setLocation]);

  const { 
    state,
    startSession,
    stopSession,
    setAudioElement,
    addTranscriptionMessage,
    isLocalRecording,
    isLocalProcessing
  } = useWebRTCVoice({
    company: ainager?.ainagerName || "",
    ainagerId: ainager?.ainagerId || "",
    enabled: true,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Set up audio element for playback
  useEffect(() => {
    const audioElement = document.createElement('audio');
    audioElement.autoplay = true;
    audioElement.preload = 'auto';
    audioElement.controls = false;
    audioElement.style.display = 'none';
    
    document.body.appendChild(audioElement);
    setAudioElement(audioElement);
    
    return () => {
      audioElement.pause();
      audioElement.srcObject = null;
      document.body.removeChild(audioElement);
    };
  }, [setAudioElement]);

  // Sync transcription with messages
  useEffect(() => {
    if (state.transcription.length > 0) {
      setMessages(prev => {
        // Get existing message IDs to avoid duplicates
        const existingIds = new Set(prev.map(m => m.id));
        
        // Filter out only new transcription messages
        const newTranscriptions = state.transcription.filter(transcript => 
          !existingIds.has(transcript.id)
        );
        
        if (newTranscriptions.length > 0) {
          // Convert transcriptions to messages
          const newMessages = newTranscriptions.map(transcript => ({
            id: transcript.id,
            speaker: transcript.speaker,
            text: transcript.text,
            timestamp: transcript.timestamp,
            isVoice: true,
            isLocal: transcript.isLocal || false,
            confidence: transcript.confidence
          }));
          
          return [...prev, ...newMessages];
        }
        
        return prev;
      });
    }
  }, [state.transcription]);

  const handleCallClick = () => {
    if (state.connectionStatus === "idle" || state.connectionStatus === "error") {
      startSession();
    } else {
      stopSession();
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        speaker: "You",
        text: inputValue.trim(),
        timestamp: new Date().toLocaleTimeString(),
        isVoice: false
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputValue("");
      
      // If in a voice session, also add to transcription
      if (state.connectionStatus === "connected") {
        addTranscriptionMessage("You", inputValue.trim());
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  const getConnectionStatusColor = () => {
    switch (state.connectionStatus) {
      case "connected": return "bg-green-500";
      case "connecting": return "bg-yellow-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getConnectionStatusText = () => {
    switch (state.connectionStatus) {
      case "connected": return "Connected";
      case "connecting": return "Connecting...";
      case "error": return "Connection Error";
      default: return "Disconnected";
    }
  };

  if (!ainager) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setLocation("/")}
                  className="h-12 w-12 rounded-full"
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary font-bold text-lg">
                    {ainager.ainagerName.charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${getConnectionStatusColor()}`}></div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{ainager.ainagerName}</h2>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                    <p className="text-sm text-muted-foreground">{getConnectionStatusText()}</p>
                  </div>
                </div>
              </div>
              
              {/* Call Button */}
              <Button
                onClick={handleCallClick}
                size="lg"
                className={`w-16 h-16 rounded-full shadow-xl transition-all duration-200 ${
                  state.connectionStatus === "connected"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
                disabled={state.connectionStatus === "connecting"}
              >
                {state.connectionStatus === "connected" ? (
                  <PhoneOff className="w-7 h-7" />
                ) : (
                  <Phone className="w-7 h-7" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                  <Phone className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Start a conversation</h3>
                <p className="text-muted-foreground max-w-md">
                  Click the call button to start voice chat with {ainager.ainagerName} or type a message below
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.speaker === "You" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-6 py-4 shadow-sm ${
                      message.speaker === "You"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground border border-border/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold opacity-90">
                        {message.speaker}
                      </span>
                      {message.isVoice && (
                        <div className="flex items-center gap-1 text-xs opacity-70">
                          <Volume2 className="w-3 h-3" />
                          <span>{message.isLocal ? "Local Transcription" : "AI Response"}</span>
                          {message.isLocal && message.confidence && (
                            <span className="text-xs opacity-50">
                              ({Math.round(message.confidence * 100)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-base leading-relaxed">{message.text}</p>
                    <p className="text-xs opacity-60 mt-2">{message.timestamp}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-card/95 backdrop-blur-sm border-t border-border/50 p-6">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${ainager.ainagerName}...`}
                className="flex-1 h-12 text-base"
                disabled={state.connectionStatus === "connecting"}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || state.connectionStatus === "connecting"}
                size="lg"
                className="h-12 px-6"
              >
                <Send className="w-5 h-5 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>

        {/* Voice Controls (shown when connected) */}
        {state.connectionStatus === "connected" && (
          <div className="bg-card/95 backdrop-blur-sm border-t border-border/50 p-4">
            <div className="max-w-4xl mx-auto">
              {/* Local Transcription Status */}
              {(isLocalRecording || isLocalProcessing) && (
                <div className="flex justify-center mb-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {isLocalRecording ? "Recording your speech..." : "Transcribing your speech..."}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-14 h-14 rounded-full ${
                    isMuted ? "bg-red-500 text-white border-red-500" : "bg-background"
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setSpeakerOn(!speakerOn)}
                  className={`w-14 h-14 rounded-full ${
                    !speakerOn ? "bg-red-500 text-white border-red-500" : "bg-background"
                  }`}
                >
                  {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
              </div>
              
              {/* Debug Info */}
              <div className="mt-4 text-center">
                <div className="text-xs text-muted-foreground">
                  Local Recording: {isLocalRecording ? "Active" : "Inactive"} | 
                  Processing: {isLocalProcessing ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
