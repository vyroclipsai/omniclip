"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, ArrowRight, Sparkles } from "lucide-react";

export default function FinalCta() {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (videoUrl.trim()) {
      router.push(`/app?url=${encodeURIComponent(videoUrl.trim())}`);
    } else {
      router.push("/app");
    }
  };

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-background-deep via-brand-950/20 to-background-deep border-t border-border-subtle relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-600/20 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          Start Creating Now
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
          Ready to multiply your video reach by 10x?
        </h2>

        <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mb-10">
          Drop your link below and see your first 3 viral clips generated in minutes.
        </p>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto p-2 rounded-2xl sm:rounded-full bg-background-surface/90 border border-border-default/90 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center gap-2"
        >
          <div className="flex items-center gap-3 w-full px-4 py-2 sm:py-0">
            <LinkIcon className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Drop a video link to get started..."
              className="w-full bg-transparent text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl sm:rounded-full text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 shadow-lg shadow-brand-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
          >
            Get Free Clips
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          100% Free & Open Source • Self-Hosted on your machine • MIT Licensed
        </p>
      </div>
    </section>
  );
}
