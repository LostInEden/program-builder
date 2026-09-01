"use client";

import { motion } from "motion/react";

export default function PageHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-8"
    >
      <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-grass mb-1">
        {eyebrow}
      </div>
      <h1 className="display text-4xl md:text-5xl font-bold text-ink">{title}</h1>
      {sub && <p className="mt-2 text-dim max-w-2xl">{sub}</p>}
    </motion.header>
  );
}
