"use client";

import { useState } from "react";
import {
  Sparkles,
  Captions,
  Crop,
  Layers,
  Volume2,
  Mic,
  CheckCircle2,
  ArrowRight,
  Flame,
} from "lucide-react";
import Link from "next/link";

interface FeatureTab {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  description: string;
  benefits: string[];
  statNumber: string;
  statLabel: string;
  previewTag: string;
  sampleHeadline: string;
  sampleSubtitle: string;
  sampleHighlightWord: string;
}

const tabs: FeatureTab[] = [
  {
    id: "clipping",
    name: "AI Clipping",
    icon: Sparkles,
    tagline: "Instantly extracts peak virality hooks and punchlines",
    description:
      "Our multimodal AI scans your full recording, evaluates conversational pacing, identifies emotional peaks, and isolates self-contained viral stories with zero manual scrubbing.",
    benefits: [
      "Patented Virality Score algorithm (0-100 score per clip)",
      "Identifies attention hooks in the first 3 seconds",
      "Eliminates filler words (um, uh, pauses) automatically",
    ],
    statNumber: "10x",
    statLabel: "Faster Production Velocity",
    previewTag: "VIRALITY SCORE: 99",
    sampleHeadline: "HOW I SCALED TO 10M VIEWS",
    sampleSubtitle: "THE ONE SECRET YOU ARE MISSING",
    sampleHighlightWord: "SECRET",
  },
  {
    id: "captions",
    name: "Dynamic Captions",
    icon: Captions,
    tagline: "Word-by-word synced animated karaoke text",
    description:
      "Over 85% of social video is watched on mute. OmniClip generates high-retention animated subtitles with active word highlights in vibrant yellow, cyan, and neon green.",
    benefits: [
      "99.2% transcription accuracy powered by Whisper",
      "Customizable typography, active word color, and emojis",
      "Multi-language support across 20+ dialects",
    ],
    statNumber: "2.5x",
    statLabel: "Average Watch Time & Retention",
    previewTag: "KARAOKE SYNC v2",
    sampleHeadline: "NEVER STOP TESTING",
    sampleSubtitle: "UNTIL YOU HIT MASSIVE BREAKTHROUGH",
    sampleHighlightWord: "BREAKTHROUGH",
  },
  {
    id: "reframe",
    name: "Smart 9:16 Reframe",
    icon: Crop,
    tagline: "Computer vision face tracking centered on the speaker",
    description:
      "Stop wasting hours panning and cropping horizontal video. Our AI computer vision model tracks the active speaker's face and keeps them centered in a crystal-clear 1080x1920 canvas.",
    benefits: [
      "Dynamic smooth bounding box tracking without jitter",
      "Intelligent multi-speaker split-screen layouts",
      "Maintains perfect 9:16 aspect ratio across all social platforms",
    ],
    statNumber: "1080p",
    statLabel: "Crisp Vertical Render Quality",
    previewTag: "AUTO-TRACKING ACTIVE",
    sampleHeadline: "ALWAYS STAY IN FRAME",
    sampleSubtitle: "NO MATTER WHERE YOU MOVE ON STAGE",
    sampleHighlightWord: "MOVE",
  },
  {
    id: "broll",
    name: "AI B-Roll",
    icon: Layers,
    tagline: "Contextual visual cutaways placed automatically",
    description:
      "Keep retention high during longer monologues. OmniClip understands the topic being discussed and overlays cinematic contextual visuals right at key transition points.",
    benefits: [
      "Context-aware image and video clip insertion",
      "Seamless cross-dissolve transitions",
      "Dramatically reduces audience drop-off",
    ],
    statNumber: "48%",
    statLabel: "Lower Audience Drop-Off",
    previewTag: "B-ROLL ENGINE",
    sampleHeadline: "VISUAL STORYTELLING",
    sampleSubtitle: "HOLDS ATTENTION UNTIL THE LAST SECOND",
    sampleHighlightWord: "ATTENTION",
  },
  {
    id: "audio",
    name: "Audio Magic",
    icon: Volume2,
    tagline: "Studio voice mastering & background noise removal",
    description:
      "Turn noisy room echo, fan whines, and low-mic levels into broadcast-quality audio. OmniClip automatically balances dynamic range and enhances vocal clarity.",
    benefits: [
      "Automatic ambient noise cancellation",
      "Vocal presence boost and sibilance reduction",
      "Consistent loudness normalization (-14 LUFS standard)",
    ],
    statNumber: "-14 LUFS",
    statLabel: "Broadcast Mastered Audio",
    previewTag: "STUDIO AUDIO",
    sampleHeadline: "CRYSTAL CLEAR VOCALS",
    sampleSubtitle: "EVEN IN NOISY COFFEE SHOPS",
    sampleHighlightWord: "CLEAR",
  },
  {
    id: "voiceover",
    name: "Multi-Speaker",
    icon: Mic,
    tagline: "Smart speaker switching for podcasts and panel discussions",
    description:
      "Whether you host a 2-person podcast or a 5-person roundtable, OmniClip identifies speaker changes instantly and cuts between cameras like a professional live director.",
    benefits: [
      "Speaker diarization with individual voice prints",
      "Automated camera switching on dialogue changes",
      "Side-by-side or stacked multi-speaker layouts",
    ],
    statNumber: "100%",
    statLabel: "Automated Camera Switching",
    previewTag: "MULTI-SPEAKER",
    sampleHeadline: "PODCAST DIRECTING",
    sampleSubtitle: "HANDLED FULLY IN THE BACKGROUND",
    sampleHighlightWord: "BACKGROUND",
  },
];

export default function FeatureTabSwitcher() {
  const [activeTab, setActiveTab] = useState<string>("clipping");
  const current = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-20 md:py-28 bg-background-base border-t border-border-subtle/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-4">
            Powerful AI Video Suite
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Everything you need to dominate short-form video
          </h2>
          <p className="text-base sm:text-lg text-gray-400">
            A complete suite of generative video tools engineered for maximum social media retention.
          </p>
        </div>

        {/* Tab Buttons Strip */}
        <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 mb-12 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30 border border-brand-400/40"
                    : "bg-background-surface/80 text-gray-400 hover:text-white hover:bg-white/5 border border-border-default"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Showcase Card */}
        <div className="rounded-3xl bg-background-surface/90 border border-border-default/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-brand-300 mb-4">
                <current.icon className="w-3.5 h-3.5 text-brand-400" />
                {current.name}
              </div>

              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-4 leading-snug">
                {current.tagline}
              </h3>

              <p className="text-base text-gray-400 mb-8 leading-relaxed">
                {current.description}
              </p>

              <div className="space-y-3.5 mb-10 w-full">
                {current.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Stat Card & CTA */}
              <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-border-subtle w-full">
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white">
                    {current.statNumber}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    {current.statLabel}
                  </div>
                </div>

                <Link
                  href="/app"
                  className="ml-auto inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 border border-border-default hover:border-gray-500 transition-all group"
                >
                  Try this feature
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Right Interactive Simulation Preview */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[280px] aspect-[9/16] rounded-3xl bg-gradient-to-b from-gray-900 via-background-card to-black border-2 border-brand-500/40 p-4 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
                {/* Glow Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl" />

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold tracking-wider">
                    <Flame className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                    {current.previewTag}
                  </div>
                  <span className="text-[11px] font-mono text-gray-400">9:16</span>
                </div>

                {/* Simulated Speaker / Face Area */}
                <div className="relative z-10 my-auto flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-brand-600/20 border-2 border-dashed border-brand-400/60 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-brand-500/10">
                    🗣️
                  </div>

                  {/* Word-synced subtitle card */}
                  <div className="bg-black/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 text-center max-w-[240px] shadow-2xl">
                    <div className="text-xs font-black uppercase text-white tracking-wide">
                      {current.sampleHeadline}
                    </div>
                    <div className="text-[11px] font-extrabold uppercase text-gray-300 mt-1">
                      {current.sampleSubtitle.split(current.sampleHighlightWord)[0]}
                      <span className="bg-yellow-400 text-black px-1.5 py-0.5 rounded font-black">
                        {current.sampleHighlightWord}
                      </span>
                      {current.sampleSubtitle.split(current.sampleHighlightWord)[1]}
                    </div>
                  </div>
                </div>

                {/* Bottom Control Bar */}
                <div className="relative z-10 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="text-white font-medium">Export Ready</span>
                  <span className="text-brand-300 font-mono">1080×1920</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
