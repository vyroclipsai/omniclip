import { NextResponse } from "next/server";
import { jobQueue } from "@/lib/job-queue";
import { db, Project } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: "A JSON body with 'projectId' and 'source' or 'url' is required.",
        },
        { status: 400 }
      );
    }

    let { projectId, url, source, maxClips, aspectRatio, renderMode, captionStyle, captionPosition } = body;
    const finalSource = source || url;

    if (!finalSource) {
      return NextResponse.json(
        {
          error: "Missing source video",
          details: "Please provide a valid YouTube URL or video source path.",
        },
        { status: 400 }
      );
    }

    // Auto-create project if not provided
    if (!projectId) {
      projectId = "proj_" + Math.random().toString(36).substring(2, 10);
      const newProj: Project = {
        id: projectId,
        name: `Video: ${finalSource.substring(0, 36)}...`,
        sourceType: finalSource.startsWith("http") ? "url" : "upload",
        sourceUrl: finalSource,
        status: "processing",
        progress: 0,
        currentStep: "Job enqueued",
        createdAt: new Date().toISOString(),
        clips: [],
      };
      db.saveProject(newProj);
    }

    const job = jobQueue.createJob(projectId, finalSource, maxClips || 5, {
      maxClips: maxClips || 5,
      aspectRatio,
      renderMode,
      captionStyle,
      captionPosition,
    });

    return NextResponse.json({
      success: true,
      message: "Job enqueued successfully",
      job,
      projectId,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to enqueue background job",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
