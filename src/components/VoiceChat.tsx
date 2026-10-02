"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, MicOff, PhoneOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCurrentOpponent } from "@/lib/useChat";
import { buildBrief } from "@/lib/ai/brief";
import { approvedPlan } from "@/lib/meeting";

export default function VoiceChat({ page, onClose }: { page: string; onClose: () => void }) {
  const opponent = useCurrentOpponent();
  const [status, setStatus] = useState("Ready to talk");
  const [active, setActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsPlayback, setNeedsPlayback] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const cleanup = useRef<() => void>(() => {});
  const generation = useRef(0);
  const toggleMic = useRef<(mute: boolean) => void>(() => {});

  useEffect(() => () => { generation.current++; cleanup.current(); }, []);

  function end(message = "Voice ended. Transcript saved on this device.") {
    generation.current++;
    cleanup.current();
    setActive(false);
    setConnected(false);
    setMuted(false);
    setNeedsPlayback(false);
    setStatus(message);
  }

  async function start() {
    if (active) return;
    const id = ++generation.current;
    const current = () => id === generation.current;
    setActive(true);
    setStatus("Connecting…");
    let stream: MediaStream | undefined;
    let peer: RTCPeerConnection | undefined;
    let channel: RTCDataChannel | undefined;
    let duration: ReturnType<typeof setTimeout> | undefined;
    const speaker = audio.current;
    const abort = new AbortController();
    const timeout = setTimeout(() => { if (current()) end("Connection timed out. Try again."); }, 45_000);
    cleanup.current = () => {
      clearTimeout(timeout);
      clearTimeout(duration);
      abort.abort();
      channel?.close();
      peer?.close();
      stream?.getTracks().forEach(t => t.stop());
      if (speaker) { speaker.pause(); speaker.srcObject = null; }
    };
    try {
      const health = await fetch("/api/voice", { signal: abort.signal, cache: "no-store" });
      if (!health.ok || !(await health.json()).configured) throw new Error("Voice needs to be enabled in the site's AI settings. You can still type or dictate.");
      if (!current()) return;
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("Voice needs a browser with microphone support and a secure connection.");
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      // A microphone permission dialog may finish after cancel or navigation.
      if (!current()) { stream.getTracks().forEach(t => t.stop()); return; }
      toggleMic.current = mute => stream?.getAudioTracks().forEach(track => { track.enabled = !mute; });
      peer = new RTCPeerConnection();
      stream.getTracks().forEach(track => peer!.addTrack(track, stream!));
      peer.ontrack = event => {
        if (!current() || !audio.current) return;
        audio.current.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void audio.current.play().catch(() => { if (current()) setNeedsPlayback(true); });
      };
      peer.onconnectionstatechange = () => {
        if (current() && ["failed", "disconnected", "closed"].includes(peer!.connectionState)) end("Voice disconnected. Start again when you're ready.");
      };
      channel = peer.createDataChannel("oai-events");
      channel.onopen = () => {
        if (!current()) return;
        clearTimeout(timeout);
        setConnected(true);
        setStatus("Listening");
        duration = setTimeout(() => { if (current()) end("Ten-minute session complete. Start again to keep talking."); }, 600_000);
      };
      channel.onclose = () => { if (current()) end("Voice connection closed. You can start again."); };
      const seen = new Set<string>();
      channel.onmessage = event => {
        if (!current()) return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        switch (message.type) {
          case "input_audio_buffer.speech_started": setStatus("Listening to you…"); break;
          case "input_audio_buffer.speech_stopped": setStatus("Thinking…"); break;
          case "output_audio_buffer.started": setStatus("Speaking — you can interrupt"); break;
          case "output_audio_buffer.stopped":
          case "output_audio_buffer.cleared": setStatus("Listening"); break;
          case "conversation.item.input_audio_transcription.completed":
          case "response.output_audio_transcript.done": {
            const key = `${message.type}:${message.item_id}:${message.content_index ?? 0}`;
            if (typeof message.transcript === "string" && message.transcript.trim() && !seen.has(key)) {
              seen.add(key);
              useStore.getState().appendChat({
                role: message.type.startsWith("conversation.") ? "coach" : "counterscheme",
                text: message.transcript,
                context: { page, opponentId: opponent?.id },
              });
            }
            break;
          }
          case "error": end("Voice encountered a problem. Please start again."); break;
        }
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const s = useStore.getState();
      const facts = buildBrief({ ...s, opponent, page, plan: approvedPlan(s.gamePlans.find(p => p.opponentId === opponent?.id)) }, opponent);
      const history = s.chat.slice(-12).map(m => `${m.role}: ${m.text.slice(0, 800)}`).join("\n");
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: offer.sdp, facts: `${facts}\nRECENT CHAT:\n${history}` }),
        signal: abort.signal,
      });
      if (!response.ok) throw new Error(response.status === 429 ? "Too many voice starts. Wait a minute and try again." : "Voice couldn't connect. Check the site's voice configuration and try again.");
      const sdp = await response.text();
      if (!current()) return;
      await peer.setRemoteDescription({ type: "answer", sdp });
    } catch (error) {
      if (!current()) return;
      end(error instanceof DOMException && error.name === "NotAllowedError" ? "Microphone access was blocked. Allow it in your browser, then try again." : error instanceof Error ? error.message : "Voice couldn't connect. Try again.");
    }
  }

  return <div className="shrink-0 border-t border-line bg-white p-4 text-center">
    <audio ref={audio} autoPlay />
    <div className={`mx-auto mb-3 grid size-16 place-items-center rounded-full bg-grass text-white ${connected && !muted ? "motion-safe:animate-pulse" : ""}`}><AudioLines size={28} /></div>
    <p className="text-sm font-bold" role="status" aria-live="polite">{muted ? "Microphone muted" : status}</p>
    <p className="mt-1 text-xs text-dim">AI voice · Uses your saved team and opponent context.</p>
    <p className="mt-1 text-xs text-dim">Audio is sent to OpenAI. Transcript saved on this device. Use Teach to save scheme rules.</p>
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {!active && <button onClick={() => void start()} className="rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white">Start voice</button>}
      {connected && <button aria-pressed={muted} onClick={() => {
        // The local sender's track is controlled through the session callback below.
        toggleMic.current(!muted); setMuted(!muted);
      }} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">{muted ? <Mic size={16} /> : <MicOff size={16} />}{muted ? "Unmute" : "Mute"}</button>}
      {active && <button onClick={() => end()} className="inline-flex items-center gap-2 rounded-lg bg-grass px-3 py-2 text-sm text-white"><PhoneOff size={16} />{connected ? "End" : "Cancel"}</button>}
      {!active && <button onClick={onClose} className="rounded-lg border border-line px-3 py-2 text-sm">Back to typing</button>}
      {needsPlayback && <button onClick={() => { void audio.current?.play().then(() => setNeedsPlayback(false)).catch(() => setStatus("Allow audio playback in your browser.")); }} className="rounded-lg border border-line px-3 py-2 text-sm">Enable speaker</button>}
    </div>
  </div>;
}
