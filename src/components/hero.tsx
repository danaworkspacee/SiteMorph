"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import UrlInput from "./url-input";
import { Logo } from "./svgs";
import { toast } from "sonner";

// The highlighted word in the hero headline rotates through these words,
// like Notion's hero. Kept short so the headline stays on one line.
const ROTATING_WORDS = ["clean", "readable", "beautiful", "modern"];

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async () => {
    try {
      toast.info('Processing your download request...', {
        duration: 8000,
        description: 'Your download will start automatically when ready.'
      });
      // Note: We don't need to make an API call here anymore
      // The UrlInput component now handles the download directly
    } catch (error) {
      console.error('Error downloading website:', error);
      toast.error(`Failed to download: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-20 sm:py-24">
      <div className="flex flex-col items-center justify-center gap-5 w-full text-center">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span className="text-xl font-semibold tracking-tight text-black">SiteMorph</span>
        </div>
        <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] font-medium tracking-[-0.028em] leading-[1.04] text-black">
          Morph any website into{" "}
          <span className="inline-block rounded-full bg-[#ffb110] px-5 py-1">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ROTATING_WORDS[wordIndex]}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="inline-block"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>{" "}
          HTML + Tailwind.
        </h1>
        <p className="font-serif text-lg leading-relaxed text-[#615d59] max-w-xl">
          Paste any website URL and get clean, readable HTML + Tailwind. No AI agent, no API key. Just the files, ready to deploy anywhere.
        </p>
      </div>

      <div className="w-full max-w-xl">
        <UrlInput onSubmit={handleSubmit} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#757575]">
        <span className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-[#0075de]" />
          Easy to use
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-[#0075de]" />
          No API key needed
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-[#0075de]" />
          Deployment coming soon
        </span>
      </div>
    </div>
  );
}
