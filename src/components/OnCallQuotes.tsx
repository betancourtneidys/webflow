"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const QUOTES = [
  "It's not DNS. There's no way it's DNS. It was DNS.",
  "Nobody changed anything. Somebody changed something.",
  "The dashboard is green. The customers disagree.",
  "Works on my machine. Your machine is not production.",
  "Deploying on a Friday at 5 p.m.? Bold.",
];

export function OnCallQuotes() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), 4200);
    return () => clearInterval(id);
  }, []);

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
          “{QUOTES[index]}”
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
