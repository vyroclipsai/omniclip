"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const faqs: FaqItem[] = [
  {
    q: "How does the AI determine the Virality Score for each clip?",
    a: "Our Virality Score algorithm evaluates three core dimensions: Hook strength (attention-capturing phrases in the first 3 seconds), Pacing (conversational cadence without dead air or filler words), and Emotional Resonance (clarity, humor, or surprising takeaways). Clips are ranked on a 0 to 100 scale.",
  },
  {
    q: "How does the Smart 9:16 reframe work?",
    a: "OmniClip runs local computer vision face and subject detection. It anchors a 1080x1920 vertical bounding box directly around the active speaker. If the speaker moves or gestures, the frame smoothly pans to track them without abrupt jumps.",
  },
  {
    q: "Can I customize the animated karaoke captions?",
    a: "Yes! You can choose font family, active highlight color (Yellow, Cyan, Neon Green, Pink), word line count, and shadow/stroke styles in the built-in Timeline & Subtitle Editor before exporting.",
  },
  {
    q: "Does OmniClip require paid external cloud APIs?",
    a: "No! OmniClip is built to run 100% locally on your machine with local Whisper speech recognition, OpenCV vision processing, and FFmpeg rendering. Zero per-minute cloud fees.",
  },
  {
    q: "What video formats and input links are supported?",
    a: "You can paste links directly from YouTube, Vimeo, Loom, or public video podcasts, or upload MP4, MOV, and WebM files up to 4K resolution.",
  },
  {
    q: "Can I edit the generated subtitles if a word is misspelled?",
    a: "Absolutely. In the Timeline Editor, you can click on any word in the transcript to edit spelling, adjust timestamps, or delete phrases before final rendering.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-background-deep border-t border-border-subtle">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-4">
            Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Everything you need to know
          </h2>
          <p className="text-base sm:text-lg text-gray-400">
            Have questions about OmniClip AI? Here are the answers to our most common queries.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="rounded-2xl bg-background-surface/80 border border-border-default/80 overflow-hidden transition-all shadow-sm"
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <span className="text-base sm:text-lg font-semibold text-white">{faq.q}</span>
                  <div
                    className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-brand-500/20 text-brand-300" : "text-gray-400"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm sm:text-base text-gray-400 leading-relaxed border-t border-border-subtle/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
