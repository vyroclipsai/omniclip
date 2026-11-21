import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export interface ComponentHealth {
  available: boolean;
  version?: string;
  path?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface DiskHealth {
  available: boolean;
  freeGb: number;
  totalGb: number;
  percentFree: number;
  path: string;
  status: "ok" | "warning" | "critical";
  error?: string;
}

export interface ModelsHealth {
  yolo: { present: boolean; path?: string; details?: string };
  whisper: { present: boolean; models: string[]; path?: string };
}

export interface LlmHealth {
  hasOpenAIKey: boolean;
  hasGeminiKey: boolean;
  activeProvider: "gemini" | "openai" | "heuristic";
  status: "ready" | "fallback_heuristic";
  heuristicScoringReady: boolean;
}

export interface SystemDiagnostic {
  healthy: boolean;
  timestamp: string;
  platform: string;
  uptimeSeconds: number;
  components: {
    ffmpeg: ComponentHealth;
    ffprobe: ComponentHealth;
    ytdlp: ComponentHealth;
    python: ComponentHealth;
  };
  models: ModelsHealth;
  disk: DiskHealth;
  llm: LlmHealth;
  env: {
    apiUrl: string;
    hasCookiesFile: boolean;
    nodeEnv: string;
  };
  warnings: string[];
}

export function performSystemCheck(): SystemDiagnostic {
  const warnings: string[] = [];
  const now = new Date().toISOString();

  // 1. FFmpeg
  let ffmpegHealth: ComponentHealth = { available: false };
  try {
    const out = execSync("ffmpeg -version", { stdio: ["ignore", "pipe", "pipe"], timeout: 3000 }).toString();
    const firstLine = out.split("\n")[0].trim();
    ffmpegHealth = { available: true, version: firstLine };
  } catch (err: any) {
    ffmpegHealth = { available: false, error: "FFmpeg is not installed or not in PATH." };
    warnings.push(ffmpegHealth.error!);
  }

  // 2. FFprobe
  let ffprobeHealth: ComponentHealth = { available: false };
  try {
    const out = execSync("ffprobe -version", { stdio: ["ignore", "pipe", "pipe"], timeout: 3000 }).toString();
    const firstLine = out.split("\n")[0].trim();
    ffprobeHealth = { available: true, version: firstLine };
  } catch (err: any) {
    ffprobeHealth = { available: false, error: "FFprobe is not installed or not in PATH." };
    warnings.push(ffprobeHealth.error!);
  }

  // 3. yt-dlp
  let ytdlpHealth: ComponentHealth = { available: false };
  try {
    const out = execSync("yt-dlp --version", { stdio: ["ignore", "pipe", "pipe"], timeout: 4000 }).toString();
    ytdlpHealth = { available: true, version: out.trim() };
  } catch {
    try {
      const out2 = execSync("python -m yt_dlp --version", { stdio: ["ignore", "pipe", "pipe"], timeout: 4000 }).toString();
      ytdlpHealth = { available: true, version: `python module ${out2.trim()}` };
    } catch (err: any) {
      ytdlpHealth = { available: false, error: "yt-dlp not found in PATH or python modules." };
      warnings.push(ytdlpHealth.error!);
    }
  }

  // 4. Python
  let pythonHealth: ComponentHealth = { available: false };
  try {
    const out = execSync("python --version", { stdio: ["ignore", "pipe", "pipe"], timeout: 3000 }).toString();
    pythonHealth = { available: true, version: out.trim() };
  } catch (err: any) {
    pythonHealth = { available: false, error: "Python is not found in PATH." };
    warnings.push(pythonHealth.error!);
  }

  // 5. Models Present (YOLO & Whisper)
  const yoloPaths = [
    path.join(process.cwd(), "yolov8n.pt"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "antigravity", "yolov8n.pt"),
  ];
  let yoloPresent = false;
  let foundYoloPath: string | undefined;
  for (const yp of yoloPaths) {
    if (fs.existsSync(yp)) {
      yoloPresent = true;
      foundYoloPath = yp;
      break;
    }
  }

  // Whisper model detection in cache
  const userHome = os.homedir();
  const hfHubPath = path.join(userHome, ".cache", "huggingface", "hub");
  const whisperCachePath = path.join(userHome, ".cache", "whisper");
  const foundWhisperModels: string[] = [];

  if (fs.existsSync(hfHubPath)) {
    try {
      const entries = fs.readdirSync(hfHubPath);
      for (const e of entries) {
        if (e.includes("whisper")) {
          foundWhisperModels.push(e.replace("models--Systran--", ""));
        }
      }
    } catch {}
  }
  if (fs.existsSync(whisperCachePath)) {
    try {
      const entries = fs.readdirSync(whisperCachePath);
      for (const e of entries) {
        if (e.endsWith(".pt")) {
          foundWhisperModels.push(e);
        }
      }
    } catch {}
  }

  const whisperPresent = foundWhisperModels.length > 0;

  // 6. Disk Space
  let diskHealth: DiskHealth = {
    available: false,
    freeGb: 0,
    totalGb: 0,
    percentFree: 0,
    path: process.cwd(),
    status: "critical",
  };
  try {
    const stats = (fs as any).statfsSync ? (fs as any).statfsSync(process.cwd()) : null;
    if (stats) {
      const bsize = stats.bsize || 4096;
      const freeBytes = (stats.bavail || stats.bfree || 0) * bsize;
      const totalBytes = (stats.blocks || 0) * bsize;
      const freeGb = Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10;
      const totalGb = Math.round((totalBytes / (1024 * 1024 * 1024)) * 10) / 10;
      const percentFree = totalGb > 0 ? Math.round((freeGb / totalGb) * 100) : 0;
      const status: "ok" | "warning" | "critical" = freeGb > 10 ? "ok" : freeGb > 3 ? "warning" : "critical";
      if (status !== "ok") {
        warnings.push(`Low disk space: only ${freeGb} GB remaining on current drive.`);
      }
      diskHealth = {
        available: true,
        freeGb,
        totalGb,
        percentFree,
        path: process.cwd(),
        status,
      };
    }
  } catch (err: any) {
    diskHealth.error = err.message;
  }

  // 7. LLM Reachability & Heuristics
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 5);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
  const activeProvider: "gemini" | "openai" | "heuristic" = hasGemini ? "gemini" : hasOpenAI ? "openai" : "heuristic";

  const cookiesPath = process.env.YTDLP_COOKIES_PATH || process.env.YTDLP_COOKIES_FILE || "";
  const hasCookies = Boolean(cookiesPath && fs.existsSync(cookiesPath));

  if (!hasOpenAI && !hasGemini) {
    warnings.push("Running with built-in heuristic viral highlight scorer (no LLM API key required).");
  }

  const overallHealthy = ffmpegHealth.available && ffprobeHealth.available && ytdlpHealth.available && pythonHealth.available && diskHealth.status !== "critical";

  return {
    healthy: overallHealthy,
    timestamp: now,
    platform: `${os.platform()} (${os.arch()})`,
    uptimeSeconds: Math.floor(process.uptime()),
    components: {
      ffmpeg: ffmpegHealth,
      ffprobe: ffprobeHealth,
      ytdlp: ytdlpHealth,
      python: pythonHealth,
    },
    models: {
      yolo: {
        present: yoloPresent,
        path: foundYoloPath,
        details: yoloPresent ? "YOLOv8 nano person detection model ready" : "YOLO model will download on first run",
      },
      whisper: {
        present: whisperPresent,
        models: foundWhisperModels,
        path: hfHubPath,
      },
    },
    disk: diskHealth,
    llm: {
      hasOpenAIKey: hasOpenAI,
      hasGeminiKey: hasGemini,
      activeProvider,
      status: activeProvider === "heuristic" ? "fallback_heuristic" : "ready",
      heuristicScoringReady: true,
    },
    env: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || "(dynamic relative)",
      hasCookiesFile: hasCookies,
      nodeEnv: process.env.NODE_ENV || "development",
    },
    warnings,
  };
}
