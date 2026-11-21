import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobQueue } from "@/lib/job-queue";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = db.getProject(id);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }
    const job = jobQueue.getJobByProject(id);
    return NextResponse.json({ success: true, project, job });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name } = body;

    const existing = db.getProject(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const updated = db.updateProject(id, {
      ...(name ? { name: name.trim() } : {}),
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = db.deleteProject(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
