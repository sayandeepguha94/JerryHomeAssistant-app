import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { api, fetchAudioBlob } from "../lib/api";
import { friendlyErr } from "../lib/utils";

export default function Voice() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState([]); // {role, text}
  const [textInput, setTextInput] = useState("");
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const audioElRef = useRef(null);

  const startRecording = async () => {
    if (recording || processing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        await sendAudio(blob);
      };
      rec.start();
      mediaRecRef.current = rec;
      setRecording(true);
    } catch (e) {
      toast.error("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    mediaRecRef.current?.stop();
    setRecording(false);
  };

  const processFullLoop = async (transcript) => {
    if (!transcript) return;
    setMessages((m) => [...m, { role: "user", text: transcript }]);

    try {
      // Direct call to Node.js server for command parsing
      const res = await api.post("/parse-command", { text: transcript });
      const { response, audioUrl, audioBase64 } = res.data;

      setMessages((m) => [...m, { role: "assistant", text: response }]);

      if (audioUrl || audioBase64) {
        await playResponseAudio(audioUrl, audioBase64);
      }
    } catch (err) {
      console.error("Command processing failed", err);
      toast.error("Failed to process command");
    }
  };

  const sendAudio = async (blob) => {
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      const res = await api.post("/parse-audio", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const { transcript, response, audioUrl, audioBase64 } = res.data;

      if (!transcript) {
        toast.info("Could not understand audio");
        return;
      }

      setMessages((m) => [...m, { role: "user", text: transcript }]);
      setMessages((m) => [...m, { role: "assistant", text: response }]);

      if (audioUrl || audioBase64) {
        await playResponseAudio(audioUrl, audioBase64);
      }
    } catch (e) {
      toast.error(friendlyErr(e));
    } finally {
      setProcessing(false);
    }
  };

  const sendText = async () => {
    const t = textInput.trim();
    if (!t || processing) return;
    setTextInput("");
    setProcessing(true);
    try {
      await processFullLoop(t);
    } catch (e) {
      toast.error(friendlyErr(e));
    } finally {
      setProcessing(false);
    }
  };

  const playResponseAudio = async (audioUrl, audioBase64) => {
    try {
      if (audioBase64) {
        const src = `data:audio/wav;base64,${audioBase64}`;
        if (audioElRef.current) {
          audioElRef.current.src = src;
          audioElRef.current.play().catch(() => {});
        }
        return;
      }
      if (audioUrl) {
        const m = audioUrl.match(/\/api\/audio\/([^./]+)/);
        if (m) {
          const blobUrl = await fetchAudioBlob(m[1]);
          if (audioElRef.current) {
            audioElRef.current.src = blobUrl;
            audioElRef.current.play().catch(() => {});
          }
        }
      }
    } catch { /* audio playback failed */ }
  };

  useEffect(() => () => {
    mediaRecRef.current?.stop?.();
  }, []);

  return (
    <div className="min-h-screen pb-40 px-5 pt-10 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Voice Assistant</p>
        <h1 className="font-heading text-4xl font-bold">Say the word.</h1>
      </motion.div>

      <div className="space-y-3 mb-8" data-testid="voice-transcript">
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-[#E05D26] text-white rounded-br-md"
                    : "glass text-white/90 rounded-bl-md"
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {messages.length === 0 && (
          <div className="text-center py-10 text-white/40">
            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Press and hold the mic to speak,</p>
            <p className="text-sm">or type a command below.</p>
          </div>
        )}
      </div>

      {/* Text input */}
      <div className="glass rounded-full px-4 py-2 flex items-center gap-2 mb-8">
        <input
          data-testid="voice-text-input"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          placeholder='Type e.g. "turn on party light"'
          className="flex-1 bg-transparent outline-none py-2 text-sm"
        />
        <button
          data-testid="voice-text-send-btn"
          onClick={sendText}
          disabled={!textInput.trim() || processing}
          className="w-9 h-9 rounded-full bg-[#E05D26] grid place-items-center disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Hero mic */}
      <div className="flex flex-col items-center">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {recording && (
            <>
              <span className="mic-ring" style={{ animationDelay: "0s" }} />
              <span className="mic-ring" style={{ animationDelay: "0.4s" }} />
              <span className="mic-ring" style={{ animationDelay: "0.8s" }} />
            </>
          )}
          <motion.button
            data-testid="voice-mic-btn"
            whileTap={{ scale: 0.92 }}
            onPointerDown={startRecording}
            onPointerUp={stopRecording}
            onPointerLeave={stopRecording}
            disabled={processing}
            className={`relative w-32 h-32 rounded-full grid place-items-center transition-colors ${
              recording ? "bg-[#E05D26]" : "bg-[#E05D26]/90"
            }`}
            style={{ boxShadow: "0 0 60px rgba(224,93,38,0.6)" }}
          >
            {processing ? <Loader2 className="w-10 h-10 text-white animate-spin" /> : <Mic className="w-12 h-12 text-white" />}
          </motion.button>
        </div>
        <p className="mt-5 text-sm text-white/50 text-center max-w-[240px]" data-testid="voice-mic-hint">
          {processing ? "Thinking…" : recording ? "Listening — release to send" : "Press & hold to speak"}
        </p>
      </div>

      <audio ref={audioElRef} className="hidden" data-testid="voice-audio-element" />
    </div>
  );
}
