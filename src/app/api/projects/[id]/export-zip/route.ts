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
    const { id: projectId } = await params;
    const project = db.getProject(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const selectedClipIds: string[] = body.clipIds || [];

    const targetClips = selectedClipIds.length > 0
      ? project.clips.filter((c) => selectedClipIds.includes(c.id))
      : project.clips;

    if (targetClips.length === 0) {
      return NextResponse.json({ success: false, error: "No clips selected for export" }, { status: 400 });
    }

    const exportDir = path.join(process.cwd(), "data", "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Collect valid video file paths
    const filesToZip: { path: string; name: string }[] = [];
    for (const c of targetClips) {
      if (c.renderedVideoPath && fs.existsSync(c.renderedVideoPath)) {
        const safeTitle = c.title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
        filesToZip.push({
          path: c.renderedVideoPath,
          name: `${safeTitle}_${c.id}.mp4`,
        });
      }
    }

    if (filesToZip.length === 0) {
      return NextResponse.json({
        success: false,
        error: "None of the selected clips have rendered MP4 files yet. Please render them first.",
      }, { status: 400 });
    }

    const safeProjName = project.name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
    const zipName = `${safeProjName}_clips_${Date.now()}.zip`;
    const zipOutPath = path.join(exportDir, zipName);

    // Call python helper to zip files quickly
    const zipScript = `
import sys, json, zipfile
payload = json.loads(sys.argv[1])
out_zip = sys.argv[2]
with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for item in payload:
        zf.write(item['path'], arcname=item['name'])
`;

    const py = spawn("python", ["-c", zipScript, JSON.stringify(filesToZip), zipOutPath], { cwd: process.cwd() });
    await new Promise((resolve, reject) => {
      let stderr = "";
      py.stderr.on("data", (d) => { stderr += d.toString(); });
      py.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`Failed to bundle zip (code ${code}): ${stderr}`));
      });
      py.on("error", reject);
    });

    const downloadUrl = `/api/media?file=${encodeURIComponent(zipOutPath)}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      zipPath: zipOutPath,
      filename: zipName,
      clipCount: filesToZip.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
