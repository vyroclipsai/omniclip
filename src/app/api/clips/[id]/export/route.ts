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
    const aspectRatio = body.aspectRatio || clip.aspectRatio || "9:16";
    const resolution = body.resolution || "1080p";
    const renderMode = body.renderMode || clip.renderMode || "crop";
    const captionStyle = body.captionStyle || clip.captionStyle?.preset || "viral_yellow";
    const captionPosition = body.captionPosition || clip.captionStyle?.position || "bottom";
    const captionsEnabled = body.captionsEnabled !== undefined ? Boolean(body.captionsEnabled) : true;
    const autoEmojis = body.autoEmojis !== undefined ? Boolean(body.autoEmojis) : true;
    const headlineBanner = body.headlineBanner || clip.headlineBanner || "";
    const debugOverlay = Boolean(body.debugOverlay);
    const targetPersonId = body.targetPersonId !== undefined ? Number(body.targetPersonId) : undefined;
    const words = body.words || clip.words || [];

    const exportDir = path.join(process.cwd(), "data", "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const outFileName = `${clip.id}_export_${aspectRatio.replace(":", "-")}_${resolution}_${Date.now()}.mp4`;
    const outFilePath = path.join(exportDir, outFileName);

    // Locate source video file
    let sourceVideo = project.sourcePath;
    if (!sourceVideo || !fs.existsSync(sourceVideo)) {
      // Check project runs download directory
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

    const scriptPath = path.join(process.cwd(), "pipeline", "cli.py");
    const pyArgs = [
      scriptPath,
      "render-single",
      "--source", sourceVideo,
      "--start", String(startTime),
      "--end", String(endTime),
      "--aspect-ratio", aspectRatio,
      "--resolution", resolution,
      "--render-mode", renderMode,
      "--caption-style", captionStyle,
      "--caption-position", captionPosition,
      "--output", outFilePath,
    ];

    if (!captionsEnabled) {
      pyArgs.push("--no-captions");
    }

    if (!autoEmojis) {
      pyArgs.push("--no-auto-emojis");
    }

    if (headlineBanner && headlineBanner.trim()) {
      pyArgs.push("--headline-banner", headlineBanner.trim());
    }

    if (debugOverlay) {
      pyArgs.push("--debug-overlay");
    }

    if (targetPersonId !== undefined && !isNaN(targetPersonId)) {
      pyArgs.push("--target-person-id", String(targetPersonId));
    }

    if (wordsJsonPath && fs.existsSync(wordsJsonPath)) {
      pyArgs.push("--words-json", wordsJsonPath);
    }

    const child = spawn("python", pyArgs, { cwd: process.cwd() });
    let stderr = "";

    await new Promise((resolve, reject) => {
      child.stderr.on("data", (d) => { stderr += d.toString(); });
      child.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`Render failed (code ${code}): ${stderr.slice(-300)}`));
      });
      child.on("error", reject);
    });

    // Cleanup temp words json
    if (wordsJsonPath && fs.existsSync(wordsJsonPath)) {
      try { fs.unlinkSync(wordsJsonPath); } catch {}
    }

    const downloadUrl = `/api/media?file=${encodeURIComponent(outFilePath)}`;
    const updated = db.updateClip(id, {
      startTime,
      endTime,
      duration: Math.round((endTime - startTime) * 10) / 10,
      aspectRatio,
      renderMode,
      headlineBanner: headlineBanner || undefined,
      captionStyle: {
        preset: captionStyle,
        position: captionPosition,
      },
      renderedVideoPath: outFilePath,
      videoUrl: downloadUrl,
    });

    return NextResponse.json({
      success: true,
      downloadUrl,
      filePath: outFilePath,
      clip: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
