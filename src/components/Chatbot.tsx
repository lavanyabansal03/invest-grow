import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { sendMessageToGemini, synthesizeGeminiTts, ChatMessage as GeminiMessage } from "@/lib/gemini";
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

/** After this much quiet time since the last speech result, we send the transcript to Gemini. */
const SILENCE_COMMIT_MS = 1400;
const MIN_UTTERANCE_CHARS = 2;
/** Assistant text (and voice) only appears after at least this long since the user sent their question. */
const REPLY_DISPLAY_DELAY_MS = 2000;

function delayReplyDisplay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, REPLY_DISPLAY_DELAY_MS));
}

function createSpeechRecognition(): SpeechRecognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
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
  /** Hands-free: listen continuously, send on natural pauses, then listen again. */
  const [liveSession, setLiveSession] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [micBusy, setMicBusy] = useState(false);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const liveSessionRef = useRef(false);
  useEffect(() => {
    liveSessionRef.current = liveSession;
  }, [liveSession]);

  const voiceBusyRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const committedFinalRef = useRef("");
  const lastInterimRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

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

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current != null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    clearSilenceTimer();
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      try {
        r.abort();
      } catch {
        /* noop */
      }
    }
  }, [clearSilenceTimer]);

  const tearDownLiveSession = useCallback(() => {
    liveSessionRef.current = false;
    clearSilenceTimer();
    committedFinalRef.current = "";
    lastInterimRef.current = "";
    stopSpeechRecognition();
    recognitionRef.current = null;
    setLiveSession(false);
    setMicBusy(false);
  }, [clearSilenceTimer, stopSpeechRecognition]);

  useEffect(() => {
    if (!isOpen) {
      stopPlayback();
      tearDownLiveSession();
      setIsVoiceProcessing(false);
    }
  }, [isOpen, stopPlayback, tearDownLiveSession]);

  const playVoiceReply = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      try {
        stopPlayback();
        const blob = await synthesizeGeminiTts(t);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          stopPlayback();
        };
        await audio.play();
      } catch (e: unknown) {
        const description = e instanceof Error ? e.message : "Check Gemini API key and TTS model in .env.";
        toast({ title: "Voice reply failed", description, variant: "destructive" });
        stopPlayback();
      }
    },
    [stopPlayback, toast],
  );

  const submitLiveUtteranceRef = useRef<(transcript: string) => Promise<void>>(async () => {});

  const startSpeechRecognition = useCallback(() => {
    const existing = recognitionRef.current;
    if (existing) {
      try {
        existing.start();
      } catch {
        /* already started */
      }
      return;
    }

    const rec = createSpeechRecognition();
    if (!rec) {
      toast({
        title: "Live voice not supported",
        description: "Try Chrome or Edge — this browser does not support continuous speech recognition.",
        variant: "destructive",
      });
      tearDownLiveSession();
      return;
    }

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
    rec.maxAlternatives = 1;

    const scheduleCommit = () => {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        const finals = committedFinalRef.current.trim();
        const interim = lastInterimRef.current.trim();
        const combined = `${finals}${finals && interim ? " " : ""}${interim}`.trim();
        committedFinalRef.current = "";
        lastInterimRef.current = "";
        if (combined.length < MIN_UTTERANCE_CHARS) return;
        if (voiceBusyRef.current || !liveSessionRef.current) return;
        void submitLiveUtteranceRef.current(combined);
      }, SILENCE_COMMIT_MS);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let newFinal = "";
      let newInterim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const row = event.results[i];
        const piece = row[0]?.transcript ?? "";
        if (row.isFinal) newFinal += piece;
        else newInterim += piece;
      }
      if (newFinal) {
        committedFinalRef.current += newFinal;
        lastInterimRef.current = "";
      } else if (newInterim) {
        lastInterimRef.current = newInterim;
      }
      scheduleCommit();
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === "not-allowed") {
        toast({
          title: "Microphone blocked",
          description: "Allow the microphone for this site to use live voice.",
          variant: "destructive",
        });
        tearDownLiveSession();
        return;
      }
      if (ev.error === "no-speech" || ev.error === "aborted") {
        return;
      }
      if (ev.error === "network") {
        toast({ title: "Speech recognition", description: "Network error from the speech service.", variant: "destructive" });
      }
    };

    rec.onend = () => {
      if (!liveSessionRef.current) return;
      if (voiceBusyRef.current) return;
      window.setTimeout(() => {
        if (!liveSessionRef.current || voiceBusyRef.current) return;
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }, 160);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      toast({ title: "Could not start listening", description: "Try again or refresh the page.", variant: "destructive" });
      tearDownLiveSession();
    }
  }, [clearSilenceTimer, tearDownLiveSession, toast]);

  const submitLiveUtterance = useCallback(
    async (transcript: string) => {
      const text = transcript.replace(/\s+/g, " ").trim();
      if (text.length < MIN_UTTERANCE_CHARS) return;

      voiceBusyRef.current = true;
      stopSpeechRecognition();
      setIsVoiceProcessing(true);

      const userMessage: ChatMessage = {
        id: `lv-${Date.now()}`,
        content: text,
        isUser: true,
        timestamp: new Date(),
      };

      try {
        setMessages((prev) => [...prev, userMessage]);

        const prior: GeminiMessage[] = messagesRef.current
          .filter((msg) => msg.id !== "1" && msg.id !== userMessage.id)
          .map((msg) => ({
            role: msg.isUser ? "user" : "model",
            parts: [{ text: msg.content }],
          }));

        prior.push({
          role: "user",
          parts: [{ text: userMessage.content }],
        });

        const [response] = await Promise.all([sendMessageToGemini(prior), delayReplyDisplay()]);

        const botMessage: ChatMessage = {
          id: `la-${Date.now() + 1}`,
          content: response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
        await playVoiceReply(response);
      } catch (e) {
        console.error("Live voice chat error:", e);
        await delayReplyDisplay();
        const errBubble: ChatMessage = {
          id: `le-${Date.now()}`,
          content: "Sorry — I could not answer that. Try again or type your question.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errBubble]);
        await playVoiceReply(errBubble.content);
      } finally {
        voiceBusyRef.current = false;
        setIsVoiceProcessing(false);
        if (liveSessionRef.current) {
          startSpeechRecognition();
        }
      }
    },
    [playVoiceReply, startSpeechRecognition, stopSpeechRecognition],
  );

  submitLiveUtteranceRef.current = submitLiveUtterance;

  const toggleLiveSession = useCallback(async () => {
    if (liveSession) {
      tearDownLiveSession();
      stopPlayback();
      return;
    }
    if (!createSpeechRecognition()) {
      toast({
        title: "Live voice not available",
        description: "Use Chrome or Edge on https or localhost.",
        variant: "destructive",
      });
      return;
    }
    setMicBusy(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e: unknown) {
      const name = e instanceof DOMException ? e.name : "";
      const description =
        name === "NotAllowedError"
          ? "Allow microphone access to use live voice."
          : e instanceof Error
            ? e.message
            : "Could not access the microphone.";
      toast({ title: "Microphone needed", description, variant: "destructive" });
      setMicBusy(false);
      return;
    } finally {
      setMicBusy(false);
    }

    liveSessionRef.current = true;
    setLiveSession(true);
    committedFinalRef.current = "";
    lastInterimRef.current = "";
    window.setTimeout(() => startSpeechRecognition(), 0);
  }, [liveSession, startSpeechRecognition, tearDownLiveSession, toast, stopPlayback]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isVoiceProcessing) return;

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

      const [response] = await Promise.all([sendMessageToGemini(geminiMessages), delayReplyDisplay()]);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      await delayReplyDisplay();
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

  const composerBusy = isLoading || isVoiceProcessing;

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
                  <h3 className="font-display font-semibold text-foreground text-lg ml-7">Meet, Fin!</h3>
                  <p className="text-sm text-muted-foreground ml-4">
                    {liveSession ? "Live — speak naturally; pauses send automatically." : "your trading companion"}
                  </p>
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

            <div className="p-4 border-t border-border space-y-2">
              {liveSession && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {isVoiceProcessing ? "Thinking and speaking…" : "Listening — pause briefly after you speak to send."}
                </p>
              )}
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
                  variant={liveSession ? "default" : "outline"}
                  size="sm"
                  className={`shrink-0 h-9 w-9 p-0 ${liveSession && !isVoiceProcessing ? "animate-pulse" : ""}`}
                  disabled={isLoading || micBusy}
                  aria-pressed={liveSession}
                  aria-label={liveSession ? "Stop live voice" : "Start live voice"}
                  title={
                    liveSession
                      ? "Stop live voice"
                      : "Live voice — continuous listening; pauses send to Gemini and you hear the reply."
                  }
                  onClick={() => void toggleLiveSession()}
                >
                  {micBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : isVoiceProcessing ? (
                    <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" aria-hidden />
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
