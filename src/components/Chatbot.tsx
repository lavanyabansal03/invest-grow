import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { sendMessageToGemini, sendVoiceMessageToGemini, ChatMessage as GeminiMessage } from "@/lib/gemini";
import { synthesizeAssistantSpeech } from "@/lib/elevenlabs";
import { NeutralCoinMascot } from "@/components/NeutralCoinMascot";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_RECORDING_MS = 120_000;
const MIN_RECORDING_BYTES = 800;
const MAX_VOICE_BYTES = 12 * 1024 * 1024;

function pickRecorderMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return undefined;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(new Error("Failed to read recording"));
    r.readAsDataURL(blob);
  });
}

export function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: "Hi! I'm your AI investing assistant. How can I help you learn about trading today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [micBusy, setMicBusy] = useState(false);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** When true, `MediaRecorder` `onstop` only cleans up — no Gemini / ElevenLabs (e.g. panel closed). */
  const suppressVoiceUploadRef = useRef(false);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const clearRecordingTimer = useCallback(() => {
    if (maxDurationTimerRef.current != null) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const stopMediaCapture = useCallback(() => {
    clearRecordingTimer();
    suppressVoiceUploadRef.current = true;
    const rec = recorderRef.current;
    if (rec && (rec.state === "recording" || rec.state === "paused")) {
      try {
        rec.stop();
      } catch {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        chunksRef.current = [];
        recorderRef.current = null;
        setIsRecording(false);
        suppressVoiceUploadRef.current = false;
      }
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      chunksRef.current = [];
      recorderRef.current = null;
      setIsRecording(false);
      suppressVoiceUploadRef.current = false;
    }
  }, [clearRecordingTimer]);

  useEffect(() => {
    if (!isOpen) {
      stopPlayback();
      stopMediaCapture();
      setIsVoiceProcessing(false);
      setMicBusy(false);
    }
  }, [isOpen, stopMediaCapture, stopPlayback]);

  const playElevenLabs = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      try {
        stopPlayback();
        const blob = await synthesizeAssistantSpeech(t);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          stopPlayback();
        };
        await audio.play();
      } catch (e: unknown) {
        const description = e instanceof Error ? e.message : "Check Flask and ElevenLabs env.";
        toast({ title: "Voice reply failed", description, variant: "destructive" });
        stopPlayback();
      }
    },
    [stopPlayback, toast],
  );

  const finishVoiceTurn = useCallback(
    async (blob: Blob, mimeType: string) => {
      setIsVoiceProcessing(true);
      try {
        if (blob.size < MIN_RECORDING_BYTES) {
          toast({
            title: "Recording too short",
            description: "Speak a bit longer, then tap the mic again to stop and send.",
            variant: "destructive",
          });
          return;
        }
        if (blob.size > MAX_VOICE_BYTES) {
          toast({
            title: "Recording too large",
            description: "Try a shorter question (under about 2 minutes).",
            variant: "destructive",
          });
          return;
        }
        const b64 = await blobToBase64(blob);
        const prior: GeminiMessage[] = messagesRef.current
          .filter((msg) => msg.id !== "1")
          .map((msg) => ({
            role: msg.isUser ? "user" : "model",
            parts: [{ text: msg.content }],
          }));

        const response = await sendVoiceMessageToGemini(prior, b64, mimeType);

        const voiceUser: ChatMessage = {
          id: `v-${Date.now()}`,
          content: "Voice message",
          isUser: true,
          timestamp: new Date(),
        };
        const botMessage: ChatMessage = {
          id: `a-${Date.now() + 1}`,
          content: response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, voiceUser, botMessage]);
        await playElevenLabs(response);
      } catch (e: unknown) {
        console.error("Voice chat error:", e);
        const msg =
          e instanceof Error ? e.message : "Could not process your voice message. Try again or type instead.";
        toast({ title: "Voice message failed", description: msg, variant: "destructive" });
        const errBubble: ChatMessage = {
          id: `e-${Date.now()}`,
          content: "Sorry — I could not process that voice message. Try again or use text.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errBubble]);
        await playElevenLabs(errBubble.content);
      } finally {
        setIsVoiceProcessing(false);
      }
    },
    [playElevenLabs, toast],
  );

  const startRecording = useCallback(async () => {
    if (isRecording || isVoiceProcessing || isLoading) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Microphone not available",
        description: "Use https:// or localhost with a supported browser.",
        variant: "destructive",
      });
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      toast({
        title: "Recording not supported",
        description: "This browser does not support MediaRecorder for voice messages.",
        variant: "destructive",
      });
      return;
    }

    setMicBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeChoice = pickRecorderMimeType();
      const rec = mimeChoice ? new MediaRecorder(stream, { mimeType: mimeChoice }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      suppressVoiceUploadRef.current = false;

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      rec.onerror = () => {
        toast({ title: "Recording error", description: "The microphone recorder stopped unexpectedly.", variant: "destructive" });
        stopMediaCapture();
      };

      rec.onstop = () => {
        clearRecordingTimer();
        const suppress = suppressVoiceUploadRef.current;
        suppressVoiceUploadRef.current = false;
        const mime = rec.mimeType || mimeChoice || "audio/webm";
        const parts = chunksRef.current.slice();
        chunksRef.current = [];
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
        if (suppress) {
          return;
        }
        const finalBlob = new Blob(parts, { type: mime });
        void finishVoiceTurn(finalBlob, mime);
      };

      maxDurationTimerRef.current = setTimeout(() => {
        const active = recorderRef.current;
        if (active?.state === "recording") {
          suppressVoiceUploadRef.current = false;
          try {
            active.stop();
          } catch {
            /* noop */
          }
        }
      }, MAX_RECORDING_MS);

      rec.start(250);
      setIsRecording(true);
    } catch (e: unknown) {
      const name = e instanceof DOMException ? e.name : "";
      const description =
        name === "NotAllowedError"
          ? "Allow microphone access in the browser prompt or site settings."
          : name === "NotFoundError"
            ? "No microphone was found."
            : e instanceof Error
              ? e.message
              : "Could not access the microphone.";
      toast({ title: "Microphone permission needed", description, variant: "destructive" });
      stopMediaCapture();
    } finally {
      setMicBusy(false);
    }
  }, [clearRecordingTimer, finishVoiceTurn, isLoading, isRecording, isVoiceProcessing, stopMediaCapture, toast]);

  const toggleMicRecording = useCallback(() => {
    if (isVoiceProcessing || micBusy) return;
    if (isRecording) {
      suppressVoiceUploadRef.current = false;
      try {
        recorderRef.current?.stop();
      } catch {
        stopMediaCapture();
      }
      return;
    }
    void startRecording();
  }, [isRecording, isVoiceProcessing, micBusy, startRecording, stopMediaCapture]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isRecording || isVoiceProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const geminiMessages: GeminiMessage[] = messages
        .filter((msg) => msg.id !== "1")
        .map((msg) => ({
          role: msg.isUser ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

      geminiMessages.push({
        role: "user",
        parts: [{ text: userMessage.content }],
      });

      const response = await sendMessageToGemini(geminiMessages);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const spoken = "Sorry, I'm having trouble responding right now. Please try again.";
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: spoken,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const composerBusy = isLoading || isVoiceProcessing || isRecording;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-3">
                <NeutralCoinMascot className="scale-[0.9] translate-y-4" />
                <div>
                  <h3 className="font-display font-semibold text-foreground text-lg ml-7">AI Assistant</h3>
                  <p className="text-sm text-muted-foreground ml-4">Tap mic to speak · text or voice</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="-mt-18">
                <X className="h-2 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-card-foreground border border-border"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me about investing..."
                  disabled={composerBusy}
                  className="flex-1 min-w-0 px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                />
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  className="shrink-0 h-9 w-9 p-0"
                  disabled={isLoading || isVoiceProcessing || micBusy}
                  aria-pressed={isRecording}
                  aria-label={isRecording ? "Stop recording and send" : "Record voice message"}
                  title={
                    isRecording
                      ? "Stop — send recording to the assistant (then you will hear the reply)."
                      : "Record — tap again to stop and send your voice to Gemini."
                  }
                  onClick={() => void toggleMicRecording()}
                >
                  {micBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : isVoiceProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                  ) : isRecording ? (
                    <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
                  ) : (
                    <Mic className="h-4 w-4" aria-hidden />
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!inputValue.trim() || composerBusy}
                  size="sm"
                  className="shrink-0 h-9 w-9 p-0"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
