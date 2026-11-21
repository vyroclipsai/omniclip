import { NextResponse } from "next/server";
import { jobQueue } from "@/lib/job-queue";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = jobQueue.getJob(id);

    if (!job) {
      return NextResponse.json(
        {
          error: "Job not found",
          details: `No active or persisted job found with ID '${id}'`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Internal server error retrieving job",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
