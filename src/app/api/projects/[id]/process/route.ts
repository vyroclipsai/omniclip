import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobQueue } from "@/lib/job-queue";
import path from "path";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = db.getProject(id);
    if (!project) {
      return NextResponse.json(
        {
          error: "Project not found",
          details: `No project exists with ID '${id}'`,
        },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const source = project.sourceUrl || project.sourcePath || path.join(process.cwd(), "public", "sample-video.mp4");
    const job = jobQueue.createJob(id, source, body?.maxClips || 8, {
      maxClips: body?.maxClips || 8,
      minScore: body?.minScore !== undefined ? Number(body.minScore) : 65.0,
      clipStyle: body?.clipStyle || "default",
      prompt: body?.prompt || "",
      minDuration: body?.minDuration !== undefined ? Number(body.minDuration) : 20.0,
      maxDuration: body?.maxDuration !== undefined ? Number(body.maxDuration) : 60.0,
      aspectRatio: body?.aspectRatio,
      resolution: body?.resolution,
      renderMode: body?.renderMode,
      captionStyle: body?.captionStyle,
      captionPosition: body?.captionPosition,
      captionsEnabled: body?.captionsEnabled,
      language: body?.language,
    });

    return NextResponse.json({
      success: true,
      message: "Job dispatched to background queue",
      jobId: job.id,
      job,
      project: db.getProject(id),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to dispatch project job",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
