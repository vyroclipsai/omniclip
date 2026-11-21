import { NextResponse } from "next/server";
import { db, Project } from "@/lib/db";

export async function GET() {
  try {
    const projects = db.getProjects();
    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, name, isSample } = body;

    const projectId = "proj_" + Math.random().toString(36).substring(2, 10);
    const projectName = name || (url ? `Video: ${url.substring(0, 32)}...` : "New Video Project");

    const newProject: Project = {
      id: projectId,
      name: projectName,
      sourceType: isSample ? "sample" : url ? "url" : "upload",
      sourceUrl: url || undefined,
      status: "queued",
      progress: 0,
      currentStep: "Job initialized",
      createdAt: new Date().toISOString(),
      clips: [],
    };

    db.saveProject(newProject);
    return NextResponse.json({ success: true, project: newProject });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
