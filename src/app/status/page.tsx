"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HardDrive,
  Cpu,
  RefreshCw,
  Film,
  Sparkles,
  Server,
  ArrowLeft,
  ShieldCheck,
  Terminal,
} from "lucide-react";

interface DiagnosticData {
  status: "ok" | "degraded";
  healthy: boolean;
  timestamp: string;
  platform: string;
  uptimeSeconds: number;
  components: {
    ffmpeg: { available: boolean; version?: string; error?: string };
    ffprobe: { available: boolean; version?: string; error?: string };
    ytdlp: { available: boolean; version?: string; error?: string };
    python: { available: boolean; version?: string; error?: string };
  };
  models: {
    yolo: { present: boolean; path?: string; details?: string };
    whisper: { present: boolean; models: string[]; path?: string };
  };
  disk: {
    available: boolean;
    freeGb: number;
    totalGb: number;
    percentFree: number;
    path: string;
    status: "ok" | "warning" | "critical";
    error?: string;
  };
  llm: {
    hasOpenAIKey: boolean;
    hasGeminiKey: boolean;
    activeProvider: string;
    status: string;
    heuristicScoringReady: boolean;
  };
  env: {
    apiUrl: string;
    hasCookiesFile: boolean;
    nodeEnv: string;
  };
  warnings: string[];
}

export default function StatusPage() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastChecked(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to reach health endpoint");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${s}s`;
    if (mins > 0) return `${mins}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="min-h-screen bg-[#0B0D0E] text-white flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-[#1F2328] bg-[#0B0D0E]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="font-bold tracking-tight text-base">OmniClip System Health</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono hidden sm:inline">
            Updated {lastChecked.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Run Diagnostics
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Overall Status Banner */}
        {data && (
          <div
            className={`rounded-2xl border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
              data.healthy
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  data.healthy ? "bg-emerald-500/20" : "bg-amber-500/20"
                }`}
              >
                {data.healthy ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  {data.healthy ? "All Systems Operational" : "System Degraded"}
                  <span
                    className={`text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                      data.healthy
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {data.status}
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  Platform: {data.platform} • Node {process.version || "18+"} • Uptime: {formatUptime(data.uptimeSeconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Real-time Polling (15s)
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <XCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Health check failed</p>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Diagnostic Cards Grid */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Core CLI Dependencies */}
            <div className="rounded-2xl border border-[#1F2328] bg-[#16181D]/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-gray-200">Video Core Engines</h2>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 font-semibold">Native CLI</span>
              </div>

              <div className="space-y-3">
                {/* FFmpeg */}
                <div className="flex items-start justify-between text-xs">
                  <div>
                    <div className="font-semibold text-gray-200 flex items-center gap-1.5">
                      {data.components.ffmpeg.available ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      FFmpeg
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5 truncate max-w-[200px]">
                      {data.components.ffmpeg.version?.split(" ")[2] || "Available"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    data.components.ffmpeg.available ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {data.components.ffmpeg.available ? "READY" : "MISSING"}
                  </span>
                </div>

                {/* FFprobe */}
                <div className="flex items-start justify-between text-xs">
                  <div>
                    <div className="font-semibold text-gray-200 flex items-center gap-1.5">
                      {data.components.ffprobe.available ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      FFprobe
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5 truncate max-w-[200px]">
                      {data.components.ffprobe.version?.split(" ")[2] || "Available"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    data.components.ffprobe.available ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {data.components.ffprobe.available ? "READY" : "MISSING"}
                  </span>
                </div>

                {/* yt-dlp */}
                <div className="flex items-start justify-between text-xs">
                  <div>
                    <div className="font-semibold text-gray-200 flex items-center gap-1.5">
                      {data.components.ytdlp.available ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      yt-dlp
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                      v{data.components.ytdlp.version || "Installed"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    data.components.ytdlp.available ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {data.components.ytdlp.available ? "READY" : "MISSING"}
                  </span>
                </div>

                {/* Python */}
                <div className="flex items-start justify-between text-xs">
                  <div>
                    <div className="font-semibold text-gray-200 flex items-center gap-1.5">
                      {data.components.python.available ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      Python Runtime
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                      {data.components.python.version || "Python 3.x"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    data.components.python.available ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {data.components.python.available ? "READY" : "MISSING"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. AI & Neural Models */}
            <div className="rounded-2xl border border-[#1F2328] bg-[#16181D]/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-bold text-gray-200">Neural Models</h2>
                </div>
                <span className="text-[11px] font-mono text-purple-400 font-semibold">Local Weights</span>
              </div>

              <div className="space-y-4 text-xs">
                {/* YOLO */}
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      YOLOv8 Person Tracker
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Active subject tracking & rule-of-thirds headroom alignment.
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">
                    {data.models.yolo.path || "yolov8n.pt"}
                  </p>
                </div>

                {/* Whisper */}
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Faster-Whisper (STT)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      {data.models.whisper.models.length} Cached
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    High-speed word-level audio timestamps for karaoke subtitles.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.models.whisper.models.slice(0, 3).map((m) => (
                      <span
                        key={m}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-300 border border-white/5"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Storage & LLM Pipeline */}
            <div className="rounded-2xl border border-[#1F2328] bg-[#16181D]/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-gray-200">Disk & Virality Scorer</h2>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">Resources</span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Disk Space Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Workspace Free Storage</span>
                    <span className="font-mono font-bold text-gray-200">
                      {data.disk.freeGb} GB / {data.disk.totalGb} GB ({data.disk.percentFree}% free)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        data.disk.status === "ok" ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, 100 - data.disk.percentFree))}%` }}
                    />
                  </div>
                </div>

                {/* LLM Engine Status */}
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      Virality Scoring Engine
                    </span>
                    <span className="text-[10px] font-mono text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded">
                      {data.llm.activeProvider.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {data.llm.activeProvider === "heuristic"
                      ? "Multi-signal audio-energy, sentence completion, and speech pace scoring active."
                      : `${data.llm.activeProvider.toUpperCase()} AI rubric evaluation enabled.`}
                  </p>
                </div>

                {/* Tunnel & Network */}
                <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">Network Exposure:</span>
                  <span className="font-mono text-indigo-400 font-medium">Cloudflare Tunnel / HTTPS</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warnings or Notes */}
        {data && data.warnings && data.warnings.length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-[#16181D]/40 p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">System Advisories</h3>
            <ul className="space-y-1.5">
              {data.warnings.map((w, idx) => (
                <li key={idx} className="text-xs text-gray-400 flex items-start gap-2">
                  <span className="text-yellow-400 text-sm leading-none">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
