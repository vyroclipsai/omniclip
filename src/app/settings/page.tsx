"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Key,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Save,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Database
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface HealthCheckData {
  status: string;
  healthy: boolean;
  timestamp: string;
  checks: {
    ffmpeg: { ok: boolean; version?: string; error?: string };
    ffprobe: { ok: boolean; version?: string; error?: string };
    python: { ok: boolean; version?: string; error?: string };
    environment: {
      hasOpenAiKey: boolean;
      hasGeminiKey: boolean;
      hasCookies: boolean;
      apiUrl: string;
    };
  };
}

export default function SettingsPage() {
  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  // Preference Settings
  const [defaultAspectRatio, setDefaultAspectRatio] = useState("9:16");
  const [defaultCaptionPreset, setDefaultCaptionPreset] = useState("viral_yellow");
  const [defaultCaptionPosition, setDefaultCaptionPosition] = useState("bottom");
  const [defaultMaxClips, setDefaultMaxClips] = useState(5);
  const [defaultRenderMode, setDefaultRenderMode] = useState("crop");

  // API Key inputs (for local user convenience)
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadHealth = async () => {
    setLoadingHealth(true);
    const { data } = await apiFetch<HealthCheckData>("/api/health");
    if (data) {
      setHealthData(data);
    }
    setLoadingHealth(false);
  };

  useEffect(() => {
    loadHealth();

    // Load saved preferences from localStorage
    const savedAspect = localStorage.getItem("omniclip_pref_aspect");
    if (savedAspect) setDefaultAspectRatio(savedAspect);

    const savedCaption = localStorage.getItem("omniclip_pref_caption");
    if (savedCaption) setDefaultCaptionPreset(savedCaption);

    const savedPos = localStorage.getItem("omniclip_pref_pos");
    if (savedPos) setDefaultCaptionPosition(savedPos);

    const savedClips = localStorage.getItem("omniclip_pref_max_clips");
    if (savedClips) setDefaultMaxClips(parseInt(savedClips, 10));

    const savedMode = localStorage.getItem("omniclip_pref_render_mode");
    if (savedMode) setDefaultRenderMode(savedMode);
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem("omniclip_pref_aspect", defaultAspectRatio);
    localStorage.setItem("omniclip_pref_caption", defaultCaptionPreset);
    localStorage.setItem("omniclip_pref_pos", defaultCaptionPosition);
    localStorage.setItem("omniclip_pref_max_clips", String(defaultMaxClips));
    localStorage.setItem("omniclip_pref_render_mode", defaultRenderMode);

    showToast("Preferences saved successfully!");
  };

  return (
    <div className="min-h-screen bg-[#08090A] text-white flex flex-col">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#1E2227] border border-violet-500/40 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#1F2328] bg-[#0B0D0E]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-5 w-[1px] bg-white/10" />
          <div>
            <h1 className="text-base font-bold text-white">System Diagnostics & Settings</h1>
            <p className="text-xs text-gray-400">Configure AI keys, pipeline presets, and verify runtime health</p>
          </div>
        </div>

        <button
          onClick={loadHealth}
          disabled={loadingHealth}
          className="px-3.5 py-1.5 bg-[#181B1F] hover:bg-[#22262B] border border-[#272C33] rounded-lg text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? "animate-spin" : ""}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </header>

      {/* Main Settings Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-8">
        {/* 1. System Health Diagnostics Card */}
        <section className="bg-[#0B0D0E] border border-[#1F2328] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-violet-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                System Runtime Diagnostics
              </h2>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                healthData?.healthy
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${healthData?.healthy ? "bg-emerald-400" : "bg-rose-400"}`} />
              {healthData?.healthy ? "Healthy & Ready" : "Attention Required"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* FFmpeg */}
            <div className="p-4 rounded-xl bg-[#121517] border border-[#1F2328]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-300">FFmpeg Engine</span>
                {healthData?.checks.ffmpeg.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <p className="text-xs font-mono text-gray-400 truncate">
                {healthData?.checks.ffmpeg.version || "Checking..."}
              </p>
              <span className="text-[10px] text-gray-500 mt-1 block">Video reframing & subtitle burn-in</span>
            </div>

            {/* Python */}
            <div className="p-4 rounded-xl bg-[#121517] border border-[#1F2328]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-300">Python AI Environment</span>
                {healthData?.checks.python.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <p className="text-xs font-mono text-gray-400 truncate">
                {healthData?.checks.python.version || "Checking..."}
              </p>
              <span className="text-[10px] text-gray-500 mt-1 block">Whisper & OpenCV face tracking</span>
            </div>

            {/* Ingestion & Cookies */}
            <div className="p-4 rounded-xl bg-[#121517] border border-[#1F2328]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-300">YouTube Ingestion</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-gray-400">
                {healthData?.checks.environment.hasCookies ? "Cookies Configured" : "Standard yt-dlp Mode"}
              </p>
              <span className="text-[10px] text-gray-500 mt-1 block">Normalized URL caching active</span>
            </div>
          </div>
        </section>

        {/* 2. AI Model & API Keys Configuration */}
        <section className="bg-[#0B0D0E] border border-[#1F2328] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-violet-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                AI Virality Model Configuration
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                OmniClip automatically falls back to our high-precision local virality heuristic engine when no keys are set.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OpenAI API Key */}
            <div className="p-4 rounded-xl bg-[#121517] border border-[#1F2328] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">OpenAI API Key (gpt-4o-mini)</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    healthData?.checks.environment.hasOpenAiKey
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-gray-800 text-gray-400 border-gray-700"
                  }`}
                >
                  {healthData?.checks.environment.hasOpenAiKey ? "Configured in .env" : "Not Set"}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Used to evaluate transcripts, identify curiosity-gap hooks, and predict virality scores.
              </p>
            </div>

            {/* Gemini API Key */}
            <div className="p-4 rounded-xl bg-[#121517] border border-[#1F2328] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Google Gemini Key (gemini-2.5-flash)</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    healthData?.checks.environment.hasGeminiKey
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-gray-800 text-gray-400 border-gray-700"
                  }`}
                >
                  {healthData?.checks.environment.hasGeminiKey ? "Configured in .env" : "Not Set"}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Ultra-fast multimodal transcript highlight extraction with structured JSON generation.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Pipeline Default Preferences */}
        <section className="bg-[#0B0D0E] border border-[#1F2328] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-violet-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Default Processing Preferences
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                These settings will be pre-selected when submitting new videos or YouTube URLs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Default Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "9:16", label: "9:16 Vertical" },
                  { id: "1:1", label: "1:1 Square" },
                  { id: "16:9", label: "16:9 Landscape" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDefaultAspectRatio(item.id)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      defaultAspectRatio === item.id
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : "bg-[#14171A] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Framing Mode */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Framing Technique</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "crop", label: "Smart Speaker Crop" },
                  { id: "blur_bg", label: "Blur Background Fill" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDefaultRenderMode(item.id)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      defaultRenderMode === item.id
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : "bg-[#14171A] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle Style Preset */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Default Subtitle Preset</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "viral_yellow", name: "Viral Yellow", color: "#FACC15" },
                  { id: "neon_green", name: "Neon Green", color: "#10B981" },
                  { id: "cyber_cyan", name: "Cyber Cyan", color: "#06B6D4" },
                  { id: "fire_orange", name: "Fire Orange", color: "#F97316" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDefaultCaptionPreset(preset.id)}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                      defaultCaptionPreset === preset.id
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : "bg-[#14171A] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.color }} />
                    <span className="text-xs font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle Position */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Default Subtitle Position</label>
              <div className="grid grid-cols-3 gap-2">
                {(["bottom", "middle", "top"] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setDefaultCaptionPosition(pos)}
                    className={`py-2 text-xs font-semibold capitalize rounded-lg border transition ${
                      defaultCaptionPosition === pos
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : "bg-[#14171A] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-lg shadow-violet-950/40"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
