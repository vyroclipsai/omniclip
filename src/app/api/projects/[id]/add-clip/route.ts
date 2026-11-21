import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = db.getProject(id);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const candidate = body.candidate;
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate data required" }, { status: 400 });
    }

    const newId = `clip_${Date.now().toString(36)}`;
    const newClip = {
      id: newId,
      projectId: id,
      title: candidate.title || "ADDED MOMENT",
      viralityScore: candidate.viralityScore || 70,
      hookRating: candidate.hookRating || "Manual Addition",
      explanation: candidate.reason || candidate.explanation || "Manually promoted from considered moments",
      reason: candidate.reason || "Manually promoted moment",
      rubric: candidate.rubric || {},
      startTime: candidate.startTime || candidate.start_time || 0,
      endTime: candidate.endTime || candidate.end_time || 30,
      duration: candidate.duration || 30,
      transcriptText: candidate.transcriptText || candidate.transcript_text || candidate.text || "",
      words: candidate.words || [],
      aspectRatio: project.clips?.[0]?.aspectRatio || "9:16",
      renderMode: project.clips?.[0]?.renderMode || "crop",
      captionStyle: project.clips?.[0]?.captionStyle || { preset: "viral_yellow", position: "bottom" },
      captionsEnabled: project.clips?.[0]?.captionsEnabled !== undefined ? project.clips[0].captionsEnabled : true,
    };

    const existingClips = project.clips || [];
    const updatedClips = [...existingClips, newClip];
    const updatedAlso = (project.alsoConsidered || []).filter((ac: any) => ac.id !== candidate.id);

    const updated = db.updateProject(id, {
      clips: updatedClips,
      alsoConsidered: updatedAlso,
    });

    return NextResponse.json({
      success: true,
      message: "Clip successfully added to active project clips",
      clip: newClip,
      project: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
