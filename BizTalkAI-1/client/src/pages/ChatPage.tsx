import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { type Ainager } from "@shared/schema";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ArrowLeft, Send, Mic2, Radio, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebRTCVoice } from "@/hooks/useWebRTCVoice";

// Simple waveform component
const Waveform = ({ isPlaying, isPaused, duration = 0 }: { isPlaying: boolean; isPaused: boolean; duration: number }) => {
  const bars = Array.from({ length: 20 }, (_, i) => {
    const height = Math.random() * 0.8 + 0.2; // Random height between 0.2 and 1.0
    return (
      <div
        key={i}
        className={`w-1 bg-gray-400 rounded-full transition-all duration-200 ${
          isPlaying && !isPaused ? 'animate-pulse' : ''
        }`}
        style={{ height: `${height * 100}%` }}
      />
    );
  });

  return (
    <div className="flex items-center gap-0.5 h-6">
      {bars}
    </div>
  );
};

interface Message {
  id: string;
  speaker: "Efa" | "You";
  text: string;
  timestamp: string;
  isVoice?: boolean;
  isLocal?: boolean;
  confidence?: number;
  audioUrl?: string;
  duration?: number;
  isPlaying?: boolean;
  isPaused?: boolean;
  showTranscription?: boolean;
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
  const [isWaitingForVoice, setIsWaitingForVoice] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [showConnected, setShowConnected] = useState(false);
  const [currentAudioElement, setCurrentAudioElement] = useState<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioMessages, setAudioMessages] = useState<Map<string, { audio: HTMLAudioElement; duration: number }>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInCall, callStartTime]);

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

  const handleCallClick = async () => {
    if (state.connectionStatus === "idle" || state.connectionStatus === "error") {
      // Start call
      setIsInCall(true);
      setCallDuration(0);
      
      try {
        await startSession();
        
        // Show "Connected" status immediately when call starts
        setShowConnected(true);
        
        // Start timer only after connection is established
        setCallStartTime(new Date());
        
        // Add AI introduction message after a short delay
        setTimeout(() => {
          const introMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            speaker: "Efa",
            text: `Hello! I'm ${ainager.ainagerName}. How can I help you today?`,
            timestamp: new Date().toLocaleTimeString(),
            isVoice: true,
            audioUrl: undefined // Will be generated by TTS
          };
          
          // Generate TTS for introduction
          textToSpeech(introMessage.text).then(audioUrl => {
            const messageWithAudio = { ...introMessage, audioUrl };
            setMessages(prev => [...prev, messageWithAudio]);
          }).catch(error => {
            console.error('TTS error for introduction:', error);
            setMessages(prev => [...prev, introMessage]);
          });
        }, 2000); // 2 seconds for AI introduction
        
      } catch (error) {
        console.error('Failed to start call:', error);
        setIsInCall(false);
        setCallStartTime(null);
        setCallDuration(0);
      }
    } else {
      // End call
      setIsInCall(false);
      setCallStartTime(null);
      setCallDuration(0);
      setShowConnected(false);
      stopSession();
    }
  };

  const sendChatMessage = async (messageText: string, shouldPlayVoice: boolean = false) => {
    if (!ainager) return;

    setIsLoading(true);
    if (shouldPlayVoice) {
      setIsWaitingForVoice(true);
    } else {
      setIsTyping(true);
    }
    
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
      
      // Create AI message
      const aiMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        speaker: "Efa",
        text: data.response,
        timestamp: new Date().toLocaleTimeString(),
        isVoice: false
      };
      
      if (shouldPlayVoice) {
        // Convert AI response to speech and create audio message
        try {
          const audioUrl = await textToSpeech(data.response);
          const audioMessage = {
            ...aiMessage,
            audioUrl,
            isVoice: true
          };
          setMessages(prev => [...prev, audioMessage]);
        } catch (error) {
          console.error('TTS error:', error);
          // Show text message if TTS fails
          setMessages(prev => [...prev, aiMessage]);
        }
      } else {
        // Just show the text response without voice
        setMessages(prev => [...prev, aiMessage]);
      }
      
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
      setIsWaitingForVoice(false);
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
      
      // Send to API (text message - no voice reply)
      sendChatMessage(messageText, false);
      
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

  const pauseAudio = () => {
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeAudio = () => {
    if (currentAudioRef.current && currentAudioRef.current.paused) {
      currentAudioRef.current.play();
      setIsPaused(false);
    }
  };

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
      setIsPaused(false);
      setCurrentAudioElement(null);
    }
  };

  // Individual audio message controls
  const playAudioMessage = async (messageId: string, audioUrl: string) => {
    // Stop any currently playing audio
    if (playingMessageId && playingMessageId !== messageId) {
      const currentAudio = audioMessages.get(playingMessageId);
      if (currentAudio) {
        currentAudio.audio.pause();
        currentAudio.audio.currentTime = 0;
      }
    }

    let audioElement = audioMessages.get(messageId)?.audio;
    
    if (!audioElement) {
      // Create new audio element
      audioElement = new Audio(audioUrl);
      
      // Set up event handlers
      audioElement.onloadedmetadata = () => {
        const duration = audioElement!.duration;
        setAudioMessages(prev => new Map(prev.set(messageId, { audio: audioElement!, duration })));
        
        // Update the message with duration
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, duration }
            : msg
        ));
      };
      
      audioElement.onplay = () => {
        setPlayingMessageId(messageId);
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isPlaying: true, isPaused: false }
            : { ...msg, isPlaying: false, isPaused: false }
        ));
      };
      
      audioElement.onpause = () => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isPlaying: false, isPaused: true }
            : msg
        ));
      };
      
      audioElement.onended = () => {
        setPlayingMessageId(null);
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isPlaying: false, isPaused: false }
            : msg
        ));
      };
      
      audioElement.onerror = () => {
        setPlayingMessageId(null);
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isPlaying: false, isPaused: false }
            : msg
        ));
      };
    }
    
    try {
      await audioElement.play();
    } catch (error) {
      console.error('Error playing audio message:', error);
    }
  };

  const pauseAudioMessage = (messageId: string) => {
    const audioData = audioMessages.get(messageId);
    if (audioData && !audioData.audio.paused) {
      audioData.audio.pause();
    }
  };

  const resumeAudioMessage = (messageId: string) => {
    const audioData = audioMessages.get(messageId);
    if (audioData && audioData.audio.paused) {
      audioData.audio.play();
    }
  };

  const stopAudioMessage = (messageId: string) => {
    const audioData = audioMessages.get(messageId);
    if (audioData) {
      audioData.audio.pause();
      audioData.audio.currentTime = 0;
      setPlayingMessageId(null);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isPlaying: false, isPaused: false }
          : msg
      ));
    }
  };

  const toggleTranscription = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, showTranscription: !msg.showTranscription }
        : msg
    ));
  };

  const textToSpeech = async (text: string, onAudioStart?: () => void): Promise<string> => {
    try {
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
      
      // Call the callback immediately to show the message
      if (onAudioStart) {
        onAudioStart();
      }
      
      return audioUrl;
      
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
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
              // Create audio URL from recorded blob
              const audioUrl = URL.createObjectURL(audioBlob);
              
              // Add transcribed message to chat with audio
              const newMessage: Message = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                speaker: "You",
                text: transcribedText,
                timestamp: new Date().toLocaleTimeString(),
                isVoice: true,
                audioUrl: audioUrl
              };
              
              setMessages(prev => [...prev, newMessage]);
              
              // Send to API and get response (voice message - with voice reply)
              await sendChatMessage(transcribedText, true);
              
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

  // Format call duration
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show calling interface when in call
  if (isInCall) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex flex-col overflow-hidden touch-none">
        {/* Call Header - Mobile Optimized */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 shadow-lg flex-shrink-0">
          <div className="w-full px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setLocation("/")}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full text-white hover:bg-white/20 touch-manipulation"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
              
              <div className="text-center flex-1 px-2">
                <h2 className="text-base sm:text-lg font-semibold text-white truncate">{ainager.ainagerName}</h2>
                <p className="text-xs sm:text-sm text-blue-200">
                  {isInCall ? "In Call" : "Calling..."}
                </p>
              </div>
              
              <div className="w-10 h-10 sm:w-12 sm:h-12"></div> {/* Spacer */}
            </div>
          </div>
        </div>

        {/* Call Content - Mobile Optimized */}
        <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-4 min-h-0">
          {/* AI Avatar - Professional Design */}
          <div className="relative mb-6 sm:mb-8">
            <div className={`w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-3xl sm:text-4xl md:text-5xl shadow-2xl transition-all duration-300 ${
              isPlayingAudio ? 'scale-105 ring-4 ring-blue-300 ring-opacity-50' : ''
            }`}>
              {ainager.ainagerName.charAt(0).toUpperCase()}
            </div>
            
            {/* Speaking Indicator */}
            {isPlayingAudio && (
              <div className="absolute inset-0 rounded-full border-4 border-blue-300 animate-ping"></div>
            )}
            
            {/* Online Status Indicator */}
            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-3 sm:border-4 border-blue-900 bg-green-500 flex items-center justify-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white"></div>
            </div>
          </div>

          {/* Call Duration - Professional Design */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="text-2xl sm:text-3xl md:text-4xl font-mono text-white font-bold">
              {formatCallDuration(callDuration)}
            </div>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 px-4">
              {isInCall ? "Ready to talk" : "Connecting..."}
            </p>
          </div>

          {/* Call Controls - Professional Design */}
          <div className="flex items-center gap-4 sm:gap-6 w-full max-w-sm justify-center">
            {/* Mute Button */}
            <Button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all duration-300 touch-manipulation ${
                isMuted ? "bg-red-500 hover:bg-red-600 active:bg-red-700" : 
                isRecording ? "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 scale-105 ring-4 ring-blue-300 ring-opacity-50" :
                "bg-white/20 hover:bg-white/30 active:bg-white/40"
              } text-white border-2 border-white/30 shadow-lg`}
            >
              {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
            </Button>

            {/* Speaker Button */}
            <Button
              onClick={() => setSpeakerOn(!speakerOn)}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full touch-manipulation ${
                !speakerOn ? "bg-red-500 hover:bg-red-600 active:bg-red-700" : "bg-white/20 hover:bg-white/30 active:bg-white/40"
              } text-white border-2 border-white/30 shadow-lg`}
            >
              {speakerOn ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
            </Button>

            {/* End Call Button */}
            <Button
              onClick={handleCallClick}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-2 border-red-400 shadow-xl touch-manipulation"
            >
              <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
            </Button>
          </div>

          {/* Status Messages - Professional Design */}
          {isInCall && (
            <div className="mt-6 sm:mt-8 text-center px-4">
              {isRecording ? (
                <div className="flex items-center justify-center gap-2 text-blue-200">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium">You're speaking...</span>
                </div>
              ) : isPlayingAudio ? (
                <div className="flex items-center justify-center gap-2 text-blue-200">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium">{ainager.ainagerName} is speaking...</span>
                </div>
              ) : (
                <p className="text-blue-200 text-xs sm:text-sm">
                  Speak naturally - I'm listening and ready to help!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex flex-col">
      {/* Simple Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 shadow-lg flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setLocation("/")}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            
            <div className="text-center flex-1 px-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">{ainager.ainagerName}</h2>
              <p className="text-sm text-blue-200">AI Assistant</p>
            </div>
            
            <div className="w-10 h-10 sm:w-12 sm:h-12"></div> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Main Content - Call Button */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* AI Avatar */}
        <div className="relative mb-8">
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-3xl sm:text-4xl md:text-5xl shadow-2xl">
            {ainager.ainagerName.charAt(0).toUpperCase()}
          </div>
          
          {/* Online Status Indicator */}
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-blue-900 bg-green-500 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white"></div>
          </div>
        </div>

        {/* Call Button */}
        <Button
          onClick={handleCallClick}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-2xl transition-all duration-200"
          disabled={state.connectionStatus === "connecting"}
        >
          <Phone className="w-8 h-8 sm:w-10 sm:h-10" />
        </Button>

        {/* Status Text */}
        <p className="text-blue-200 text-sm mt-6 text-center max-w-md">
          Click to start a voice conversation with {ainager.ainagerName}
        </p>
      </div>
    </div>
  );
}
