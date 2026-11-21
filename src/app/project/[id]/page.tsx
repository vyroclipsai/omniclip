"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  Download,
  Share2,
  Trash2,
  Sliders,
  Sparkles,
  Flame,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  Crop,
  Type,
  Maximize2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Edit3,
  ExternalLink,
  AlertCircle,
  Archive,
  Grid,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Plus,
  Wand2,
  X,
  SlidersHorizontal,
  FileText,
  Scissors,
  HelpCircle,
  RotateCcw,
  Video,
} from "lucide-react";
import { Project, ClipItem, WordToken } from "@/lib/db";
import { apiFetch, getApiUrl } from "@/lib/api-client";
import { WaveformTimeline } from "@/components/WaveformTimeline";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const { id: projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // View Mode: "grid" (Screen 4: Results Page) vs "studio" (Screen 5: Studio Editor)
  const [viewMode, setViewMode] = useState<"grid" | "studio">("grid");

  // Active / Selected Clip State
  const [selectedClipId, setSelectedClipId] = useState<string>("");
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);
  const [isBulkExporting, setIsBulkExporting] = useState(false);

  // Video Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeRubricPopId, setActiveRubricPopId] = useState<string | null>(null);

  // Action Pending States
  const [isRendering, setIsRendering] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Best Moments & Curation Controls State
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [isAlsoConsideredOpen, setIsAlsoConsideredOpen] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAddingCandidate, setIsAddingCandidate] = useState<string | null>(null);

  // Regeneration form inputs
  const [regenClipCount, setRegenClipCount] = useState<number>(8);
  const [regenStyle, setRegenStyle] = useState<string>("default");
  const [regenMinScore, setRegenMinScore] = useState<number>(65);
  const [regenDurationRange, setRegenDurationRange] = useState<"20-40" | "30-60" | "60-90">("30-60");
  const [regenPrompt, setRegenPrompt] = useState<string>("");

  // Editor State for Active Clip
  const [editStartTime, setEditStartTime] = useState<number>(0);
  const [editEndTime, setEditEndTime] = useState<number>(0);
  const [editTitle, setEditTitle] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "1:1" | "16:9">("9:16");
  const [resolution, setResolution] = useState<"1080p" | "720p">("1080p");
  const [renderMode, setRenderMode] = useState<"crop" | "blur_bg" | "split">("crop");
  const [debugOverlay, setDebugOverlay] = useState<boolean>(false);
  const [targetPersonId, setTargetPersonId] = useState<number | null>(null);
  const [showCropOverlay, setShowCropOverlay] = useState<boolean>(true);
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(true);
  const [captionPreset, setCaptionPreset] = useState<string>("viral_yellow");
  const [captionPosition, setCaptionPosition] = useState<"bottom" | "middle" | "top">("bottom");
  const [autoEmojis, setAutoEmojis] = useState<boolean>(true);
  const [headlineBanner, setHeadlineBanner] = useState<string>("");
  const [fillerWordsRemoved, setFillerWordsRemoved] = useState<boolean>(false);

  // Social Media Post Modal State
  const [socialModalClip, setSocialModalClip] = useState<ClipItem | null>(null);
  const [socialPostData, setSocialPostData] = useState<any | null>(null);
  const [socialPlatformTab, setSocialPlatformTab] = useState<"tiktok" | "youtubeShorts" | "reels" | "linkedin">("tiktok");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [editWords, setEditWords] = useState<WordToken[]>([]);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [rawTranscriptText, setRawTranscriptText] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadProject = async () => {
    const { data, error } = await apiFetch<{ success: boolean; project: Project; job?: any }>(
      `/api/projects/${projectId}`
    );
    if (data?.success && data.project) {
      setProject(data.project);
      if (data.job) setJob(data.job);
      if (data.project.clips && data.project.clips.length > 0) {
        if (!selectedClipId || !data.project.clips.some((c) => c.id === selectedClipId)) {
          const firstClip = data.project.clips[0];
          setSelectedClipId(firstClip.id);
          initializeEditor(firstClip);
        }
      }
    } else {
      console.error("Failed to fetch project:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  // Polling during processing
  useEffect(() => {
    if (!project || (project.status !== "processing" && project.status !== "queued")) return;
    const interval = setInterval(loadProject, 2000);
    return () => clearInterval(interval);
  }, [project?.status, projectId]);

  const handleRetryJob = async () => {
    showToast("Restarting processing pipeline...");
    if (job?.id) {
      await apiFetch(`/api/jobs/${job.id}/retry`, { method: "POST" });
    } else {
      await apiFetch(`/api/projects/${projectId}/process`, { method: "POST" });
    }
    loadProject();
  };

  const activeClip = project?.clips?.find((c) => c.id === selectedClipId);

  const initializeEditor = (clip: ClipItem) => {
    setEditStartTime(clip.startTime);
    setEditEndTime(clip.endTime);
    setEditTitle(clip.title);
    setAspectRatio((clip.aspectRatio as any) || "9:16");
    setResolution((clip.resolution as any) || "1080p");
    setCaptionsEnabled(clip.captionsEnabled !== undefined ? clip.captionsEnabled : true);
    setAutoEmojis(clip.autoEmojis !== undefined ? clip.autoEmojis : true);
    setHeadlineBanner(clip.headlineBanner || "");
    setFillerWordsRemoved(false);
    setRenderMode((clip.renderMode as any) || "crop");
    setDebugOverlay(false);
    setTargetPersonId(null);
    setCaptionPreset(clip.captionStyle?.preset || "viral_yellow");
    setCaptionPosition((clip.captionStyle?.position as any) || "bottom");
    setEditWords(clip.words || []);
    setRawTranscriptText(
      clip.transcriptText || (clip.words ? clip.words.map((w) => w.word).join(" ") : "")
    );
  };

  const handleSelectClip = (clip: ClipItem) => {
    setSelectedClipId(clip.id);
    initializeEditor(clip);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleOpenInStudio = (clip: ClipItem) => {
    handleSelectClip(clip);
    setViewMode("studio");
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      setCurrentTime(sec);
    }
  };

  const copyClipLink = (clip: ClipItem) => {
    const url = window.location.origin + `/project/${projectId}#${clip.id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    showToast("Clip link copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDeleteClip = async (clipId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this clip?")) return;
    const { data } = await apiFetch(`/api/clips/${clipId}`, { method: "DELETE" });
    if (data?.success) {
      showToast("Clip deleted successfully");
      loadProject();
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this entire project?")) return;
    const { data } = await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (data?.success) {
      router.push("/projects");
    }
  };

  // Bulk Selection Handlers
  const handleToggleSelectClip = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForBulk((prev) =>
      prev.includes(clipId) ? prev.filter((id) => id !== clipId) : [...prev, clipId]
    );
  };

  const handleToggleSelectAll = () => {
    if (!project?.clips) return;
    if (selectedForBulk.length === project.clips.length) {
      setSelectedForBulk([]);
    } else {
      setSelectedForBulk(project.clips.map((c) => c.id));
    }
  };

  const handleBulkExportZip = async () => {
    if (!project?.clips || project.clips.length === 0) return;
    setIsBulkExporting(true);
    showToast("Packaging selected clips into ZIP archive...");

    try {
      const targetIds = selectedForBulk.length > 0 ? selectedForBulk : project.clips.map((c) => c.id);
      const { data, error } = await apiFetch<{
        success: boolean;
        downloadUrl: string;
        filename: string;
        clipCount: number;
      }>(`/api/projects/${projectId}/export-zip`, {
        method: "POST",
        body: JSON.stringify({ clipIds: targetIds }),
      });

      if (data?.success && data.downloadUrl) {
        showToast(`Packaged ${data.clipCount} clips! Downloading ZIP...`);
        const a = document.createElement("a");
        a.href = getApiUrl(data.downloadUrl);
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        showToast(`Bulk export failed: ${error?.error || "Error packaging ZIP"}`);
      }
    } catch (err: any) {
      showToast(`Bulk export error: ${err.message}`);
    } finally {
      setIsBulkExporting(false);
    }
  };

  // Re-render and save active clip with updated timings/style/framing
  const handleReRenderAndSave = async () => {
    if (!activeClip) return;
    setIsRendering(true);
    showToast("Rendering updated clip with FFmpeg (preserving source FPS)...");

    try {
      let finalWords = editWords;
      if (isEditingTranscript) {
        const wordsArr = rawTranscriptText.trim().split(/\s+/);
        const duration = editEndTime - editStartTime;
        const perWord = duration / Math.max(1, wordsArr.length);
        finalWords = wordsArr.map((w, idx) => ({
          word: w,
          start: editStartTime + idx * perWord,
          end: editStartTime + (idx + 1) * perWord,
        }));
        setEditWords(finalWords);
        setIsEditingTranscript(false);
      }

      const { data, error } = await apiFetch<{
        success: boolean;
        downloadUrl: string;
        clip: ClipItem;
      }>(`/api/clips/${activeClip.id}/export`, {
        method: "POST",
        body: JSON.stringify({
          startTime: editStartTime,
          endTime: editEndTime,
          aspectRatio,
          resolution,
          renderMode,
          debugOverlay,
          targetPersonId,
          captionStyle: captionPreset,
          captionPosition,
          captionsEnabled,
          autoEmojis,
          headlineBanner: headlineBanner.trim() || undefined,
          words: finalWords,
          title: editTitle,
        }),
      });

      if (data?.success && data.clip) {
        showToast("Clip re-rendered and updated!");
        setProject((prev) =>
          prev
            ? {
                ...prev,
                clips: prev.clips.map((c) => (c.id === activeClip.id ? { ...c, ...data.clip } : c)),
              }
            : null
        );
        if (videoRef.current) {
          videoRef.current.load();
        }
      } else {
        showToast(`Render failed: ${error?.error || "Unknown error"}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsRendering(false);
    }
  };

  // Opus.pro Features: Social Post Generator, Clean Export, Filler Words, and Text Trimming
  const handleOpenSocialModal = async (clip: ClipItem) => {
    setSocialModalClip(clip);
    setSocialPostData(null);
    showToast("Generating viral social media post...");
    const { data } = await apiFetch<{ success: boolean; posts: any }>(`/api/clips/${clip.id}/social-post`);
    if (data?.success && data.posts) {
      setSocialPostData(data.posts);
    }
  };

  const handleCopyText = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    showToast("Copied to clipboard!");
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const FILLER_TOKENS = ["um", "uh", "uhh", "umm", "like", "you know", "literally", "sort of", "kind of"];

  const handleRemoveFillerWords = () => {
    const cleaned = editWords.filter((w) => {
      const clean = w.word.toLowerCase().replace(/[^a-z]/g, "");
      return !FILLER_TOKENS.includes(clean);
    });
    const removedCount = editWords.length - cleaned.length;
    setEditWords(cleaned);
    setFillerWordsRemoved(true);
    showToast(`Removed ${removedCount} filler words from subtitles! Click Save & Re-Render to burn.`);
  };

  const handleExportCleanVideo = async (clip: ClipItem) => {
    showToast("Rendering clean video without subtitles...");
    const { data, error } = await apiFetch<{ success: boolean; downloadUrl: string }>(
      `/api/clips/${clip.id}/export`,
      {
        method: "POST",
        body: JSON.stringify({
          captionsEnabled: false,
          aspectRatio: clip.aspectRatio || "9:16",
          resolution: clip.resolution || "1080p",
          renderMode: clip.renderMode || "crop",
        }),
      }
    );
    if (data?.success && data.downloadUrl) {
      showToast("Clean video ready! Downloading...");
      const a = document.createElement("a");
      a.href = getApiUrl(data.downloadUrl);
      a.download = `${clip.title.replace(/\s+/g, "_")}_clean.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      showToast(`Clean export failed: ${error?.error || "Unknown error"}`);
    }
  };

  // Export all 4 aspect ratios (9:16, 4:5, 1:1, 16:9) packaged in a ZIP archive
  const handleExportAllFormats = async () => {
    if (!activeClip) return;
    setIsExportingAll(true);
    showToast("Rendering all 4 aspect ratios (9:16, 4:5, 1:1, 16:9) & packaging ZIP...");

    try {
      let finalWords = editWords;
      if (isEditingTranscript) {
        const wordsArr = rawTranscriptText.trim().split(/\s+/);
        const duration = editEndTime - editStartTime;
        const perWord = duration / Math.max(1, wordsArr.length);
        finalWords = wordsArr.map((w, idx) => ({
          word: w,
          start: editStartTime + idx * perWord,
          end: editStartTime + (idx + 1) * perWord,
        }));
        setEditWords(finalWords);
        setIsEditingTranscript(false);
      }

      const { data, error } = await apiFetch<{
        success: boolean;
        downloadUrl: string;
        filename: string;
      }>(`/api/clips/${activeClip.id}/export-all`, {
        method: "POST",
        body: JSON.stringify({
          startTime: editStartTime,
          endTime: editEndTime,
          resolution,
          renderMode,
          debugOverlay,
          targetPersonId,
          captionStyle: captionPreset,
          captionPosition,
          captionsEnabled,
          autoEmojis,
          headlineBanner: headlineBanner.trim() || undefined,
          words: finalWords,
        }),
      });

      if (data?.success && data.downloadUrl) {
        showToast("All formats rendered! Downloading ZIP archive...");
        const a = document.createElement("a");
        a.href = getApiUrl(data.downloadUrl);
        a.download = data.filename || `clip_${activeClip.id}_all_formats_${resolution}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        showToast(`Export all failed: ${error?.error || "Unknown error"}`);
      }
    } catch (err: any) {
      showToast(`Export error: ${err.message}`);
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleRunRegenerate = async () => {
    setIsRegenerating(true);
    showToast("Re-evaluating moments using transcript cache (< 2s)...");
    try {
      const [minDur, maxDur] = regenDurationRange.split("-").map(Number);
      const { data, error } = await apiFetch<{
        success: boolean;
        project: Project;
        clipsCount: number;
        message?: string;
      }>(`/api/projects/${projectId}/regenerate`, {
        method: "POST",
        body: JSON.stringify({
          maxClips: regenClipCount,
          minScore: regenMinScore,
          clipStyle: regenStyle,
          prompt: regenPrompt,
          minDuration: minDur,
          maxDuration: maxDur,
        }),
      });

      if (data?.success && data.project) {
        setProject(data.project);
        if (data.project.clips && data.project.clips.length > 0) {
          handleSelectClip(data.project.clips[0]);
        }
        setIsRegenerateOpen(false);
        showToast(`Selected top ${data.clipsCount || data.project.clips.length} moments!`);
      } else {
        showToast(`Regeneration failed: ${error?.error || "Error re-ranking clips"}`);
      }
    } catch (err: any) {
      showToast(`Regeneration error: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAddCandidate = async (candidate: any) => {
    setIsAddingCandidate(candidate.id);
    showToast(`Adding "${candidate.title || "Selected Moment"}" to project clips...`);
    try {
      const { data, error } = await apiFetch<{
        success: boolean;
        clip: ClipItem;
        project: Project;
      }>(`/api/projects/${projectId}/add-clip`, {
        method: "POST",
        body: JSON.stringify({ candidate }),
      });

      if (data?.success && data.project) {
        setProject(data.project);
        if (data.clip) {
          handleSelectClip(data.clip);
        }
        showToast("Candidate successfully promoted to active clips!");
      } else {
        showToast(`Failed to add clip: ${error?.error || "Unknown error"}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsAddingCandidate(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090A] text-white flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Loading project results & clips...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#08090A] text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
        <p className="text-gray-400 mb-6">The requested project could not be found or has been removed.</p>
        <Link
          href="/app"
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  // SCREEN 3: PROCESSING SCREEN (Step-by-step progress, countdown estimate, background reassurance)
  if (project.status === "processing" || project.status === "queued") {
    const stageList = [
      { id: "ingest", label: "1. Ingest Video", desc: "Download & format verification" },
      { id: "transcribe", label: "2. Transcribe", desc: "Whisper word-level timestamps" },
      { id: "analyze", label: "3. Analyze Virality", desc: "6-factor rubric hook & emotion scoring" },
      { id: "reframe", label: "4. Smart Reframe", desc: "Rule-of-thirds headroom & subject tracking" },
      { id: "render", label: "5. Render Clips", desc: "Karaoke subtitles & native FPS output" },
    ];
    const stages = job?.stages || {
      ingest: { status: "running", progress: 50 },
      transcribe: { status: "pending", progress: 0 },
      analyze: { status: "pending", progress: 0 },
      reframe: { status: "pending", progress: 0 },
      render: { status: "pending", progress: 0 },
    };
    const overallProgress = job?.progress ?? project.progress ?? 0;
    const currentStepMsg = job?.currentStep ?? project.currentStep ?? "Processing video in background...";
    const currentStageName = job?.currentStage ?? "Ingest";

    // Estimated time remaining countdown calculation
    const estimatedTotalSeconds = project?.duration
      ? Math.min(180, Math.max(60, Math.round(project.duration / 30)))
      : 90;
    const progressRatio = Math.max(0.05, overallProgress / 100);
    const remainingSeconds = Math.max(5, Math.round(estimatedTotalSeconds * (1 - progressRatio)));

    return (
      <div className="min-h-screen bg-[#08090A] text-white flex flex-col">
        {/* Top Header */}
        <header className="border-b border-[#1F2328] bg-[#0B0D0E]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/projects"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Projects</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-sm font-bold text-white truncate max-w-sm">{project.name}</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
            <span>AI Pipeline Active ({overallProgress}%)</span>
          </div>
        </header>

        <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col justify-center space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Autonomous Multimodal Repurposing
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{project.name}</h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Extracting high-retention moments, reframing speakers, and generating word-synced subtitles.
            </p>
          </div>

          {/* Main Progress Bar & Countdown */}
          <div className="rounded-3xl border border-[#1F2328] bg-[#0E1013] p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping inline-block" />
                Current Stage: <span className="text-violet-300 font-bold">{currentStageName}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Est. ~{remainingSeconds}s remaining
                </span>
                <span className="text-xl font-extrabold font-mono text-violet-400">{overallProgress}%</span>
              </div>
            </div>

            <div className="h-3 w-full bg-[#181B1F] rounded-full overflow-hidden border border-white/5 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500 shadow-lg shadow-violet-500/30"
                style={{ width: `${Math.max(4, overallProgress)}%` }}
              />
            </div>

            <p className="text-xs text-gray-400 font-mono truncate">{currentStepMsg}</p>
          </div>

          {/* 5 Distinct Pipeline Stages */}
          <div className="rounded-2xl border border-[#1F2328] bg-[#0B0D0E] divide-y divide-[#1F2328]/70 overflow-hidden shadow-xl">
            {stageList.map((st) => {
              const state = (stages as any)[st.id] || { status: "pending", progress: 0 };
              const isDone = state.status === "completed";
              const isRunning = state.status === "running";
              const isFailed = state.status === "failed";

              return (
                <div key={st.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition ${
                        isDone
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : isRunning
                          ? "bg-violet-500/20 border-violet-500/40 text-violet-400 animate-pulse"
                          : isFailed
                          ? "bg-red-500/20 border-red-500/40 text-red-400"
                          : "bg-white/5 border-white/10 text-gray-500"
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : isRunning ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className={`text-xs sm:text-sm font-semibold ${isRunning ? "text-white" : isDone ? "text-gray-300" : "text-gray-500"}`}>
                        {st.label}
                      </h3>
                      <p className="text-[11px] text-gray-500">{st.desc}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full ${
                      isDone
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : isRunning
                        ? "bg-violet-500/10 text-violet-400 border border-violet-500/30"
                        : "bg-white/5 text-gray-500 border border-white/5"
                    }`}
                  >
                    {isDone ? "COMPLETE" : isRunning ? "IN PROGRESS" : "PENDING"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reassurance Banner: Can leave and come back */}
          <div className="p-4 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-xs text-violet-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0" />
            <p>
              <strong className="font-semibold text-white">Safe to navigate away: </strong>
              This job runs as a background process. You can close this tab or visit the{" "}
              <Link href="/projects" className="underline hover:text-white font-semibold">
                Projects Dashboard
              </Link>
              ; your clips will be ready when you return.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Failed State Screen with Retry
  if (project.status === "failed") {
    return (
      <div className="min-h-screen bg-[#08090A] text-white flex flex-col">
        <header className="border-b border-[#1F2328] bg-[#0B0D0E]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <Link
            href="/projects"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Projects</span>
          </Link>
        </header>

        <div className="flex-1 max-w-xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Processing Encountered an Issue</h1>
            <p className="text-sm text-rose-300 font-mono bg-rose-950/30 p-3 rounded-xl border border-rose-900/50">
              {project.currentStep || job?.error || "Pipeline execution halted."}
            </p>
            {job?.details && (
              <p className="text-xs text-gray-400 max-h-32 overflow-y-auto text-left font-mono bg-black/40 p-3 rounded-lg border border-white/5 mt-2">
                {job.details}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRetryJob}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-950/40 flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Job</span>
            </button>
            <Link
              href="/app"
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium border border-white/10 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETED STATE: Dual-View Controller (Screen 4: Results Grid vs Screen 5: Studio Editor)
  return (
    <div className="min-h-screen bg-[#08090A] text-white flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#16181D] border border-violet-500/40 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
      {/* Top Header with Mode Switcher */}
      <header className="border-b border-[#1F2328] bg-[#0B0D0E]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5 border border-white/5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Projects</span>
          </Link>
          <div className="h-5 w-[1px] bg-white/10" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                {project.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {project.clips?.length || 0} Clips
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher: Grid View vs Studio Editor */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-[#14171A] border border-[#272C33] p-1 text-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === "grid"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Results Grid</span>
            </button>
            <button
              onClick={() => setViewMode("studio")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === "studio"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Studio Editor</span>
            </button>
          </div>

          <button
            onClick={() => setIsRegenerateOpen(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-violet-500/30 bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 flex items-center gap-1.5 transition"
            title="Instant Curation & Re-rank"
          >
            <Wand2 className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Curation</span>
          </button>

          <button
            onClick={handleDeleteProject}
            className="text-xs text-rose-400 hover:text-rose-300 p-2 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 transition"
            title="Delete Project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ========================================================
          SCREEN 4: RESULTS PAGE (GRID VIEW)
          ======================================================== */}
      {viewMode === "grid" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Bulk Action & Curation Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0E1013] border border-[#1F2328]">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 transition"
              >
                {selectedForBulk.length === (project.clips?.length || 0) && project.clips?.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-violet-400" />
                ) : (
                  <Square className="w-4 h-4 text-gray-500" />
                )}
                <span>
                  {selectedForBulk.length === (project.clips?.length || 0)
                    ? "Deselect All"
                    : `Select All (${project.clips?.length || 0})`}
                </span>
              </button>

              {selectedForBulk.length > 0 && (
                <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-md border border-violet-500/20">
                  {selectedForBulk.length} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleBulkExportZip}
                disabled={isBulkExporting}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-600/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isBulkExporting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Archive className="w-3.5 h-3.5" />
                )}
                <span>Download {selectedForBulk.length > 0 ? `Selected (${selectedForBulk.length})` : "All"} as ZIP</span>
              </button>

              <button
                onClick={() => setIsRegenerateOpen(true)}
                className="px-3.5 py-2 bg-[#16181D] hover:bg-[#1E2228] border border-[#272C33] text-gray-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                <Wand2 className="w-3.5 h-3.5 text-violet-400" />
                <span>Re-rank Moments</span>
              </button>
            </div>
          </div>

          {/* Grid of Extracted Clips */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {project.clips?.map((clip, index) => {
              const isSelected = selectedForBulk.includes(clip.id);
              const isPopOpen = activeRubricPopId === clip.id;

              return (
                <div
                  key={clip.id}
                  className={`group rounded-2xl border overflow-hidden shadow-lg transition-all flex flex-col bg-[#111317] ${
                    isSelected ? "border-violet-500 ring-2 ring-violet-500/30" : "border-[#1F2328] hover:border-violet-500/40"
                  }`}
                >
                  {/* Card Video Header */}
                  <div className="relative aspect-[9/16] bg-black overflow-hidden flex items-center justify-center">
                    {clip.videoUrl ? (
                      <video
                        src={getApiUrl(clip.videoUrl)}
                        controls
                        className="w-full h-full object-cover"
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-950">
                        <Play className="w-10 h-10 text-violet-400 mb-2 opacity-80" />
                        <p className="text-xs text-gray-400 line-clamp-3">
                          &ldquo;{clip.transcriptText}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Bulk Selection Checkbox (Top Left) */}
                    <button
                      onClick={(e) => handleToggleSelectClip(clip.id, e)}
                      className="absolute top-3 left-3 z-20 p-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white hover:border-violet-400 transition"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-violet-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {/* Virality Score Badge (Top Right) */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveRubricPopId(isPopOpen ? null : clip.id);
                      }}
                      className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold shadow-lg cursor-pointer hover:scale-105 transition"
                      title="Click to view 6-factor virality rubric breakdown"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{clip.viralityScore}</span>
                      <span className="text-[9px] text-gray-400 font-normal">/100</span>
                    </div>

                    {/* Duration & Aspect Ratio Badge (Bottom) */}
                    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-gray-300 border border-white/10">
                      <span>{clip.duration}s</span>
                      <span>•</span>
                      <span className="text-violet-300 font-bold">{clip.aspectRatio || "9:16"}</span>
                    </div>

                    {/* Rubric Breakdown Floating Popover */}
                    {isPopOpen && clip.rubric && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-x-2 top-12 z-30 p-3 rounded-xl bg-[#16181D]/95 border border-violet-500/40 shadow-2xl backdrop-blur-md animate-fade-in text-white space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold border-b border-white/10 pb-1">
                          <span className="text-amber-400 flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-amber-400" />
                            6-Factor Rubric ({clip.viralityScore}/100)
                          </span>
                          <button
                            onClick={() => setActiveRubricPopId(null)}
                            className="text-gray-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                          <div className="p-1 rounded bg-black/40 border border-white/5 flex justify-between">
                            <span className="text-gray-400">Hook (30%):</span>
                            <span className="text-violet-300 font-bold">{clip.rubric.hook_strength}/10</span>
                          </div>
                          <div className="p-1 rounded bg-black/40 border border-white/5 flex justify-between">
                            <span className="text-gray-400">Emotion (20%):</span>
                            <span className="text-pink-300 font-bold">{clip.rubric.emotional_intensity}/10</span>
                          </div>
                          <div className="p-1 rounded bg-black/40 border border-white/5 flex justify-between">
                            <span className="text-gray-400">Story (20%):</span>
                            <span className="text-cyan-300 font-bold">{clip.rubric.story_completeness}/10</span>
                          </div>
                          <div className="p-1 rounded bg-black/40 border border-white/5 flex justify-between">
                            <span className="text-gray-400">Value (15%):</span>
                            <span className="text-emerald-300 font-bold">{clip.rubric.value_density}/10</span>
                          </div>
                          <div className="p-1 rounded bg-black/40 border border-white/5 flex justify-between">
                            <span className="text-gray-400">Share (10%):</span>
                            <span className="text-amber-300 font-bold">{clip.rubric.shareability}/10</span>
                          </div>
                          <div className="p-1 rounded bg-black/40 border border-white/5 flex justify-between">
                            <span className="text-gray-400">Clarity (5%):</span>
                            <span className="text-indigo-300 font-bold">{clip.rubric.clarity}/10</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Details & Actions */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
                        <span>#{index + 1} MOMENT</span>
                        <span className="font-mono text-gray-400">
                          {Math.round(clip.startTime)}s - {Math.round(clip.endTime)}s
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-violet-300 transition-colors">
                        {clip.title}
                      </h4>
                      {(clip.reason || clip.explanation) && (
                        <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2 italic leading-relaxed">
                          &ldquo;{clip.reason || clip.explanation}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenInStudio(clip)}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/30 text-violet-300 hover:text-white border border-violet-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5 text-violet-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleOpenSocialModal(clip)}
                          className="py-2 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/35 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          title="Generate TikTok, Shorts, Reels & LinkedIn viral copy + hashtags"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Copy Post</span>
                        </button>

                        {clip.videoUrl && (
                          <a
                            href={getApiUrl(clip.videoUrl)}
                            download={`${clip.title.replace(/\s+/g, "_")}.mp4`}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition"
                            title="Download MP4 video"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          onClick={() => handleExportCleanVideo(clip)}
                          className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition"
                          title="Download Clean Video (no burned subtitles)"
                        >
                          <Video className="w-3.5 h-3.5 text-cyan-400" />
                        </button>

                        <button
                          onClick={(e) => handleDeleteClip(clip.id, e)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/15 text-gray-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition"
                          title="Delete clip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Subtitle & Format Downloads */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 pt-1">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-gray-500" />
                          <span>Subtitles:</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={getApiUrl(`/api/clips/${clip.id}/subtitles?format=srt`)}
                            download={`${clip.title.replace(/\s+/g, "_")}.srt`}
                            className="hover:text-violet-400 font-mono underline"
                          >
                            .SRT
                          </a>
                          <span>•</span>
                          <a
                            href={getApiUrl(`/api/clips/${clip.id}/subtitles?format=vtt`)}
                            download={`${clip.title.replace(/\s+/g, "_")}.vtt`}
                            className="hover:text-violet-400 font-mono underline"
                          >
                            .VTT
                          </a>
                          <span>•</span>
                          <button
                            onClick={() => handleExportCleanVideo(clip)}
                            className="hover:text-cyan-400 font-mono underline cursor-pointer"
                          >
                            Clean Video
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* "Also Considered" Section (Candidates that didn't make top N) */}
          {project.alsoConsidered && project.alsoConsidered.length > 0 && (
            <div className="mt-10 rounded-2xl border border-[#1F2328] bg-[#0E1013] overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAlsoConsideredOpen(!isAlsoConsideredOpen)}
                className="w-full flex items-center justify-between p-5 text-sm font-bold text-white hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Also Considered Moments ({project.alsoConsidered.length})</span>
                  <span className="text-xs font-normal text-gray-400 hidden sm:inline">
                    - Promising candidate moments you can promote to full clips
                  </span>
                </div>
                {isAlsoConsideredOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {isAlsoConsideredOpen && (
                <div className="p-5 border-t border-[#1F2328] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.alsoConsidered.map((cand: any, cIdx: number) => (
                    <div
                      key={cand.id || cIdx}
                      className="p-4 rounded-xl bg-[#14171A] border border-[#23272D] flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-1">
                          <span>
                            {Math.round(cand.startTime || cand.start_time || 0)}s - {Math.round(cand.endTime || cand.end_time || 30)}s
                          </span>
                          <span className="font-bold text-amber-400 flex items-center gap-0.5">
                            <Flame className="w-3 h-3 fill-amber-400" />
                            {cand.viralityScore || 70}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-200 line-clamp-1 mb-1">
                          {cand.title || "Potential Highlight"}
                        </h4>
                        {(cand.reason || cand.explanation) && (
                          <p className="text-[11px] text-gray-400 line-clamp-2 italic leading-relaxed">
                            &ldquo;{cand.reason || cand.explanation}&rdquo;
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddCandidate(cand)}
                        disabled={isAddingCandidate === cand.id}
                        className="w-full py-2 px-3 bg-violet-600/15 hover:bg-violet-600 border border-violet-500/30 hover:border-violet-500 text-violet-300 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        {isAddingCandidate === cand.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Promote to Active Clips</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ========================================================
          SCREEN 5: STUDIO EDITOR
          Left = Transcript | Center = Video + Crop Overlay | Right = Settings | Bottom = Waveform Timeline
          ======================================================== */}
      {viewMode === "studio" && activeClip && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Studio Top Control Strip: Switch Clip pills */}
          <div className="px-6 py-2.5 bg-[#0C0E11] border-b border-[#1F2328] flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
                Clips:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {project.clips?.map((c, idx) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectClip(c)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                      c.id === selectedClipId
                        ? "bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-600/20"
                        : "bg-[#14171A] text-gray-400 hover:text-white border-[#23272D]"
                    }`}
                  >
                    #{idx + 1} ({Math.round(c.duration)}s)
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportAllFormats}
                disabled={isExportingAll}
                className="px-3 py-1.5 bg-[#181B1F] hover:bg-[#20252A] border border-violet-500/40 text-violet-300 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isExportingAll ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
                <span>Export All 4 Ratios (ZIP)</span>
              </button>
            </div>
          </div>

          {/* 3-Column Studio Body */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* COLUMN 1: LEFT = SYNCED TRANSCRIPT */}
            <div className="w-full lg:w-80 border-r border-[#1F2328] bg-[#0E1013] flex flex-col shrink-0 overflow-y-auto">
              <div className="p-4 border-b border-[#1F2328] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-violet-400" />
                    <span>Synced Transcript</span>
                  </h3>
                  <p className="text-[10px] text-gray-500">Click word to seek video</p>
                </div>
                <button
                  onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 rounded-md border border-violet-500/30 transition flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isEditingTranscript ? "Done" : "Edit Text"}</span>
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                {/* Filler Words Filter Banner */}
                {editWords && editWords.some(w => FILLER_TOKENS.includes(w.word.toLowerCase().replace(/[^a-z]/g, ""))) && !fillerWordsRemoved && (
                  <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-amber-300 font-semibold">
                        {editWords.filter(w => FILLER_TOKENS.includes(w.word.toLowerCase().replace(/[^a-z]/g, ""))).length} filler words detected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFillerWords}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white font-bold transition text-[10px] cursor-pointer"
                    >
                      Clean All
                    </button>
                  </div>
                )}

                {isEditingTranscript ? (
                  <textarea
                    value={rawTranscriptText}
                    onChange={(e) => setRawTranscriptText(e.target.value)}
                    rows={12}
                    className="w-full p-3 bg-[#16181D] border border-[#272C33] rounded-xl text-xs text-gray-200 focus:outline-none focus:border-violet-500 leading-relaxed font-sans"
                    placeholder="Edit transcript text..."
                  />
                ) : (
                  <div className="space-y-1 text-xs leading-relaxed">
                    <p className="text-[10px] text-gray-500 mb-2 italic">
                      Hover any word to trim video start/end boundaries directly.
                    </p>
                    {editWords && editWords.length > 0 ? (
                      editWords.map((token, wIdx) => {
                        const isWordActive =
                          currentTime >= token.start - activeClip.startTime &&
                          currentTime <= token.end - activeClip.startTime;
                        const cleanLower = token.word.toLowerCase().replace(/[^a-z]/g, "");
                        const isFiller = FILLER_TOKENS.includes(cleanLower);
                        return (
                          <span
                            key={wIdx}
                            className="group/word relative inline-block mr-1 mb-1"
                          >
                            <span
                              onClick={() => seekTo(Math.max(0, token.start - activeClip.startTime))}
                              className={`inline-block px-1.5 py-0.5 rounded cursor-pointer transition select-none ${
                                isWordActive
                                  ? "bg-amber-400 text-black font-extrabold shadow-md scale-105"
                                  : isFiller
                                  ? "line-through text-gray-500 bg-red-500/10"
                                  : "text-gray-300 hover:text-white hover:bg-white/10"
                              }`}
                              title={`Jump to ${token.start.toFixed(1)}s (Hover for trim buttons)`}
                            >
                              {token.word}
                            </span>
                            {/* Hover Trim Tooltip */}
                            <span className="hidden group-hover/word:flex absolute -top-7 left-0 z-30 bg-[#16181D] border border-white/20 rounded shadow-xl px-1.5 py-0.5 items-center gap-1.5 text-[9px] text-gray-300 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditStartTime(Math.max(0, token.start));
                                  showToast(`Trimmed start to ${token.start.toFixed(1)}s`);
                                }}
                                className="hover:text-amber-300 font-bold"
                              >
                                ✂️ Start
                              </button>
                              <span>|</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditEndTime(Math.max(editStartTime + 1, token.end));
                                  showToast(`Trimmed end to ${token.end.toFixed(1)}s`);
                                }}
                                className="hover:text-amber-300 font-bold"
                              >
                                End ✂️
                              </button>
                            </span>
                          </span>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 italic text-xs">
                        {rawTranscriptText || activeClip.transcriptText || "No transcript words available."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: CENTER = VIDEO PREVIEW & CROP BOX OVERLAY */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center border-r border-[#1F2328] bg-[#08090A] overflow-y-auto">
              <div className="w-full max-w-sm sm:max-w-md bg-black rounded-2xl overflow-hidden border border-[#272C33] shadow-2xl relative flex flex-col items-center">
                <div
                  className={`relative w-full flex items-center justify-center bg-black overflow-hidden ${
                    aspectRatio === "9:16"
                      ? "aspect-[9/16] max-h-[540px]"
                      : aspectRatio === "4:5"
                      ? "aspect-[4/5] max-h-[500px]"
                      : aspectRatio === "1:1"
                      ? "aspect-square max-h-[440px]"
                      : "aspect-video"
                  }`}
                >
                  {activeClip.videoUrl ? (
                    <video
                      ref={videoRef}
                      src={getApiUrl(activeClip.videoUrl)}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full h-full object-contain"
                      playsInline
                    />
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <Layers className="w-10 h-10 mx-auto text-gray-600 mb-2" />
                      <p className="text-xs">Render preview</p>
                      <button
                        onClick={handleReRenderAndSave}
                        className="mt-3 px-3 py-1.5 bg-violet-600 text-xs font-bold rounded-lg text-white"
                      >
                        Render MP4
                      </button>
                    </div>
                  )}

                  {/* Crop-Box Overlay & TikTok Safe-Zone Guides */}
                  {showCropOverlay && (
                    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3">
                      {/* Top Bar with Aspect Ratio Badge & Safe Zone Line */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/75 backdrop-blur-md text-violet-300 border border-violet-500/40 shadow-sm flex items-center gap-1">
                            <Crop className="w-3 h-3 text-violet-400" />
                            <span>{aspectRatio}</span>
                          </span>
                          <span className="text-[9px] font-mono text-gray-400 bg-black/60 px-1.5 py-0.5 rounded">
                            {renderMode.toUpperCase()}
                          </span>
                        </div>
                        <div className="w-full border-b border-dashed border-violet-400/30 flex justify-end">
                          <span className="text-[8px] text-violet-300/60 font-mono pr-1">Top UI Safe Zone</span>
                        </div>
                      </div>

                      {/* Rule of Thirds Grid Lines */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 bottom-0 left-1/3 border-r border-white/10" />
                        <div className="absolute top-0 bottom-0 left-2/3 border-r border-white/10" />
                        <div className="absolute left-0 right-0 top-1/3 border-b border-white/10" />
                        <div className="absolute left-0 right-0 top-2/3 border-b border-white/10" />
                      </div>

                      {/* Bottom Safe Zone Line */}
                      <div className="space-y-1 mb-1">
                        <div className="w-full border-t border-dashed border-amber-400/30 flex justify-end">
                          <span className="text-[8px] text-amber-300/70 font-mono pr-1">Captions Safe Zone</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Play/Pause Overlay Icon */}
                  {activeClip.videoUrl && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition z-20 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-full bg-violet-600/90 text-white flex items-center justify-center shadow-lg">
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </div>
                    </button>
                  )}
                </div>

                {/* Player Transport Controls */}
                {activeClip.videoUrl && (
                  <div className="w-full bg-[#121517] border-t border-[#1F2328] px-4 py-2.5 flex items-center justify-between text-xs text-gray-400">
                    <button onClick={togglePlay} className="text-white hover:text-violet-400 transition cursor-pointer">
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 mx-3 flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max={videoDuration || activeClip.duration || 10}
                        step="0.05"
                        value={currentTime}
                        onChange={(e) => seekTo(parseFloat(e.target.value))}
                        className="w-full accent-violet-500 cursor-pointer h-1.5 bg-[#23272B] rounded-lg"
                      />
                      <span className="font-mono text-[11px] shrink-0 text-gray-300">
                        {currentTime.toFixed(1)}s / {(videoDuration || activeClip.duration).toFixed(1)}s
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCropOverlay(!showCropOverlay)}
                        className={`p-1 rounded transition text-xs ${
                          showCropOverlay ? "text-violet-400 bg-violet-500/10" : "text-gray-400 hover:text-white"
                        }`}
                        title="Toggle Crop & Safe-Zone Guides"
                      >
                        <Crop className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.muted = !isMuted;
                            setIsMuted(!isMuted);
                          }
                        }}
                        className="text-gray-400 hover:text-white transition cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Aspect Ratio Toggle Pills */}
              <div className="flex items-center gap-2 mt-4">
                {(["9:16", "4:5", "1:1", "16:9"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      aspectRatio === r
                        ? "bg-violet-600/25 border-violet-500 text-white shadow-sm"
                        : "bg-[#14171A] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* COLUMN 3: RIGHT = SETTINGS PANEL */}
            <div className="w-full lg:w-96 p-6 bg-[#0B0D0E] flex flex-col space-y-5 overflow-y-auto">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Sliders className="w-3.5 h-3.5 text-violet-400" />
                  <span>Clip Settings</span>
                </h3>
                <p className="text-[11px] text-gray-400">Re-renders in ~3 seconds from cached transcript</p>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400">Clip Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#14171A] border border-[#272C33] rounded-xl text-xs font-bold text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Trim Controls */}
              <div className="p-3.5 rounded-xl bg-[#121517] border border-[#1F2328] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-300 flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-violet-400" />
                    <span>Trim Boundaries</span>
                  </span>
                  <span className="text-violet-400 font-mono font-bold">
                    {(editEndTime - editStartTime).toFixed(1)}s
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 block mb-0.5">Start (s)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-[#181B1F] border border-[#272C33] rounded-lg font-mono text-white text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block mb-0.5">End (s)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-[#181B1F] border border-[#272C33] rounded-lg font-mono text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Layout Mode (FILL / FIT / SPLIT) */}
              <div className="p-3.5 rounded-xl bg-[#121517] border border-[#1F2328] space-y-2">
                <span className="text-[11px] font-bold text-gray-300 block">Framing Mode</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRenderMode("crop")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      renderMode === "crop"
                        ? "bg-violet-600/25 border-violet-500 text-white"
                        : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    FILL (Smart)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenderMode("blur_bg")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      renderMode === "blur_bg"
                        ? "bg-violet-600/25 border-violet-500 text-white"
                        : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    FIT (Blur)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenderMode("split")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      renderMode === "split"
                        ? "bg-violet-600/25 border-violet-500 text-white"
                        : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    SPLIT
                  </button>
                </div>
              </div>

              {/* Captions Toggle & Presets */}
              <div className="p-3.5 rounded-xl bg-[#121517] border border-[#1F2328] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-300">Karaoke Subtitles</span>
                  <button
                    type="button"
                    onClick={() => setCaptionsEnabled(!captionsEnabled)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      captionsEnabled
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {captionsEnabled ? "Captions: ON" : "Captions: OFF"}
                  </button>
                </div>

                {captionsEnabled && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "viral_yellow", name: "Viral Yellow", color: "#FACC15" },
                        { id: "neon_green", name: "Neon Green", color: "#10B981" },
                        { id: "cyber_cyan", name: "Cyber Cyan", color: "#06B6D4" },
                        { id: "fire_orange", name: "Fire Orange", color: "#F97316" },
                        { id: "clean_minimal", name: "Clean Minimal", color: "#E5E7EB" },
                        { id: "bold_pop", name: "Bold Pop", color: "#F0F900" },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setCaptionPreset(preset.id)}
                          className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition ${
                            captionPreset === preset.id
                              ? "bg-violet-600/25 border-violet-500 text-white font-bold"
                              : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: preset.color }} />
                          <span className="text-[10px] truncate">{preset.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-gray-400 text-[11px]">Position:</span>
                      <div className="flex gap-1">
                        {(["bottom", "middle", "top"] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setCaptionPosition(pos)}
                            className={`px-2 py-0.5 rounded text-[10px] capitalize border ${
                              captionPosition === pos
                                ? "bg-violet-600/25 border-violet-500 text-white font-bold"
                                : "border-transparent text-gray-400 hover:text-white"
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-gray-400 text-[11px] flex items-center gap-1">
                        <span>⚡ Auto-Emojis</span>
                        <span className="text-[10px] text-gray-500">(💰, 🔥, 🚀)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAutoEmojis(!autoEmojis)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          autoEmojis
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                            : "bg-gray-800 border-gray-700 text-gray-500"
                        }`}
                      >
                        {autoEmojis ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Hook Headline Banner (Opus Header) */}
              <div className="p-3.5 rounded-xl bg-[#121517] border border-[#1F2328] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1">
                    <Type className="w-3.5 h-3.5 text-violet-400" />
                    <span>Top Hook Headline</span>
                  </span>
                  {headlineBanner && (
                    <button
                      type="button"
                      onClick={() => setHeadlineBanner("")}
                      className="text-[10px] text-gray-500 hover:text-rose-400"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. HE MADE $10M IN 30 DAYS 🤯"
                  value={headlineBanner}
                  onChange={(e) => setHeadlineBanner(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#181B1F] border border-[#272C33] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                />
                <p className="text-[9px] text-gray-500">
                  Pinned at top of clip for maximum scroll-stopping retention.
                </p>
              </div>

              {/* Action Buttons: Re-render Only This Clip */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleReRenderAndSave}
                  disabled={isRendering || isExportingAll}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:via-indigo-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isRendering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Rendering Clip (~3s)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Save & Re-render Clip ({aspectRatio})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleExportCleanVideo(activeClip)}
                  className="w-full py-2 bg-[#181B1F] hover:bg-[#20252A] border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Clean Video (No Captions)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={getApiUrl(`/api/clips/${activeClip.id}/subtitles?format=srt`)}
                    download={`${activeClip.title.replace(/\s+/g, "_")}.srt`}
                    className="py-2 px-3 bg-[#181B1F] hover:bg-[#20252A] border border-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export SRT</span>
                  </a>

                  <a
                    href={getApiUrl(`/api/clips/${activeClip.id}/subtitles?format=vtt`)}
                    download={`${activeClip.title.replace(/\s+/g, "_")}.vtt`}
                    className="py-2 px-3 bg-[#181B1F] hover:bg-[#20252A] border border-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export VTT</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM: AUDIO WAVEFORM TIMELINE */}
          <WaveformTimeline
            currentTime={currentTime}
            duration={activeClip.duration}
            startTime={editStartTime}
            endTime={editEndTime}
            isPlaying={isPlaying}
            onSeek={seekTo}
          />
        </div>
      )}

      {/* Curation & Instant Re-rank Modal */}
      {isRegenerateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121517] border border-[#272C33] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-fade-in text-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Curation & Instant Re-rank</h3>
                  <p className="text-[11px] text-gray-400">Re-evaluate cached transcript in ~1 second</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegenerateOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Style Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Style Focus Preset</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "default", name: "Default (Balanced)" },
                  { id: "educational", name: "Educational" },
                  { id: "funny", name: "Humorous / Funny" },
                  { id: "storytelling", name: "Storytelling" },
                  { id: "controversial", name: "Bold / Debate" },
                  { id: "inspirational", name: "Inspirational" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setRegenStyle(preset.id)}
                    className={`py-2 px-2 text-[11px] font-medium rounded-lg border text-center transition truncate ${
                      regenStyle === preset.id
                        ? "bg-violet-600/25 border-violet-500 text-white shadow-sm"
                        : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Clip Count */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300">Target Clip Count</label>
                <span className="text-xs font-mono text-violet-400">{regenClipCount} clips</span>
              </div>
              <div className="flex items-center gap-2">
                {[3, 5, 8, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setRegenClipCount(cnt)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                      regenClipCount === cnt
                        ? "bg-violet-600/30 border-violet-500 text-white"
                        : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Min Virality Score Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-gray-300">Minimum Virality Cutoff</label>
                <span className="font-mono text-amber-400 font-bold">{regenMinScore} / 100</span>
              </div>
              <input
                type="range"
                min="50"
                max="85"
                step="1"
                value={regenMinScore}
                onChange={(e) => setRegenMinScore(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#23272B] rounded-lg"
              />
            </div>

            {/* Target Duration Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Clip Duration Range</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "20-40", label: "20 - 40s (Snappy)" },
                  { id: "30-60", label: "30 - 60s (Standard)" },
                  { id: "60-90", label: "60 - 90s (Extended)" },
                ].map((dur) => (
                  <button
                    key={dur.id}
                    type="button"
                    onClick={() => setRegenDurationRange(dur.id as any)}
                    className={`py-1.5 text-[11px] font-medium rounded-lg border transition ${
                      regenDurationRange === dur.id
                        ? "bg-violet-600/25 border-violet-500 text-white"
                        : "bg-[#181B1F] border-[#272C33] text-gray-400 hover:text-white"
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsRegenerateOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunRegenerate}
                disabled={isRegenerating}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-950/40 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Re-ranking Candidates...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply & Re-rank Moments</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opus-Style AI Social Media Post & Metadata Generator Modal */}
      {socialModalClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121517] border border-[#272C33] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-fade-in text-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Viral Social Media Copy</h3>
                  <p className="text-[11px] text-gray-400">High-converting captions, hooks & trending hashtags</p>
                </div>
              </div>
              <button
                onClick={() => setSocialModalClip(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selection Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#181B1F] rounded-xl border border-white/5">
              {[
                { id: "tiktok", label: "TikTok 🎵" },
                { id: "youtubeShorts", label: "YouTube Shorts 🔴" },
                { id: "reels", label: "Instagram Reels 📸" },
                { id: "linkedin", label: "LinkedIn / X 💼" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSocialPlatformTab(p.id as any)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    socialPlatformTab === p.id
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Post Content Display */}
            {socialPostData ? (
              <div className="space-y-4">
                {socialPlatformTab === "tiktok" && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#16181D] border border-white/5 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                        Hook & Caption
                      </span>
                      <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {socialPostData.tiktok?.caption}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        Trending Hashtags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {socialPostData.tiktok?.hashtags?.map((tag: string, tIdx: number) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded-full bg-violet-600/15 border border-violet-500/30 text-violet-300 text-[11px] font-mono"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {socialPlatformTab === "youtubeShorts" && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#16181D] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                          Shorts Title (High CTR)
                        </span>
                        <button
                          onClick={() => handleCopyText(socialPostData.youtubeShorts?.title, "yt-title")}
                          className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 font-mono"
                        >
                          {copiedSection === "yt-title" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy Title</span>
                        </button>
                      </div>
                      <p className="text-xs font-bold text-white">
                        {socialPostData.youtubeShorts?.title}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#16181D] border border-white/5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        Description & Tags
                      </span>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {socialPostData.youtubeShorts?.caption}
                      </p>
                    </div>
                  </div>
                )}

                {socialPlatformTab === "reels" && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#16181D] border border-white/5 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block">
                        Instagram Caption & Hook
                      </span>
                      <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {socialPostData.reels?.caption}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {socialPostData.reels?.hashtags?.map((tag: string, tIdx: number) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-full bg-pink-600/15 border border-pink-500/30 text-pink-300 text-[11px] font-mono"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {socialPlatformTab === "linkedin" && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#16181D] border border-white/5 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                        LinkedIn Insight Post
                      </span>
                      <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
                        {socialPostData.linkedin?.fullText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bottom Copy Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    Ready to paste directly into your video publisher
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const full =
                        socialPlatformTab === "tiktok"
                          ? socialPostData.tiktok?.fullText
                          : socialPlatformTab === "youtubeShorts"
                          ? socialPostData.youtubeShorts?.fullText
                          : socialPlatformTab === "reels"
                          ? socialPostData.reels?.fullText
                          : socialPostData.linkedin?.fullText;
                      handleCopyText(full || "", "modal-full");
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-950/40 transition cursor-pointer"
                  >
                    {copiedSection === "modal-full" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-black" />
                        <span>Copied Post!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-black" />
                        <span>Copy Complete Post</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span className="text-xs">Generating viral copy and hashtags...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
