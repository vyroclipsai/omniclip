import { NextResponse } from "next/server";
import { db, Project } from "@/lib/db";
import { jobQueue, JobOptions } from "@/lib/job-queue";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const maxClips = Number(formData.get("maxClips") || 8);
    const clipStyle = (formData.get("clipStyle") as string) || "default";
    const minScore = Number(formData.get("minScore") || 65.0);
    const aspectRatio = (formData.get("aspectRatio") as any) || "9:16";
    const resolution = (formData.get("resolution") as any) || "1080p";
    const renderMode = (formData.get("renderMode") as any) || "crop";
    const captionStyle = (formData.get("captionStyle") as any) || "viral_yellow";
    const language = (formData.get("language") as string) || "auto";
    const prompt = (formData.get("prompt") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided in upload" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const originalName = file.name || "uploaded_video.mp4";
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}_${safeName}`;
    const targetPath = path.join(uploadDir, filename);

    // Stream/write file buffer to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(targetPath, buffer);

    // Create project
    const projectId = "proj_" + Math.random().toString(36).substring(2, 10);
    const projectName = originalName.replace(/\.[^/.]+$/, "");

    const newProject: Project = {
      id: projectId,
      name: projectName,
      sourceType: "upload",
      sourcePath: targetPath,
      status: "queued",
      progress: 0,
      currentStep: "File uploaded successfully, queued for AI processing",
      createdAt: new Date().toISOString(),
      clips: [],
      settings: {
        maxClips,
        clipStyle,
        minScore,
        aspectRatio,
        resolution,
        renderMode,
        captionStyle,
        prompt,
      },
    };

    db.saveProject(newProject);

    // Dispatch background job
    const options: JobOptions = {
      maxClips,
      minScore,
      clipStyle,
      prompt,
      aspectRatio,
      resolution,
      renderMode,
      captionStyle,
      captionsEnabled: true,
      language,
    };

    const job = jobQueue.createJob(projectId, targetPath, maxClips, options);

    return NextResponse.json({
      success: true,
      message: "File uploaded and processing started",
      projectId,
      jobId: job.id,
      project: newProject,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Upload failed",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
