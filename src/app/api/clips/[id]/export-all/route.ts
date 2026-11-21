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
    const item = db.getClip(id);
    if (!item) {
      return NextResponse.json({ success: false, error: "Clip not found" }, { status: 404 });
    }

    const { clip, project } = item;
    const body = await req.json().catch(() => ({}));
    const startTime = body.startTime !== undefined ? Number(body.startTime) : clip.startTime;
    const endTime = body.endTime !== undefined ? Number(body.endTime) : clip.endTime;
    const resolution = body.resolution || "1080p";
    const renderMode = body.renderMode || clip.renderMode || "crop";
    const captionStyle = body.captionStyle || clip.captionStyle?.preset || "viral_yellow";
    const captionPosition = body.captionPosition || clip.captionStyle?.position || "bottom";
    const captionsEnabled = body.captionsEnabled !== undefined ? Boolean(body.captionsEnabled) : true;
    const words = body.words || clip.words || [];

    const exportDir = path.join(process.cwd(), "data", "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Locate source video file
    let sourceVideo = project.sourcePath;
    if (!sourceVideo || !fs.existsSync(sourceVideo)) {
      const projDir = path.join(process.cwd(), "data", "runs", project.id, "downloads");
      if (fs.existsSync(projDir)) {
        const files = fs.readdirSync(projDir);
        const vid = files.find((f) => f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mkv"));
        if (vid) {
          sourceVideo = path.join(projDir, vid);
        }
      }
    }

    if (!sourceVideo || !fs.existsSync(sourceVideo)) {
      // Check shared cache downloads directory
      const cacheDir = path.join(process.cwd(), "data", "cache", "downloads");
      if (fs.existsSync(cacheDir)) {
        if (project.sourceUrl) {
          const match = project.sourceUrl.match(/([a-zA-Z0-9_-]{11})/);
          if (match && fs.existsSync(path.join(cacheDir, `${match[1]}.mp4`))) {
            sourceVideo = path.join(cacheDir, `${match[1]}.mp4`);
          }
        }
        if (!sourceVideo || !fs.existsSync(sourceVideo)) {
          const cFiles = fs.readdirSync(cacheDir);
          const cVid = cFiles.find((f) => f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mkv"));
          if (cVid) {
            sourceVideo = path.join(cacheDir, cVid);
          }
        }
      }
    }

    if (!sourceVideo || !fs.existsSync(sourceVideo)) {
      sourceVideo = clip.renderedVideoPath || path.join(process.cwd(), "public", "sample-video.mp4");
    }

    // Write words JSON for subtitle generation
    let wordsJsonPath = "";
    if (words && words.length > 0) {
      wordsJsonPath = path.join(exportDir, `${clip.id}_words_${Date.now()}.json`);
      fs.writeFileSync(wordsJsonPath, JSON.stringify(words, null, 2), "utf-8");
    }

    const baseName = `${clip.id}_all_formats_${resolution}_${Date.now()}`;
    const zipOutPath = path.join(exportDir, `${baseName}.zip`);

    const scriptPath = path.join(process.cwd(), "pipeline", "cli.py");
    const pyArgs = [
      scriptPath,
      "render-all-ratios",
      "--source", sourceVideo,
      "--start", String(startTime),
      "--end", String(endTime),
      "--resolution", resolution,
      "--render-mode", renderMode,
      "--caption-style", captionStyle,
      "--caption-position", captionPosition,
      "--output-dir", exportDir,
      "--base-name", baseName,
      "--zip-output", zipOutPath,
    ];

    if (!captionsEnabled) {
      pyArgs.push("--no-captions");
    }

    if (wordsJsonPath && fs.existsSync(wordsJsonPath)) {
      pyArgs.push("--words-json", wordsJsonPath);
    }

    const child = spawn("python", pyArgs, { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";

    await new Promise((resolve, reject) => {
      child.stdout.on("data", (d) => { stdout += d.toString(); });
      child.stderr.on("data", (d) => { stderr += d.toString(); });
      child.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`Render all ratios failed (code ${code}): ${stderr.slice(-300)}`));
      });
      child.on("error", reject);
    });

    // Cleanup temp words json
    if (wordsJsonPath && fs.existsSync(wordsJsonPath)) {
      try { fs.unlinkSync(wordsJsonPath); } catch {}
    }

    const downloadUrl = `/api/media?file=${encodeURIComponent(zipOutPath)}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      zipPath: zipOutPath,
      filename: `${baseName}.zip`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
