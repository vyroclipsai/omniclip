"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Link as LinkIcon,
  Upload,
  Play,
  Flame,
  ArrowRight,
  Clock,
  Layers,
  Sliders,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Settings,
  Sun,
  Moon,
  Trash2,
  Download,
  Film,
  FileVideo,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { Project } from "@/lib/db";
import { apiFetch, getApiUrl } from "@/lib/api-client";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorBanner, setErrorBanner] = useState<{ error: string; details?: string } | null>(null);

  // Core Options Row State
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "1:1" | "16:9">("9:16");
  const [clipLengthRange, setClipLengthRange] = useState<"20-40" | "30-60" | "60-90">("30-60");
  const [maxClips, setMaxClips] = useState<number>(8);
  const [language, setLanguage] = useState<string>("auto");
  const [captionStyle, setCaptionStyle] = useState<string>("viral_yellow");

  // Advanced Options State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resolution, setResolution] = useState<"1080p" | "720p">("1080p");
  const [renderMode, setRenderMode] = useState<"crop" | "blur_bg">("crop");
  const [minScore, setMinScore] = useState<number>(65);
  const [clipStyle, setClipStyle] = useState<string>("default");
  const [topicFocus, setTopicFocus] = useState<string>("");
  const [isLightMode, setIsLightMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch recent projects for bottom section
  const fetchRecentProjects = async () => {
    const { data } = await apiFetch<{ success: boolean; projects: Project[] }>("/api/projects");
    if (data?.success && data.projects) {
      setProjects(data.projects);
    }
  };

  useEffect(() => {
    fetchRecentProjects();
    const savedAspect = localStorage.getItem("omniclip_pref_aspect");
    if (savedAspect) setAspectRatio(savedAspect as any);
    const savedCaption = localStorage.getItem("omniclip_pref_caption");
    if (savedCaption) setCaptionStyle(savedCaption);
  }, []);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    document.documentElement.classList.toggle("light", !isLightMode);
  };

  // Submission handler for URL
  const handleGenerateFromUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) return;

    setLoading(true);
    setErrorBanner(null);

    try {
      // 1. Create project
      const { data: projData, error: projErr } = await apiFetch<{ success: boolean; project: Project }>(
        "/api/projects",
        {
          method: "POST",
          body: JSON.stringify({ url: inputUrl.trim() }),
        }
      );

      if (!projData?.success || !projData.project) {
        setErrorBanner({
          error: projErr?.error || "Failed to create project",
          details: projErr?.details,
        });
        setLoading(false);
        return;
      }

      const targetId = projData.project.id;

      // 2. Dispatch processing job with chosen options
      const [minDur, maxDur] = clipLengthRange.split("-").map(Number);
      await apiFetch(`/api/projects/${targetId}/process`, {
        method: "POST",
        body: JSON.stringify({
          maxClips,
          minScore,
          clipStyle,
          prompt: topicFocus,
          minDuration: minDur,
          maxDuration: maxDur,
          aspectRatio,
          resolution,
          renderMode,
          captionStyle,
          language,
        }),
      });

      // 3. Immediately redirect to processing screen
      router.push(`/project/${targetId}`);
    } catch (err: any) {
      setErrorBanner({ error: "Pipeline connection failed", details: err?.message || String(err) });
      setLoading(false);
    }
  };

  // Upload handler for dropped or picked files
  const handleUploadFile = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setErrorBanner(null);

    const [minDur, maxDur] = clipLengthRange.split("-").map(Number);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("maxClips", String(maxClips));
    formData.append("clipStyle", clipStyle);
    formData.append("minScore", String(minScore));
    formData.append("minDuration", String(minDur));
    formData.append("maxDuration", String(maxDur));
    formData.append("aspectRatio", aspectRatio);
    formData.append("resolution", resolution);
    formData.append("renderMode", renderMode);
    formData.append("captionStyle", captionStyle);
    formData.append("language", language);
    formData.append("prompt", topicFocus);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data?.success && data.projectId) {
        router.push(`/project/${data.projectId}`);
      } else {
        setErrorBanner({ error: data?.error || "Upload failed", details: data?.details });
        setIsUploading(false);
      }
    } catch (err: any) {
      setErrorBanner({ error: "Upload failed", details: err?.message || String(err) });
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      handleUploadFile(file);
    } else if (file) {
      handleUploadFile(file);
    }
  };

  return (
    <div className={`min-h-screen ${isLightMode ? "bg-[#F8F9FA] text-[#111827]" : "bg-[#08090A] text-white"} flex flex-col transition-colors`}>
      {/* Top Header */}
      <header className={`h-16 border-b ${isLightMode ? "border-gray-200 bg-white/90" : "border-[#1F2328] bg-[#0B0D0E]/80"} backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30`}>
        <div className="flex items-center gap-6">
          <Link href="/app" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-600/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold tracking-tight ${isLightMode ? "text-gray-900" : "text-white"}`}>OmniClip AI</span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-violet-600/20 text-violet-400 border border-violet-500/30">
                100% Free & Open Source
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold pl-6 border-l border-white/10">
            <Link href="/app" className="text-violet-400 font-bold">
              Home
            </Link>
            <Link href="/projects" className="text-gray-400 hover:text-white transition">
              Projects ({projects.length})
            </Link>
            <Link href="/status" className="text-gray-400 hover:text-white transition flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span>Status</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/status"
            className={`px-3 py-1.5 rounded-lg border text-xs transition flex items-center gap-1.5 md:hidden ${
              isLightMode
                ? "bg-gray-100 border-gray-300 text-gray-700"
                : "bg-white/5 border-white/10 text-gray-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>Health</span>
          </Link>

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border text-xs transition ${
              isLightMode
                ? "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            }`}
            title="Toggle Light/Dark Theme"
          >
            {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <Link
            href="/projects"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
            <span>My Projects</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Error Banner */}
        {errorBanner && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-200 text-sm">{errorBanner.error}</p>
              {errorBanner.details && (
                <p className="text-red-300/80 mt-1 font-mono text-[11px] whitespace-pre-wrap">
                  {errorBanner.details}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hero Title Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/15 border border-violet-500/30 text-violet-400 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous AI Video Repurposing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Turn Any Long Video Into <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Viral Shorts</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            AI automatically extracts the best hooks, reframes speakers to 9:16 vertical, and generates word-synced karaoke subtitles. No credit cards or subscriptions required.
          </p>
        </div>

        {/* Core Input Card (Dropzone + URL Input + Options Row) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all ${
            isDragOver
              ? "border-violet-500 bg-violet-950/20 ring-4 ring-violet-500/20"
              : isLightMode
              ? "bg-white border-gray-200"
              : "bg-[#0E1013] border-[#1F2328]"
          }`}
        >
          {/* Big Input Area */}
          <form onSubmit={handleGenerateFromUrl} className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div
                  className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                    isLightMode
                      ? "bg-gray-50 border-gray-300 focus-within:border-violet-500"
                      : "bg-[#14171A] border-[#272C33] focus-within:border-violet-500"
                  }`}
                >
                  <LinkIcon className="w-5 h-5 text-gray-400 shrink-0" />
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Paste YouTube URL (watch, shorts, youtu.be, podcast)..."
                    className={`w-full bg-transparent text-sm placeholder-gray-500 focus:outline-none ${
                      isLightMode ? "text-gray-900" : "text-white"
                    }`}
                  />
                  {inputUrl && (
                    <button
                      type="button"
                      onClick={() => setInputUrl("")}
                      className="text-xs text-gray-500 hover:text-gray-300 px-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || isUploading}
                  className={`px-5 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 border cursor-pointer ${
                    isLightMode
                      ? "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-800"
                      : "bg-[#181B1F] hover:bg-[#20252A] border-[#272C33] text-gray-200 hover:border-violet-500/50"
                  }`}
                  title="Upload MP4, MOV, WEBM, or MKV video file"
                >
                  {isUploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                  ) : (
                    <Upload className="w-4 h-4 text-violet-400" />
                  )}
                  <span>{isUploading ? "Uploading..." : "Drop File"}</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/mkv,.mp4,.mov,.webm,.mkv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file);
                  }}
                />
              </div>

              {/* Quick sample link helper */}
              <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <span>Supports YouTube, podcasts, gaming streams, interviews, and local files</span>
                <button
                  type="button"
                  onClick={() => setInputUrl("https://youtu.be/5jlDBdjz_3w")}
                  className="text-violet-400 hover:text-violet-300 font-medium transition flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Try Sample Video</span>
                </button>
              </div>
            </div>

            {/* OPTIONS ROW (Ratio, Clip Length, Number of Clips, Language, Caption Style) */}
            <div className={`p-5 rounded-2xl border space-y-4 ${
              isLightMode ? "bg-gray-50 border-gray-200" : "bg-[#121517] border-[#1F2328]"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-violet-400" />
                  <span>Curation & Format Settings</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 transition"
                >
                  <span>{showAdvanced ? "Hide Advanced" : "Advanced Prompt & Style"}</span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
                {/* 1. Aspect Ratio */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 block">Aspect Ratio</label>
                  <div className="grid grid-cols-2 gap-1">
                    {(["9:16", "4:5", "1:1", "16:9"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAspectRatio(r)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                          aspectRatio === r
                            ? "bg-violet-600/25 border-violet-500 text-white shadow-sm"
                            : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Clip Length Range */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 block">Clip Duration</label>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: "20-40", label: "20 - 40s (Snappy)" },
                      { id: "30-60", label: "30 - 60s (Standard)" },
                      { id: "60-90", label: "60 - 90s (Extended)" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setClipLengthRange(item.id as any)}
                        className={`py-1 px-2 rounded-lg text-[11px] font-medium border text-left transition truncate ${
                          clipLengthRange === item.id
                            ? "bg-violet-600/25 border-violet-500 text-white font-bold"
                            : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Number of Clips */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 block">Target Clips</label>
                  <div className="grid grid-cols-5 gap-1">
                    {[3, 5, 8, 10, 15].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setMaxClips(cnt)}
                        className={`py-2 rounded-lg text-xs font-bold border transition text-center ${
                          maxClips === cnt
                            ? "bg-violet-600/25 border-violet-500 text-white"
                            : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500 block text-center pt-1">
                    Quality over quantity
                  </span>
                </div>

                {/* 4. Language Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 block">Spoken Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-lg text-xs font-medium bg-[#181B1F] border border-[#272C33] text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                    <option value="hi">Hindi (hi)</option>
                    <option value="ja">Japanese (ja)</option>
                    <option value="pt">Portuguese (pt)</option>
                    <option value="zh">Chinese (zh)</option>
                  </select>
                  <span className="text-[10px] text-gray-500 block">Whisper word alignment</span>
                </div>

                {/* 5. Caption Style Preset */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 block">Karaoke Caption Style</label>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: "viral_yellow", name: "Viral Yellow", color: "#FACC15" },
                      { id: "neon_green", name: "Neon Green", color: "#10B981" },
                      { id: "cyber_cyan", name: "Cyber Cyan", color: "#06B6D4" },
                      { id: "fire_orange", name: "Fire Orange", color: "#F97316" },
                      { id: "clean_minimal", name: "Clean Minimal", color: "#E5E7EB" },
                      { id: "bold_pop", name: "Bold Pop", color: "#F0F900" },
                    ].map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setCaptionStyle(style.id)}
                        className={`py-1 px-1.5 rounded-lg border text-left flex items-center gap-1.5 transition ${
                          captionStyle === style.id
                            ? "bg-violet-600/25 border-violet-500 text-white font-bold"
                            : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: style.color }} />
                        <span className="text-[10px] truncate">{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expandable Advanced Steering Controls */}
              {showAdvanced && (
                <div className="pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 block">AI Style Focus Preset</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "default", name: "Balanced" },
                        { id: "educational", name: "Educational" },
                        { id: "funny", name: "Funny" },
                        { id: "storytelling", name: "Stories" },
                        { id: "controversial", name: "Controversial" },
                        { id: "inspirational", name: "Inspirational" },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setClipStyle(st.id)}
                          className={`py-1 px-1 rounded text-[10px] font-medium border text-center transition truncate ${
                            clipStyle === st.id
                              ? "bg-violet-600/25 border-violet-500 text-white font-bold"
                              : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                          }`}
                        >
                          {st.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-400 block">Topic / Prompt Steering (Optional)</label>
                    <input
                      type="text"
                      value={topicFocus}
                      onChange={(e) => setTopicFocus(e.target.value)}
                      placeholder="e.g. 'find the funniest arguments', 'only when he reveals the secret trick'..."
                      className="w-full px-3 py-2 bg-[#181B1F] border border-[#272C33] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading || isUploading}
              className="w-full py-4 rounded-2xl text-sm sm:text-base font-extrabold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:via-indigo-500 hover:to-cyan-400 shadow-xl shadow-violet-600/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Initiating AI Pipeline...</span>
                </>
              ) : isUploading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Uploading & Preparing Video...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Clips Now</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recent Projects Section */}
        {projects.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-violet-400" />
                <h2 className="text-base font-bold text-white">Recent Projects</h2>
                <span className="text-xs text-gray-500 font-mono">({projects.length})</span>
              </div>
              <Link
                href="/projects"
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition"
              >
                <span>View All in Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.slice(0, 3).map((p) => {
                const firstClip = p.clips && p.clips.length > 0 ? p.clips[0] : null;
                const isProcessing = p.status === "processing" || p.status === "queued";
                const isCompleted = p.status === "completed";

                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/project/${p.id}`)}
                    className="group p-4 rounded-2xl bg-[#111317] border border-[#1F2328] hover:border-violet-500/50 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-violet-300 transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {new Date(p.createdAt).toLocaleDateString()} • {p.clips?.length || 0} Clips
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          isCompleted
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                            : isProcessing
                            ? "bg-violet-500/15 border-violet-500/30 text-violet-400 animate-pulse"
                            : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-violet-400 font-semibold pt-1 border-t border-white/5">
                      <span>{isCompleted ? "Open in Studio" : "View Progress"}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08090A] text-white p-8">Loading OmniClip...</div>}>
      <HomeContent />
    </Suspense>
  );
}
