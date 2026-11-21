import { NextResponse } from "next/server";
import { jobQueue } from "@/lib/job-queue";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const retriedJob = jobQueue.retryJob(id);

    if (!retriedJob) {
      return NextResponse.json(
        {
          error: "Job not found",
          details: `Cannot retry non-existent job '${id}'`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Job restarted successfully",
      job: retriedJob,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to restart job",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
