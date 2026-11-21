"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link as LinkIcon,
  Upload,
  Sparkles,
  Play,
  ArrowRight,
  Flame,
  CheckCircle2,
  Youtube,
  Video,
} from "lucide-react";

export default function HeroSection() {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState("");

  const handleGetClips = (e: React.FormEvent) => {
    e.preventDefault();
    if (videoUrl.trim()) {
      router.push(`/app?url=${encodeURIComponent(videoUrl.trim())}`);
    } else {
      router.push("/app");
    }
  };

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-brand-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs sm:text-sm font-medium mb-6 backdrop-blur-md shadow-lg shadow-brand-500/10">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span>Generative AI Video Clipping for TikTok, Shorts & Reels</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.1] mb-6">
          1 long video into{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-purple-300 to-indigo-400">
            10 viral clips.
          </span>{" "}
          10x faster.
        </h1>

        {/* Sub-headline */}
        <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-normal mb-10 leading-relaxed">
          OmniClip AI analyzes speech, facial pacing, and storytelling hooks to automatically cut,
          reframe to 9:16, and generate word-synced karaoke captions.
        </p>

        {/* Hero Dual Action Pill */}
        <div className="max-w-3xl mx-auto mb-6">
          <form
            onSubmit={handleGetClips}
            className="p-2 sm:p-2.5 rounded-2xl sm:rounded-full bg-background-surface/90 border border-border-default/90 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center gap-2.5 transition-all focus-within:border-brand-500/70 focus-within:ring-2 focus-within:ring-brand-500/20"
          >
            {/* URL Input */}
            <div className="flex items-center gap-3 w-full px-4 py-2 sm:py-0">
              <LinkIcon className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Drop a video link (YouTube, Loom, Vimeo, Podcasts)..."
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl sm:rounded-full text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 shadow-lg shadow-brand-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                Get Free Clips
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => router.push("/app")}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl sm:rounded-full text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-border-default hover:border-gray-500 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden md:inline">Upload File</span>
              </button>
            </div>
          </form>
        </div>

        {/* Platform Notes */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Youtube className="w-4 h-4 text-red-500" /> YouTube
          </span>
          <span className="flex items-center gap-1.5">
            <Video className="w-4 h-4 text-blue-400" /> Zoom & Webinars
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 20+ Languages
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% Free & Open Source
          </span>
        </div>

        {/* Live Interactive Transformation Showcase */}
        <div className="mt-16 sm:mt-20 max-w-5xl mx-auto rounded-3xl bg-background-surface/80 border border-border-default/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl relative group">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Original 16:9 Input Mockup */}
            <div className="md:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 mb-3">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Original Source (16:9 Horizontal)
              </div>
              <div className="w-full aspect-video rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-border-default relative overflow-hidden flex items-center justify-center shadow-inner">
                {/* Simulated Waveform & Player */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-transparent to-black" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">Full-Length Episode #142</p>
                    <p className="text-xs text-gray-400">Duration: 48:20 • 1080p 60fps</p>
                  </div>
                </div>

                {/* Subtitle track preview */}
                <div className="absolute bottom-3 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-xs text-gray-300 border border-white/5">
                  &ldquo;The single biggest mistake founders make is building before talking to 50
                  customers...&rdquo;
                </div>
              </div>
            </div>

            {/* Middle Transform Arrow */}
            <div className="md:col-span-1 hidden md:flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-brand-600/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-lg shadow-brand-500/20">
                <ArrowRight className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            {/* Right: Generated 9:16 Viral Short with Virality Badge */}
            <div className="md:col-span-4 flex flex-col items-center text-left">
              <div className="w-full flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
                  <Flame className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  Virality Score: 98/100
                </div>
                <span className="text-xs font-mono text-gray-400">0:42s</span>
              </div>

              {/* 9:16 Vertical Preview Container */}
              <div className="w-full max-w-[240px] aspect-[9/16] rounded-2xl bg-gradient-to-b from-purple-950/60 via-background-card to-black border-2 border-brand-500/50 shadow-2xl shadow-brand-600/20 relative overflow-hidden flex flex-col justify-between p-3.5">
                {/* Active speaker bounding box */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border border-brand-400/30 bg-gradient-to-t from-transparent via-brand-500/10 to-transparent flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-brand-600/20 border border-brand-400/50 flex items-center justify-center">
                    <span className="text-2xl">🎙️</span>
                  </div>
                </div>

                {/* Top Hook Pill */}
                <div className="relative z-10 self-start bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase text-yellow-400 border border-yellow-400/30">
                  ⚡ TOP HOOK DETECTED
                </div>

                {/* Animated Word-by-Word Karaoke Subtitles */}
                <div className="relative z-10 text-center my-auto px-1">
                  <div className="inline-block bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-xl">
                    <p className="text-xs sm:text-sm font-black uppercase tracking-tight text-white leading-tight">
                      STOP BUILDING{" "}
                      <span className="bg-yellow-400 text-black px-1.5 py-0.5 rounded font-black shadow-md">
                        BEFORE
                      </span>{" "}
                      TALKING TO USERS!
                    </p>
                  </div>
                </div>

                {/* Bottom platform badges */}
                <div className="relative z-10 flex items-center justify-between text-[11px] text-gray-300 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/5">
                  <span className="font-semibold text-white">Clip #1</span>
                  <span className="text-brand-300 font-mono text-[10px]">TikTok • Shorts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
