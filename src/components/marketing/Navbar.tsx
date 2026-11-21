"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronDown,
  Video,
  Captions,
  Crop,
  Layers,
  Volume2,
  Mic,
  Users,
  Compass,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <nav className="sticky top-0 z-40 w-full glass-nav border-b border-border-subtle/80 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 via-indigo-600 to-purple-800 flex items-center justify-center shadow-lg shadow-brand-600/30 group-hover:scale-105 transition-transform duration-200 border border-brand-400/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              OmniClip
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-brand-500/20 text-brand-300 border border-brand-500/40">
                AI
              </span>
            </span>
            <span className="text-[10px] text-gray-400 -mt-1 tracking-wider uppercase font-medium">
              Viral Video Engine
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2">
          {/* Features Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("features")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              Features
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 text-gray-400" />
            </button>

            {activeDropdown === "features" && (
              <div className="absolute top-full left-0 w-[540px] p-4 bg-background-surface/95 border border-border-default/90 rounded-2xl shadow-2xl backdrop-blur-xl grid grid-cols-2 gap-2 z-50">
                <Link
                  href="/app"
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                      AI Highlight Clipping
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Extract high-converting hooks & viral moments automatically.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/app"
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                    <Captions className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-yellow-300 transition-colors">
                      Karaoke Captions
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Animated word-synced captions with 99% accuracy.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/app"
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                    <Crop className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      Smart 9:16 Reframe
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dynamic face & speaker tracking keeps subjects centered.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/app"
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                      AI B-Roll Generator
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Contextual visuals and overlays placed intelligently.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/app"
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      Audio Magic
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Removes background noise and enhances voice clarity.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/app"
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-pink-300 transition-colors">
                      Multi-Speaker Detection
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Auto-switches focus when different guests speak.
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Solutions Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("solutions")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              Solutions
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 text-gray-400" />
            </button>

            {activeDropdown === "solutions" && (
              <div className="absolute top-full left-0 w-80 p-3 bg-background-surface/95 border border-border-default/90 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col gap-1 z-50">
                <Link
                  href="/app"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Users className="w-4 h-4 text-brand-400" />
                  <div>
                    <div className="text-sm font-medium text-white">For Podcasters</div>
                    <div className="text-xs text-gray-400">Turn 2-hour episodes into 20 viral moments</div>
                  </div>
                </Link>
                <Link
                  href="/app"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-sm font-medium text-white">For Video Creators</div>
                    <div className="text-xs text-gray-400">Scale your YouTube Shorts & TikTok output</div>
                  </div>
                </Link>
                <Link
                  href="/app"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Video className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-sm font-medium text-white">For Marketing Teams</div>
                    <div className="text-xs text-gray-400">Repurpose webinars & customer interviews</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/app"
            className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            Studio App
          </Link>
          <Link
            href="#faq"
            className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            Documentation
          </Link>
          <Link
            href="/settings"
            className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            Settings
          </Link>
        </div>

        {/* Right CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/app"
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Get Free Clips
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-3 pb-6 bg-background-surface/98 border-b border-border-default space-y-3">
          <Link
            href="/app"
            className="block px-3 py-2 text-base font-medium text-white rounded-lg hover:bg-white/5"
            onClick={() => setMobileMenuOpen(false)}
          >
            Features & AI Tools
          </Link>
          <Link
            href="/settings"
            className="block px-3 py-2 text-base font-medium text-white rounded-lg hover:bg-white/5"
            onClick={() => setMobileMenuOpen(false)}
          >
            Diagnostics & Settings
          </Link>
          <Link
            href="#faq"
            className="block px-3 py-2 text-base font-medium text-white rounded-lg hover:bg-white/5"
            onClick={() => setMobileMenuOpen(false)}
          >
            FAQ & Documentation
          </Link>
          <div className="pt-4 border-t border-border-subtle flex flex-col gap-2">
            <Link
              href="/app"
              className="w-full text-center py-2.5 text-sm font-medium text-gray-300 hover:text-white rounded-xl border border-border-default"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/app"
              className="w-full text-center py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-purple-600 rounded-xl shadow-lg shadow-brand-600/30"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Free Clips
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
