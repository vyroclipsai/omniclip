import fs from "fs";
import path from "path";

export interface WordToken {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface CaptionStyleSettings {
  theme?: "yellow" | "cyan" | "emerald" | "white" | string;
  size?: "md" | "lg" | "xl" | string;
  isUppercase?: boolean;
  preset?: string;
  position?: "bottom" | "middle" | "top";
}

export interface ClipItem {
  id: string;
  projectId: string;
  title: string;
  viralityScore: number;
  hookRating: string;
  explanation: string;
  reason?: string;
  suggestedHook?: string;
  rubric?: {
    hook_strength?: number;
    emotional_intensity?: number;
    story_completeness?: number;
    value_density?: number;
    shareability?: number;
    clarity?: number;
    [key: string]: number | undefined;
  };
  startTime: number;
  endTime: number;
  startSec?: number;
  endSec?: number;
  duration: number;
  transcriptText: string;
  words: WordToken[];
  cropInfo?: {
    crop_w: number;
    crop_h: number;
    crop_x: number;
    crop_y: number;
  };
  aspectRatio?: "9:16" | "4:5" | "1:1" | "16:9" | string;
  resolution?: "1080p" | "720p" | string;
  renderMode?: "crop" | "blur_bg" | string;
  captionStyle?: CaptionStyleSettings;
  captionsEnabled?: boolean;
  autoEmojis?: boolean;
  headlineBanner?: string;
  socialPost?: any;
  cleanVideoPath?: string;
  cleanVideoUrl?: string;
  assSubtitlePath?: string;
  renderedVideoPath?: string;
  videoUrl?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  sourceType: "url" | "upload" | "sample";
  sourceUrl?: string;
  sourcePath?: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  currentStep?: string;
  createdAt: string;
  duration?: number;
  clips: ClipItem[];
  alsoConsidered?: any[];
  settings?: Record<string, any>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "projects.json");

function ensureDb(): Project[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    // Seed with an initial sample project so users can explore immediately
    const initialProjects: Project[] = [
      {
        id: "proj_demo_founder",
        name: "Building Products That Scale - Podcast #42",
        sourceType: "sample",
        sourceUrl: "https://youtube.com/watch?v=sample-founder-talk",
        status: "completed",
        progress: 100,
        currentStep: "Completed",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        duration: 240,
        clips: [
          {
            id: "clip_1",
            projectId: "proj_demo_founder",
            title: "THE BIGGEST MISTAKE FOUNDERS MAKE",
            viralityScore: 98,
            hookRating: "38/40",
            explanation: "Curiosity-gap opening assertion in first 3s • High conversational energy • Actionable punchline",
            startTime: 12.0,
            endTime: 48.5,
            duration: 36.5,
            transcriptText: "The single biggest mistake founders make is building for months before talking to 50 real customers. When you build in isolation you fall in love with your solution instead of their actual problem.",
            words: [
              { word: "THE", start: 12.0, end: 12.3 },
              { word: "SINGLE", start: 12.3, end: 12.7 },
              { word: "BIGGEST", start: 12.7, end: 13.2 },
              { word: "MISTAKE", start: 13.2, end: 13.8 },
              { word: "FOUNDERS", start: 13.8, end: 14.4 },
              { word: "MAKE", start: 14.4, end: 14.8 },
              { word: "IS", start: 14.8, end: 15.0 },
              { word: "BUILDING", start: 15.0, end: 15.6 },
              { word: "FOR", start: 15.6, end: 15.8 },
              { word: "MONTHS", start: 15.8, end: 16.4 },
              { word: "BEFORE", start: 16.4, end: 17.0 },
              { word: "TALKING", start: 17.0, end: 17.6 },
              { word: "TO", start: 17.6, end: 17.8 },
              { word: "USERS.", start: 17.8, end: 18.5 },
            ],
            cropInfo: { crop_w: 608, crop_h: 1080, crop_x: 656, crop_y: 0 },
            videoUrl: "/sample-clip-1.mp4",
          },
          {
            id: "clip_2",
            projectId: "proj_demo_founder",
            title: "HOW I SCALED TO 1M USERS",
            viralityScore: 94,
            hookRating: "35/40",
            explanation: "High-retention storytelling arc • Punchy delivery • Solves a universal growth problem",
            startTime: 72.0,
            endTime: 106.0,
            duration: 34.0,
            transcriptText: "We spent zero dollars on ads for our first million users. Every single user came from short vertical clips posted daily across TikTok and YouTube Shorts.",
            words: [
              { word: "WE", start: 72.0, end: 72.3 },
              { word: "SPENT", start: 72.3, end: 72.7 },
              { word: "ZERO", start: 72.7, end: 73.2 },
              { word: "DOLLARS", start: 73.2, end: 73.8 },
              { word: "ON", start: 73.8, end: 74.0 },
              { word: "ADS", start: 74.0, end: 74.5 },
              { word: "FOR", start: 74.5, end: 74.8 },
              { word: "OUR", start: 74.8, end: 75.1 },
              { word: "GROWTH.", start: 75.1, end: 75.8 },
            ],
            cropInfo: { crop_w: 608, crop_h: 1080, crop_x: 656, crop_y: 0 },
            videoUrl: "/sample-clip-1.mp4",
          },
          {
            id: "clip_3",
            projectId: "proj_demo_founder",
            title: "WHY VIRAL CONTENT MATTERS",
            viralityScore: 89,
            hookRating: "32/40",
            explanation: "Strong narrative contrast • Pacing is steady • Clear concluding insight",
            startTime: 140.0,
            endTime: 178.0,
            duration: 38.0,
            transcriptText: "Virality is not luck. It is simply understanding human psychology, nailing your opening hook in the first two seconds, and never wasting your viewer's time.",
            words: [
              { word: "VIRALITY", start: 140.0, end: 140.6 },
              { word: "IS", start: 140.6, end: 140.8 },
              { word: "NOT", start: 140.8, end: 141.2 },
              { word: "LUCK.", start: 141.2, end: 141.8 },
              { word: "IT", start: 141.8, end: 142.1 },
              { word: "IS", start: 142.1, end: 142.3 },
              { word: "PSYCHOLOGY.", start: 142.3, end: 143.2 },
            ],
            cropInfo: { crop_w: 608, crop_h: 1080, crop_x: 656, crop_y: 0 },
            videoUrl: "/sample-clip-1.mp4",
          },
        ],
      },
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(initialProjects, null, 2), "utf-8");
    return initialProjects;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw) as Project[];
  } catch (err) {
    return [];
  }
}

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
  } catch (err) {
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

function saveDb(projects: Project[]) {
  atomicWriteJsonSync(DB_FILE, projects);
}

export const db = {
  getProjects(): Project[] {
    return ensureDb().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getProject(id: string): Project | null {
    const projects = ensureDb();
    return projects.find((p) => p.id === id) || null;
  },

  saveProject(project: Project): Project {
    const projects = ensureDb();
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = project;
    } else {
      projects.unshift(project);
    }
    saveDb(projects);
    return project;
  },

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const projects = ensureDb();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...updates };
    saveDb(projects);
    return projects[idx];
  },

  getClip(clipId: string): { clip: ClipItem; project: Project } | null {
    const projects = ensureDb();
    for (const p of projects) {
      const c = p.clips.find((item) => item.id === clipId);
      if (c) return { clip: c, project: p };
    }
    return null;
  },

  updateClip(
    clipId: string,
    updates: Partial<ClipItem> & { startSec?: number; endSec?: number }
  ): ClipItem | null {
    const projects = ensureDb();
    for (let pIdx = 0; pIdx < projects.length; pIdx++) {
      const cIdx = projects[pIdx].clips.findIndex((item) => item.id === clipId);
      if (cIdx >= 0) {
        const existing = projects[pIdx].clips[cIdx];

        const startTime =
          updates.startTime !== undefined
            ? updates.startTime
            : updates.startSec !== undefined
            ? updates.startSec
            : existing.startTime;

        const endTime =
          updates.endTime !== undefined
            ? updates.endTime
            : updates.endSec !== undefined
            ? updates.endSec
            : existing.endTime;

        const duration =
          updates.duration !== undefined
            ? updates.duration
            : Math.round((endTime - startTime) * 10) / 10;

        const transcriptText =
          updates.transcriptText !== undefined
            ? updates.transcriptText
            : updates.words
            ? updates.words.map((w) => w.word).join(" ")
            : existing.transcriptText;

        const merged: ClipItem = {
          ...existing,
          ...updates,
          startTime,
          endTime,
          startSec: startTime,
          endSec: endTime,
          duration,
          transcriptText,
          cropInfo: updates.cropInfo
            ? { ...existing.cropInfo, ...updates.cropInfo }
            : existing.cropInfo,
          captionStyle: updates.captionStyle
            ? { ...(existing.captionStyle || {}), ...updates.captionStyle }
            : existing.captionStyle,
          updatedAt: new Date().toISOString(),
        };

        projects[pIdx].clips[cIdx] = merged;
        saveDb(projects);
        return projects[pIdx].clips[cIdx];
      }
    }
    return null;
  },

  deleteProject(id: string): boolean {
    const projects = ensureDb();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    projects.splice(idx, 1);
    saveDb(projects);
    return true;
  },

  deleteClip(clipId: string): boolean {
    const projects = ensureDb();
    for (let pIdx = 0; pIdx < projects.length; pIdx++) {
      const cIdx = projects[pIdx].clips.findIndex((item) => item.id === clipId);
      if (cIdx >= 0) {
        projects[pIdx].clips.splice(cIdx, 1);
        saveDb(projects);
        return true;
      }
    }
    return false;
  },
};
