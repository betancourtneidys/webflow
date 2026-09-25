"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useT } from "./LangProvider";

export function OnCallQuotes() {
  const quotes = useT().quotes;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % quotes.length), 4200);
    return () => clearInterval(id);
  }, [quotes.length]);

  return (
    <div className="relative h-5 overflow-hidden font-mono text-[12.5px] text-faint" aria-live="off">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          “{quotes[index]}”
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
