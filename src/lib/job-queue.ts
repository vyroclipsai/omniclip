import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { db, Project } from "./db";

export type JobStatus =
  | "queued"
  | "ingest"
  | "transcribe"
  | "analyze"
  | "reframe"
  | "render"
  | "downloading" // backward compat alias for ingest
  | "transcribing" // backward compat alias for transcribe
  | "analyzing" // backward compat alias for analyze
  | "rendering" // backward compat alias for render
  | "completed"
  | "failed";

export type PipelineStage = "Ingest" | "Transcribe" | "Analyze" | "Reframe" | "Render";

export interface StageProgress {
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface JobLog {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  step: string;
  message: string;
  progress?: number;
}

export interface JobOptions {
  maxClips?: number;
  minScore?: number;
  clipStyle?: "default" | "educational" | "funny" | "storytelling" | "controversial" | "inspirational" | string;
  prompt?: string;
  minDuration?: number;
  maxDuration?: number;
  aspectRatio?: "9:16" | "4:5" | "1:1" | "16:9";
  resolution?: "1080p" | "720p";
  renderMode?: "crop" | "blur_bg";
  captionStyle?: "viral_yellow" | "neon_green" | "cyber_cyan" | "fire_orange" | "clean_sub" | string;
  captionPosition?: "bottom" | "middle" | "top";
  captionsEnabled?: boolean;
  language?: string;
}

export interface JobRecord {
  id: string;
  projectId: string;
  source: string;
  pid?: number;
  status: JobStatus;
  progress: number;
  currentStep: string;
  currentStage: PipelineStage | "Queued" | "Complete" | "Failed";
  stages: {
    ingest: StageProgress;
    transcribe: StageProgress;
    analyze: StageProgress;
    reframe: StageProgress;
    render: StageProgress;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string | null;
  details?: string | null;
  logs: JobLog[];
  maxClips?: number;
  options?: JobOptions;
  retries: number;
  maxRetries: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
const JOB_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes timeout for long 60+ min videos

function atomicWriteJsonSync(filePath: string, data: any) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(tempPath, content, "utf-8");
  try {
    fs.renameSync(tempPath, filePath);
  } catch {
    try {
      fs.copyFileSync(tempPath, filePath);
      fs.unlinkSync(tempPath);
    } catch {
      fs.writeFileSync(filePath, content, "utf-8");
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
    }
  }
}

function loadJobs(): JobRecord[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(JOBS_FILE)) {
    atomicWriteJsonSync(JOBS_FILE, []);
    return [];
  }
  try {
    const raw = fs.readFileSync(JOBS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveJobs(jobs: JobRecord[]) {
  atomicWriteJsonSync(JOBS_FILE, jobs);
}

// In-memory active process and timeout tracker pinned to globalThis to survive Next.js Fast Refresh
const globalForOmniclip = globalThis as unknown as {
  __omniclip_active_processes?: Map<string, any>;
  __omniclip_active_timeouts?: Map<string, NodeJS.Timeout>;
  __omniclip_recovery_done?: boolean;
};

const activeProcesses =
  globalForOmniclip.__omniclip_active_processes || new Map<string, any>();
globalForOmniclip.__omniclip_active_processes = activeProcesses;

const activeTimeouts =
  globalForOmniclip.__omniclip_active_timeouts || new Map<string, NodeJS.Timeout>();
globalForOmniclip.__omniclip_active_timeouts = activeTimeouts;

// Helper: Check if an OS process is actively alive
function isPidRunning(pid?: number): boolean {
  if (!pid || typeof pid !== "number" || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e.code === "EPERM";
  }
}

// Recovery: Mark genuinely orphaned in-flight jobs on server restart (only stale jobs > 10 mins with dead PID)
function recoverOrphanedJobs() {
  if (globalForOmniclip.__omniclip_recovery_done) return;
  globalForOmniclip.__omniclip_recovery_done = true;
  try {
    const jobs = loadJobs();
    let modified = false;
    const now = Date.now();
    for (const job of jobs) {
      const isTerminal = job.status === "completed" || job.status === "failed";
      if (isTerminal) continue;

      // Check if project.json already completed on disk
      const resultFile = path.join(process.cwd(), "data", "runs", job.projectId, "project.json");
      if (fs.existsSync(resultFile)) {
        try {
          const raw = fs.readFileSync(resultFile, "utf-8");
          const resultData = JSON.parse(raw);
          if (resultData && Array.isArray(resultData.clips) && resultData.clips.length > 0) {
            job.status = "completed";
            job.currentStage = "Complete";
            job.currentStep = "Complete";
            job.progress = 100;
            job.updatedAt = new Date().toISOString();
            modified = true;
            continue;
          }
        } catch {}
      }

      // Check if process is still running on the OS
      const hasActiveMemoryHandle = activeProcesses.has(job.id);
      const isOsPidActive = isPidRunning(job.pid);

      if (hasActiveMemoryHandle || isOsPidActive) {
        // Process is actively running on the OS - do NOT mark as failed!
        continue;
      }

      const lastUpdatedMs = job.updatedAt ? new Date(job.updatedAt).getTime() : 0;
      const isStale = (now - lastUpdatedMs) > 10 * 60 * 1000;

      if (isStale) {
        job.status = "failed";
        job.currentStage = "Failed";
        job.error = "Job timed out or halted. Click Retry to continue.";
        job.currentStep = "Halted (timed out)";
        job.updatedAt = new Date().toISOString();
        modified = true;

        // Also update corresponding project
        try {
          db.updateProject(job.projectId, {
            status: "failed",
            currentStep: "Job timed out or halted. Click Retry to continue.",
          });
        } catch {}
      }
    }
    if (modified) {
      saveJobs(jobs);
    }
  } catch (err) {
    console.error("Error during startup job recovery:", err);
  }
}

// Run recovery on initial boot
recoverOrphanedJobs();

function defaultStages(): JobRecord["stages"] {
  return {
    ingest: { status: "pending", progress: 0, message: "Download & format verification" },
    transcribe: { status: "pending", progress: 0, message: "Whisper word-level timestamps" },
    analyze: { status: "pending", progress: 0, message: "6-factor rubric virality scoring" },
    reframe: { status: "pending", progress: 0, message: "Smart face-tracking & headroom" },
    render: { status: "pending", progress: 0, message: "Karaoke burn & native frame rate export" },
  };
}

export const jobQueue = {
  createJob(projectId: string, source: string, maxClips: number = 8, options?: JobOptions): JobRecord {
    const jobs = loadJobs();
    const jobId = "job_" + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    const stages = defaultStages();
    stages.ingest.status = "running";

    const newJob: JobRecord = {
      id: jobId,
      projectId,
      source,
      status: "ingest",
      progress: 0,
      currentStep: "Job queued for processing",
      currentStage: "Ingest",
      stages,
      createdAt: now,
      updatedAt: now,
      logs: [
        {
          timestamp: now,
          level: "INFO",
          step: "queue",
          message: "Job submitted to background queue",
          progress: 0,
        },
      ],
      maxClips,
      options,
      retries: 0,
      maxRetries: 3,
    };

    jobs.unshift(newJob);
    saveJobs(jobs);

    // Update project state
    db.updateProject(projectId, {
      status: "processing",
      progress: 0,
      currentStep: "Queued in background...",
    });

    // Dispatch background worker asynchronously
    setImmediate(() => {
      this.executeJob(jobId);
    });

    return newJob;
  },

  syncJobFromDisk(job: JobRecord): JobRecord {
    if (job.status === "completed" || job.status === "failed") {
      return job;
    }

    const projectDir = path.join(process.cwd(), "data", "runs", job.projectId);

    // 1. Check if pipeline already produced project.json with final clips
    const resultFile = path.join(projectDir, "project.json");
    if (fs.existsSync(resultFile)) {
      try {
        const raw = fs.readFileSync(resultFile, "utf-8");
        const resultData = JSON.parse(raw);
        if (resultData && Array.isArray(resultData.clips) && resultData.clips.length > 0) {
          const mappedClips = resultData.clips.map((c: any) => ({
            id: c.id,
            projectId: job.projectId,
            title: c.title,
            viralityScore: c.virality_score,
            hookRating: c.hook_rating || "36/40",
            explanation: c.explanation,
            reason: c.reason,
            suggestedHook: c.suggested_hook,
            rubric: c.rubric,
            startTime: c.start_time,
            endTime: c.end_time,
            startSec: c.start_time,
            endSec: c.end_time,
            duration: c.duration,
            transcriptText: c.transcript_text,
            words: c.words || [],
            cropInfo: c.crop_info || { crop_w: 608, crop_h: 1080, crop_x: 656, crop_y: 0 },
            aspectRatio: c.aspect_ratio || "9:16",
            resolution: c.resolution || "1080p",
            renderMode: c.render_mode || "crop",
            assSubtitlePath: c.ass_subtitle_path,
            renderedVideoPath: c.rendered_video_path,
            videoUrl: c.rendered_video_path
              ? `/api/media?file=${encodeURIComponent(c.rendered_video_path)}`
              : undefined,
          }));

          const stages = defaultStages();
          stages.ingest = { status: "completed", progress: 100 };
          stages.transcribe = { status: "completed", progress: 100 };
          stages.analyze = { status: "completed", progress: 100 };
          stages.reframe = { status: "completed", progress: 100 };
          stages.render = { status: "completed", progress: 100 };

          job.status = "completed";
          job.progress = 100;
          job.currentStep = "Complete";
          job.currentStage = "Complete";
          job.stages = stages;
          job.completedAt = new Date().toISOString();
          job.error = null;

          db.updateProject(job.projectId, {
            status: "completed",
            progress: 100,
            currentStep: "Complete",
            clips: mappedClips,
            alsoConsidered: resultData.also_considered || [],
          });

          this.updateJob(job.id, job);
          return job;
        }
      } catch {}
    }

    // 2. Check live status.json from disk
    const statusFile = path.join(projectDir, "status.json");
    if (fs.existsSync(statusFile)) {
      try {
        const raw = fs.readFileSync(statusFile, "utf-8");
        const st = JSON.parse(raw);
        if (st.progress !== undefined && (st.progress !== job.progress || (st.message && st.message !== job.currentStep))) {
          job.progress = st.progress;
          job.currentStep = st.message || job.currentStep;
          job.updatedAt = new Date().toISOString();

          // Update stage status based on progress
          const stages = { ...job.stages };
          if (st.progress <= 20) {
            stages.ingest = { status: "running", progress: Math.min(100, Math.round((st.progress / 20) * 100)), message: st.message };
            job.currentStage = "Ingest";
            job.status = "ingest";
          } else if (st.progress <= 55) {
            stages.ingest = { status: "completed", progress: 100, message: "Ingested" };
            stages.transcribe = { status: "running", progress: Math.min(100, Math.round(((st.progress - 20) / 35) * 100)), message: st.message };
            job.currentStage = "Transcribe";
            job.status = "transcribe";
          } else if (st.progress <= 70) {
            stages.ingest = { status: "completed", progress: 100 };
            stages.transcribe = { status: "completed", progress: 100 };
            stages.analyze = { status: "running", progress: Math.min(100, Math.round(((st.progress - 55) / 15) * 100)), message: st.message };
            job.currentStage = "Analyze";
            job.status = "analyze";
          } else if (st.progress <= 80) {
            stages.ingest = { status: "completed", progress: 100 };
            stages.transcribe = { status: "completed", progress: 100 };
            stages.analyze = { status: "completed", progress: 100 };
            stages.reframe = { status: "running", progress: Math.min(100, Math.round(((st.progress - 70) / 10) * 100)), message: st.message };
            job.currentStage = "Reframe";
            job.status = "reframe";
          } else if (st.progress < 100) {
            stages.ingest = { status: "completed", progress: 100 };
            stages.transcribe = { status: "completed", progress: 100 };
            stages.analyze = { status: "completed", progress: 100 };
            stages.reframe = { status: "completed", progress: 100 };
            stages.render = { status: "running", progress: Math.min(100, Math.round(((st.progress - 80) / 20) * 100)), message: st.message };
            job.currentStage = "Render";
            job.status = "render";
          }
          job.stages = stages;

          this.updateJob(job.id, {
            progress: st.progress,
            currentStep: st.message,
            currentStage: job.currentStage,
            stages: job.stages,
            status: job.status,
          });
          db.updateProject(job.projectId, {
            progress: st.progress,
            currentStep: st.message,
          });
        }
      } catch {}
    }

    return job;
  },

  getJob(jobId: string): JobRecord | null {
    const jobs = loadJobs();
    const job = jobs.find((j) => j.id === jobId) || null;
    return job ? this.syncJobFromDisk(job) : null;
  },

  getJobByProject(projectId: string): JobRecord | null {
    const jobs = loadJobs();
    const job = jobs.find((j) => j.projectId === projectId) || null;
    return job ? this.syncJobFromDisk(job) : null;
  },

  updateJob(jobId: string, updates: Partial<JobRecord>): JobRecord | null {
    const jobs = loadJobs();
    const idx = jobs.findIndex((j) => j.id === jobId);
    if (idx === -1) return null;

    jobs[idx] = {
      ...jobs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveJobs(jobs);
    return jobs[idx];
  },

  addLog(jobId: string, level: "INFO" | "WARN" | "ERROR", step: string, message: string, progress?: number) {
    const jobs = loadJobs();
    const idx = jobs.findIndex((j) => j.id === jobId);
    if (idx === -1) return;

    const logEntry: JobLog = {
      timestamp: new Date().toISOString(),
      level,
      step,
      message,
      progress,
    };

    const currentLogs = jobs[idx].logs || [];
    currentLogs.push(logEntry);
    jobs[idx].logs = currentLogs.slice(-150);
    if (progress !== undefined) jobs[idx].progress = progress;
    jobs[idx].currentStep = message;
    jobs[idx].updatedAt = new Date().toISOString();

    saveJobs(jobs);
  },

  retryJob(jobId: string): JobRecord | null {
    const job = this.getJob(jobId);
    if (!job) return null;

    // Clean up any existing process/timeout for this job
    if (job.pid && isPidRunning(job.pid)) {
      try {
        process.kill(job.pid, "SIGKILL");
      } catch {}
    }
    if (activeProcesses.has(jobId)) {
      try {
        const oldProc = activeProcesses.get(jobId);
        if (oldProc && !oldProc.killed) oldProc.kill("SIGKILL");
      } catch {}
      activeProcesses.delete(jobId);
    }
    if (activeTimeouts.has(jobId)) {
      clearTimeout(activeTimeouts.get(jobId)!);
      activeTimeouts.delete(jobId);
    }

    // Clean up partial files in downloads dir to avoid file lock collisions
    const projDir = path.join(process.cwd(), "data", "runs", job.projectId);
    const downloadsDir = path.join(projDir, "downloads");
    if (fs.existsSync(downloadsDir)) {
      try {
        const files = fs.readdirSync(downloadsDir);
        for (const file of files) {
          if (file.endsWith(".part")) {
            fs.unlinkSync(path.join(downloadsDir, file));
          }
        }
      } catch {}
    }
    // Clean status file
    const statusFile = path.join(projDir, "status.json");
    if (fs.existsSync(statusFile)) {
      try { fs.unlinkSync(statusFile); } catch {}
    }

    // Reset stages
    const stages = defaultStages();
    stages.ingest.status = "running";

    const updated = this.updateJob(jobId, {
      status: "ingest",
      progress: 0,
      currentStep: "Job restarted by user",
      currentStage: "Ingest",
      stages,
      error: null,
      details: null,
      retries: (job.retries || 0) + 1,
    });

    db.updateProject(job.projectId, {
      status: "processing",
      progress: 0,
      currentStep: "Job restarted by user",
    });

    this.addLog(jobId, "INFO", "retry", `Job manually restarted (attempt ${(job.retries || 0) + 1})`, 0);

    setImmediate(() => {
      this.executeJob(jobId);
    });

    return updated;
  },

  executeJob(jobId: string) {
    const job = this.getJob(jobId);
    if (!job) return;

    const projectId = job.projectId;
    const projectOutputDir = path.join(process.cwd(), "data", "runs", projectId);
    if (!fs.existsSync(projectOutputDir)) {
      fs.mkdirSync(projectOutputDir, { recursive: true });
    }

    this.updateJob(jobId, {
      status: "ingest",
      progress: 5,
      currentStep: "Initializing Python AI Pipeline...",
      currentStage: "Ingest",
    });
    db.updateProject(projectId, {
      status: "processing",
      progress: 5,
      currentStep: "Initializing Python AI Pipeline...",
    });

    const scriptPath = path.join(process.cwd(), "pipeline", "cli.py");
    const pyArgs = [
      scriptPath,
      "process",
      "--input", job.source,
      "--output-dir", projectOutputDir,
      "--max-clips", String(job.maxClips || 8),
    ];

    if (job.options?.minScore !== undefined) {
      pyArgs.push("--min-score", String(job.options.minScore));
    }
    if (job.options?.clipStyle) {
      pyArgs.push("--clip-style", job.options.clipStyle);
    }
    if (job.options?.prompt) {
      pyArgs.push("--prompt", job.options.prompt);
    }
    if (job.options?.minDuration !== undefined) {
      pyArgs.push("--min-duration", String(job.options.minDuration));
    }
    if (job.options?.maxDuration !== undefined) {
      pyArgs.push("--max-duration", String(job.options.maxDuration));
    }
    if (job.options?.aspectRatio) {
      pyArgs.push("--aspect-ratio", job.options.aspectRatio);
    }
    if (job.options?.resolution) {
      pyArgs.push("--resolution", job.options.resolution);
    }
    if (job.options?.renderMode) {
      pyArgs.push("--render-mode", job.options.renderMode);
    }
    if (job.options?.captionStyle) {
      pyArgs.push("--caption-style", job.options.captionStyle);
    }
    if (job.options?.captionPosition) {
      pyArgs.push("--caption-position", job.options.captionPosition);
    }
    if (job.options?.captionsEnabled === false) {
      pyArgs.push("--no-captions");
    }
    if (job.options?.language) {
      pyArgs.push("--language", job.options.language);
    }

    const child = spawn("python", pyArgs, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        JOB_ID: jobId,
        PROJECT_ID: projectId,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    activeProcesses.set(jobId, child);
    this.updateJob(jobId, { pid: child.pid });

    // Set timeout to prevent hung processes
    const timeoutHandle = setTimeout(() => {
      if (activeProcesses.has(jobId)) {
        try {
          child.kill("SIGKILL");
        } catch {}
        activeProcesses.delete(jobId);
        const timeoutMsg = "Job timed out after 25 minutes. Click Retry to re-run.";
        this.updateJob(jobId, {
          status: "failed",
          currentStage: "Failed",
          error: timeoutMsg,
          currentStep: timeoutMsg,
        });
        db.updateProject(projectId, {
          status: "failed",
          currentStep: timeoutMsg,
        });
        this.addLog(jobId, "ERROR", "timeout", timeoutMsg);
      }
    }, JOB_TIMEOUT_MS);
    activeTimeouts.set(jobId, timeoutHandle);

    const updateStageProgress = (pct: number, msg: string) => {
      const current = this.getJob(jobId);
      if (!current) return;
      const stages = { ...current.stages };

      if (pct <= 20) {
        stages.ingest = { status: "running", progress: Math.min(100, Math.round((pct / 20) * 100)), message: msg };
        this.updateJob(jobId, { currentStage: "Ingest", status: "ingest", stages });
      } else if (pct <= 55) {
        stages.ingest = { status: "completed", progress: 100, message: "Ingested" };
        stages.transcribe = { status: "running", progress: Math.min(100, Math.round(((pct - 20) / 35) * 100)), message: msg };
        this.updateJob(jobId, { currentStage: "Transcribe", status: "transcribe", stages });
      } else if (pct <= 70) {
        stages.ingest = { status: "completed", progress: 100 };
        stages.transcribe = { status: "completed", progress: 100 };
        stages.analyze = { status: "running", progress: Math.min(100, Math.round(((pct - 55) / 15) * 100)), message: msg };
        this.updateJob(jobId, { currentStage: "Analyze", status: "analyze", stages });
      } else if (pct <= 80) {
        stages.ingest = { status: "completed", progress: 100 };
        stages.transcribe = { status: "completed", progress: 100 };
        stages.analyze = { status: "completed", progress: 100 };
        stages.reframe = { status: "running", progress: Math.min(100, Math.round(((pct - 70) / 10) * 100)), message: msg };
        this.updateJob(jobId, { currentStage: "Reframe", status: "reframe", stages });
      } else if (pct < 100) {
        stages.ingest = { status: "completed", progress: 100 };
        stages.transcribe = { status: "completed", progress: 100 };
        stages.analyze = { status: "completed", progress: 100 };
        stages.reframe = { status: "completed", progress: 100 };
        stages.render = { status: "running", progress: Math.min(100, Math.round(((pct - 80) / 20) * 100)), message: msg };
        this.updateJob(jobId, { currentStage: "Render", status: "render", stages });
      }
    };

    child.stdout.on("data", (data) => {
      const text = data.toString();
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;

        // Structured JSON log parser
        if (line.includes("[LOG_JSON]")) {
          try {
            const raw = line.substring(line.indexOf("[LOG_JSON]") + 10).trim();
            const parsed = JSON.parse(raw);
            this.addLog(jobId, parsed.level || "INFO", parsed.step || "pipeline", parsed.message, parsed.progress);
            if (parsed.progress !== undefined) {
              updateStageProgress(parsed.progress, parsed.message);
              this.updateJob(jobId, { progress: parsed.progress, currentStep: parsed.message });
              db.updateProject(projectId, { progress: parsed.progress, currentStep: parsed.message });
            }
          } catch {}
          continue;
        }

        // Standard progress pattern: [STATUS] 45% - message
        const match = line.match(/\[STATUS\]\s+(\d+)%\s+-\s+(.+)/);
        if (match) {
          const pct = parseInt(match[1], 10);
          const msg = match[2].trim();
          updateStageProgress(pct, msg);
          this.addLog(jobId, "INFO", "pipeline", msg, pct);
          this.updateJob(jobId, { progress: pct, currentStep: msg });
          db.updateProject(projectId, { progress: pct, currentStep: msg });
        }
      }
    });

    let stderrBuffer = "";
    child.stderr.on("data", (data) => {
      const errStr = data.toString();
      stderrBuffer += errStr;
      if (!errStr.includes("frames/s]") && !errStr.includes("it/s]")) {
        this.addLog(jobId, "WARN", "stderr", errStr.slice(0, 500));
      }
    });

    child.on("close", (code) => {
      activeProcesses.delete(jobId);
      if (activeTimeouts.has(jobId)) {
        clearTimeout(activeTimeouts.get(jobId)!);
        activeTimeouts.delete(jobId);
      }

      if (code === 0) {
        // Read produced project.json
        const resultFile = path.join(projectOutputDir, "project.json");
        let mappedClips: any[] = [];
        let alsoConsidered: any[] = [];
        if (fs.existsSync(resultFile)) {
          try {
            const raw = fs.readFileSync(resultFile, "utf-8");
            const resultData = JSON.parse(raw);
            if (resultData && resultData.clips) {
              mappedClips = resultData.clips.map((c: any) => ({
                id: c.id,
                projectId,
                title: c.title,
                viralityScore: c.virality_score,
                hookRating: c.hook_rating || "36/40",
                explanation: c.explanation,
                reason: c.reason,
                suggestedHook: c.suggested_hook,
                rubric: c.rubric,
                startTime: c.start_time,
                endTime: c.end_time,
                startSec: c.start_time,
                endSec: c.end_time,
                duration: c.duration,
                transcriptText: c.transcript_text,
                words: c.words || [],
                cropInfo: c.crop_info || { crop_w: 608, crop_h: 1080, crop_x: 656, crop_y: 0 },
                aspectRatio: c.aspect_ratio || "9:16",
                resolution: c.resolution || "1080p",
                renderMode: c.render_mode || "crop",
                assSubtitlePath: c.ass_subtitle_path,
                renderedVideoPath: c.rendered_video_path,
                videoUrl: c.rendered_video_path
                  ? `/api/media?file=${encodeURIComponent(c.rendered_video_path)}`
                  : undefined,
              }));
            }
            if (resultData && resultData.also_considered) {
              alsoConsidered = resultData.also_considered;
            }
          } catch (e) {
            console.error("Error reading pipeline output project.json:", e);
          }
        }

        const now = new Date().toISOString();
        const stages = defaultStages();
        stages.ingest = { status: "completed", progress: 100 };
        stages.transcribe = { status: "completed", progress: 100 };
        stages.analyze = { status: "completed", progress: 100 };
        stages.reframe = { status: "completed", progress: 100 };
        stages.render = { status: "completed", progress: 100 };

        this.updateJob(jobId, {
          status: "completed",
          progress: 100,
          currentStep: "Complete",
          currentStage: "Complete",
          stages,
          completedAt: now,
          error: null,
        });

        db.updateProject(projectId, {
          status: "completed",
          progress: 100,
          currentStep: "Complete",
          clips: mappedClips,
          alsoConsidered,
        });

        this.addLog(jobId, "INFO", "completed", `Job finished successfully with ${mappedClips.length} clips generated`, 100);
      } else {
        const errorReason = extractMeaningfulError(stderrBuffer) || `Pipeline process exited with code ${code}`;
        const current = this.getJob(jobId);
        const stages = current ? { ...current.stages } : defaultStages();
        if (current?.currentStage && current.currentStage !== "Queued" && current.currentStage !== "Complete" && current.currentStage !== "Failed") {
          const key = current.currentStage.toLowerCase() as keyof typeof stages;
          if (stages[key]) stages[key].status = "failed";
        }

        this.updateJob(jobId, {
          status: "failed",
          progress: 0,
          currentStep: errorReason,
          currentStage: "Failed",
          stages,
          error: errorReason,
          details: stderrBuffer.slice(-1000),
        });

        db.updateProject(projectId, {
          status: "failed",
          progress: 0,
          currentStep: errorReason,
        });

        this.addLog(jobId, "ERROR", "failed", errorReason);
      }
    });

    child.on("error", (err) => {
      activeProcesses.delete(jobId);
      if (activeTimeouts.has(jobId)) {
        clearTimeout(activeTimeouts.get(jobId)!);
        activeTimeouts.delete(jobId);
      }

      const msg = `Failed to spawn pipeline process: ${err.message}`;
      this.updateJob(jobId, {
        status: "failed",
        progress: 0,
        currentStep: msg,
        currentStage: "Failed",
        error: msg,
        details: err.stack || err.message,
      });

      db.updateProject(projectId, {
        status: "failed",
        progress: 0,
        currentStep: msg,
      });

      this.addLog(jobId, "ERROR", "spawn", msg);
    });
  },
};

function extractMeaningfulError(stderr: string): string {
  if (!stderr) return "";
  const lower = stderr.toLowerCase();
  if (lower.includes("botcheckerror") || lower.includes("confirm you're not a bot")) {
    return "YouTube bot check detected. Please provide a cookies file via YTDLP_COOKIES_PATH.";
  }
  if (lower.includes("agerestrictederror") || lower.includes("age-restricted")) {
    return "YouTube video is age-restricted and requires account login.";
  }
  if (lower.includes("privatevideoerror") || lower.includes("video is private") || lower.includes("members-only")) {
    return "YouTube video is private or has been removed.";
  }
  if (lower.includes("videonotfounderror") || lower.includes("video unavailable") || lower.includes("does not exist")) {
    return "YouTube video not found or URL is invalid.";
  }
  const lines = stderr.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l.startsWith("Error:") || l.startsWith("[ERROR]") || l.includes("Exception:")) {
      return l;
    }
  }
  return "";
}
