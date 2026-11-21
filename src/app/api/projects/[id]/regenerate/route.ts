import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = db.getProject(id);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const maxClips = body.maxClips !== undefined ? Number(body.maxClips) : 8;
    const minScore = body.minScore !== undefined ? Number(body.minScore) : 65.0;
    const clipStyle = body.clipStyle || "default";
    const prompt = body.prompt || "";
    const minDuration = body.minDuration !== undefined ? Number(body.minDuration) : 20.0;
    const maxDuration = body.maxDuration !== undefined ? Number(body.maxDuration) : 60.0;

    // Locate transcript.json
    let transcriptPath = path.join(process.cwd(), "data", "runs", id, "transcript.json");
    if (!fs.existsSync(transcriptPath)) {
      // Check shared cache
      const cacheDir = path.join(process.cwd(), "data", "cache", "transcripts");
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        const tf = files.find((f) => f.endsWith(".json"));
        if (tf) transcriptPath = path.join(cacheDir, tf);
      }
    }

    if (!fs.existsSync(transcriptPath)) {
      return NextResponse.json({
        success: false,
        error: "Transcript cache not found. Please run initial processing first."
      }, { status: 400 });
    }

    // Locate source video for audio RMS analysis
    let sourceVideo = project.sourcePath || "";
    if (!sourceVideo || !fs.existsSync(sourceVideo)) {
      const projDir = path.join(process.cwd(), "data", "runs", id, "downloads");
      if (fs.existsSync(projDir)) {
        const files = fs.readdirSync(projDir);
        const vid = files.find((f) => f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mkv"));
        if (vid) sourceVideo = path.join(projDir, vid);
      }
    }

    const outJsonPath = path.join(process.cwd(), "data", "runs", id, `regenerate_${Date.now()}.json`);
    const scriptPath = path.join(process.cwd(), "pipeline", "cli.py");

    const pyArgs = [
      scriptPath,
      "discover",
      "--transcript", transcriptPath,
      "--max-clips", String(maxClips),
      "--min-score", String(minScore),
      "--clip-style", clipStyle,
      "--min-duration", String(minDuration),
      "--max-duration", String(maxDuration),
      "--output-json", outJsonPath,
    ];

    if (sourceVideo && fs.existsSync(sourceVideo)) {
      pyArgs.push("--video", sourceVideo);
    }
    if (prompt.trim()) {
      pyArgs.push("--prompt", prompt.trim());
    }

    const child = spawn("python", pyArgs, { cwd: process.cwd() });
    let stderr = "";

    await new Promise((resolve, reject) => {
      child.stderr.on("data", (d) => { stderr += d.toString(); });
      child.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`Discovery failed (code ${code}): ${stderr.slice(-300)}`));
      });
      child.on("error", reject);
    });

    if (!fs.existsSync(outJsonPath)) {
      return NextResponse.json({ success: false, error: "Failed to generate discovery output manifest" }, { status: 500 });
    }

    const rawData = fs.readFileSync(outJsonPath, "utf-8");
    const parsed = JSON.parse(rawData);
    try { fs.unlinkSync(outJsonPath); } catch {}

    const newClips = (parsed.clips || []).map((c: any) => ({
      id: c.id,
      projectId: id,
      title: c.title,
      viralityScore: c.viralityScore,
      hookRating: c.hookRating,
      explanation: c.explanation,
      reason: c.reason,
      suggestedHook: c.suggested_hook,
      rubric: c.rubric,
      startTime: c.start_time,
      endTime: c.end_time,
      duration: c.duration,
      transcriptText: c.transcript_text,
      words: c.words,
      aspectRatio: project.clips?.[0]?.aspectRatio || "9:16",
      renderMode: project.clips?.[0]?.renderMode || "crop",
      captionStyle: project.clips?.[0]?.captionStyle || { preset: "viral_yellow", position: "bottom" },
      captionsEnabled: project.clips?.[0]?.captionsEnabled !== undefined ? project.clips[0].captionsEnabled : true,
    }));

    // Update in database
    const updated = db.updateProject(id, {
      clips: newClips,
      alsoConsidered: parsed.also_considered || [],
      settings: {
        ...(project.settings || {}),
        clipStyle,
        prompt,
        minScore,
        maxClips,
        minDuration,
        maxDuration,
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully regenerated ${newClips.length} high-precision clips.`,
      project: updated,
      clips: newClips,
      alsoConsidered: parsed.also_considered || [],
      metadata: parsed.metadata || {},
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
