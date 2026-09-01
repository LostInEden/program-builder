"use client";

import { useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { Brain, Send, User } from "lucide-react";

type Msg = { role: "user" | "ai"; text: string };

const seed: Msg[] = [
  { role: "user", text: "What does Red Valley do on 3rd and short?" },
  {
    role: "ai",
    text: "Across the last 3 games, Red Valley is 11-for-11 run on 3rd & 1–3, all from 12 personnel — 8 of 11 behind the right guard (#66). Their only wrinkle is a QB sneak inside the 5. Recommended answer: Goal Line 6-2 with Double A Gap pressure; your interior has out-weighed their right side by 20+ lbs on film.",
  },
  { role: "user", text: "Who on our roster matches up best with their RB #7?" },
  {
    role: "ai",
    text: "#43 B. Green (LB, 4.79 laser 40, 9.1 tackle grade) has the best combination of pursuit speed and fit discipline. On outside zone, #21 R. Brown is your force player — but he's listed Limited this week, so rep #14 L. White in the alley Wednesday.",
  },
];

const suggestions = [
  "Build me a 3rd down call sheet",
  "Where are we predictable on defense?",
  "Summarize last week's player grades",
];

export default function AskPage() {
  const [messages, setMessages] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text },
      {
        role: "ai",
        text: "(Mockup) In the real build this calls the recommendation engine and answers from your breakdown data — with every number linked to the plays behind it.",
      },
    ]);
    setInput("");
  };

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto flex flex-col min-h-screen">
      <PageHeader
        eyebrow="Ask AI"
        title="Football answers, instantly"
        sub="Answers come from your roster, your scheme, and your breakdown data — never made up."
      />

      <div className="flex-1 flex flex-col gap-4 mb-6">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
          >
            {m.role === "ai" && (
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-mind/40 bg-mind/10 text-mind">
                <Brain size={16} />
              </span>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4.5 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-grass/15 border border-grass/30 rounded-br-sm"
                  : "bg-card border border-line rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
            {m.role === "user" && (
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-grass/40 bg-grass/10 text-grass">
                <User size={16} />
              </span>
            )}
          </motion.div>
        ))}
      </div>

      <div className="sticky bottom-0 pb-8 bg-gradient-to-t from-pitch via-pitch to-transparent pt-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-mind/30 bg-mind/5 px-3.5 py-1.5 text-xs text-mind transition hover:bg-mind/15"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-line bg-card px-5 py-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your team or this week's opponent…"
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-dim"
          />
          <button
            type="submit"
            className="grid size-9 place-items-center rounded-full bg-mind text-white transition hover:brightness-110"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
