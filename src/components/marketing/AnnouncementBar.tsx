"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function AnnouncementBar() {
  return (
    <div className="relative z-50 bg-gradient-to-r from-brand-900/60 via-brand-600/30 to-purple-900/60 border-b border-border-default/60 px-4 py-2 text-center text-xs md:text-sm font-medium backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-semibold tracking-wide uppercase">
          <Sparkles className="w-3 h-3 text-brand-400 animate-pulse" />
          New v2.5 Engine
        </span>
        <span className="text-gray-300">
          Smart Subject-Tracking Reframe & Word-Level Karaoke Captions now live.
        </span>
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-brand-300 hover:text-white font-semibold transition-colors group ml-1"
        >
          Try free
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
