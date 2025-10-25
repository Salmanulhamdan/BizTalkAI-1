import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { type Ainager } from "@shared/schema";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ArrowLeft, Send, Mic2, Radio, Square } from "lucide-react";
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

interface ChatHistoryItem {
  sender_user: string;
  message_body: string;
  sender_type: "user" | "ainager";
}

interface ChatAPIRequest {
  ainager_id: number;
  user_message: string;
  chat_history: ChatHistoryItem[];
}

interface ChatAPIResponse {
  response: string;
  // Add other response fields as needed
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const ainager = history.state?.ainager as Ainager;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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
    addTranscriptionMessage
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

  const sendChatMessage = async (messageText: string) => {
    if (!ainager) return;

    setIsLoading(true);
    setIsTyping(true);
    
    try {
      // Convert messages to chat history format
      const chatHistory: ChatHistoryItem[] = messages.map(msg => ({
        sender_user: msg.speaker,
        message_body: msg.text,
        sender_type: msg.speaker === "You" ? "user" : "ainager"
      }));

      const requestBody: ChatAPIRequest = {
        ainager_id: parseInt(ainager.ainagerId),
        user_message: messageText,
        chat_history: chatHistory
      };

      const response = await fetch('https://llm.ainager.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatAPIResponse = await response.json();
      
      // Convert AI response to speech first, then show text when audio starts
      await textToSpeech(data.response, () => {
        // This callback runs when audio starts playing
        const aiMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          speaker: "Efa",
          text: data.response,
          timestamp: new Date().toLocaleTimeString(),
          isVoice: false
        };
        
        setMessages(prev => [...prev, aiMessage]);
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        speaker: "Efa",
        text: "Sorry, I'm having trouble connecting right now. Please try again.",
        timestamp: new Date().toLocaleTimeString(),
        isVoice: false
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
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
      const messageText = inputValue.trim();
      setInputValue("");
      
      // Send to API
      sendChatMessage(messageText);
      
      // If in a voice session, also add to transcription
      if (state.connectionStatus === "connected") {
        addTranscriptionMessage("You", messageText);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/whisper/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      return result.text || '';
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  };

  const textToSpeech = async (text: string, onAudioStart?: () => void): Promise<void> => {
    try {
      setIsPlayingAudio(true);
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice: 'nova' })
      });
      
      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Set up audio event handlers
      audio.onplay = () => {
        setIsPlayingAudio(true);
        // Call the callback when audio starts playing
        if (onAudioStart) {
          onAudioStart();
        }
      };
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      // Play the audio
      await audio.play();
      
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlayingAudio(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording and turn off microphone immediately
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Turn off microphone immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setIsRecording(false);
    } else {
      // Start recording
      try {
        // Stop any existing recording first
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        
        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Only transcribe after recording is fully stopped
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          try {
            setIsLoading(true);
            const transcribedText = await transcribeAudio(audioBlob);
            
            if (transcribedText.trim()) {
              // Add transcribed message to chat
              const newMessage: Message = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                speaker: "You",
                text: transcribedText,
                timestamp: new Date().toLocaleTimeString(),
                isVoice: true
              };
              
              setMessages(prev => [...prev, newMessage]);
              
              // Send to API and get response
              await sendChatMessage(transcribedText);
              
              // Get the AI response and convert to speech
              // Note: This will be handled in the sendChatMessage function
            }
          } catch (error) {
            console.error('Voice transcription error:', error);
            // Add error message
            const errorMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              speaker: "Efa",
              text: "Sorry, I couldn't understand your voice message. Please try again.",
              timestamp: new Date().toLocaleTimeString(),
              isVoice: false
            };
            setMessages(prev => [...prev, errorMessage]);
          } finally {
            setIsLoading(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please check your permissions.');
        setIsRecording(false);
      }
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
    <div className="h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col">
      {/* Fixed Header */}
      <div className="bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-lg flex-shrink-0">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setLocation("/")}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
              
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary font-bold text-base sm:text-lg">
                  {ainager.ainagerName.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-card ${getConnectionStatusColor()}`}></div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-xl font-bold text-foreground truncate">{ainager.ainagerName}</h2>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{getConnectionStatusText()}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Voice Controls in Header (shown when connected) */}
              {state.connectionStatus === "connected" && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0 ${
                      isMuted ? "bg-red-500 text-white border-red-500" : "bg-background"
                    }`}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSpeakerOn(!speakerOn)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0 ${
                      !speakerOn ? "bg-red-500 text-white border-red-500" : "bg-background"
                    }`}
                  >
                    {speakerOn ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </Button>
                </div>
              )}
              
              {/* Call Button */}
              <Button
                onClick={handleCallClick}
                size="lg"
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full shadow-xl transition-all duration-200 p-0 ${
                  state.connectionStatus === "connected"
                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
                disabled={state.connectionStatus === "connecting"}
              >
                {state.connectionStatus === "connected" ? (
                  <PhoneOff className="w-5 h-5 sm:w-7 sm:h-7" />
                ) : (
                  <Phone className="w-5 h-5 sm:w-7 sm:h-7" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 sm:py-20 px-4">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 sm:mb-6">
                  <Phone className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Start a conversation</h3>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                  Click the call button to start voice chat with {ainager.ainagerName} or type a message below
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.speaker === "You" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-sm ${
                        message.speaker === "You"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground border border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                        <span className="text-xs sm:text-sm font-semibold opacity-90">
                          {message.speaker}
                        </span>
                        {message.isVoice && (
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs opacity-70">
                            <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span className="hidden sm:inline">{message.isLocal ? "Local Transcription" : "AI Response"}</span>
                            <span className="sm:hidden">{message.isLocal ? "Local" : "AI"}</span>
                            {message.isLocal && message.confidence && (
                              <span className="text-[10px] sm:text-xs opacity-50">
                                ({Math.round(message.confidence * 100)}%)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm sm:text-base leading-relaxed break-words">{message.text}</p>
                      <p className="text-[10px] sm:text-xs opacity-60 mt-1.5 sm:mt-2">{message.timestamp}</p>
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-sm bg-muted text-foreground border border-border/50">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                        <span className="text-xs sm:text-sm font-semibold opacity-90">Efa</span>
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs opacity-70">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                          <span>Typing...</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Audio Playing Indicator */}
                {isPlayingAudio && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-sm bg-muted text-foreground border border-border/50">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                        <span className="text-xs sm:text-sm font-semibold opacity-90">Efa</span>
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs opacity-70">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span>Playing audio...</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Fixed Input Area */}
        <div className="bg-card/95 backdrop-blur-sm border-t border-border/50 p-3 sm:p-6 flex-shrink-0">
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${ainager.ainagerName}...`}
                className="h-10 sm:h-12 text-sm sm:text-base pr-20 pl-12"
                disabled={state.connectionStatus === "connecting"}
              />
              
              {/* Voice Record Button - Inside Input */}
              <button
                onClick={handleVoiceRecord}
                className={`absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 transition-all duration-200 flex items-center justify-center ${
                  isRecording 
                    ? "bg-red-500 text-white hover:bg-red-600 animate-pulse" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                disabled={state.connectionStatus === "connecting"}
                type="button"
              >
                {isRecording ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || state.connectionStatus === "connecting" || isLoading}
              size="lg"
              className="h-10 sm:h-12 px-4 sm:px-6"
            >
              {isLoading ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
