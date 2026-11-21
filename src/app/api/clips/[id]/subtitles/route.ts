import { NextResponse } from "next/server";
import { db, ClipItem } from "@/lib/db";

function formatTimestampSrt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function formatTimestampVtt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function generateSrt(clip: ClipItem): string {
  const words = clip.words || [];
  const baseOffset = clip.startTime || 0;
  const lines: string[] = [];

  if (words.length > 0) {
    // Group words into 4-6 word blocks
    const CHUNK_SIZE = 5;
    let blockIndex = 1;

    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      const chunk = words.slice(i, i + CHUNK_SIZE);
      const start = Math.max(0, chunk[0].start - baseOffset);
      const end = Math.max(start + 0.5, chunk[chunk.length - 1].end - baseOffset);
      const text = chunk.map((w) => w.word).join(" ");

      lines.push(String(blockIndex));
      lines.push(`${formatTimestampSrt(start)} --> ${formatTimestampSrt(end)}`);
      lines.push(text);
      lines.push("");
      blockIndex++;
    }
  } else {
    // Single block fallback
    lines.push("1");
    lines.push(`${formatTimestampSrt(0)} --> ${formatTimestampSrt(clip.duration)}`);
    lines.push(clip.transcriptText || clip.title);
    lines.push("");
  }

  return lines.join("\n");
}

function generateVtt(clip: ClipItem): string {
  const words = clip.words || [];
  const baseOffset = clip.startTime || 0;
  const lines: string[] = ["WEBVTT", "", `NOTE Transcript for clip: ${clip.title}`, ""];

  if (words.length > 0) {
    const CHUNK_SIZE = 5;
    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      const chunk = words.slice(i, i + CHUNK_SIZE);
      const start = Math.max(0, chunk[0].start - baseOffset);
      const end = Math.max(start + 0.5, chunk[chunk.length - 1].end - baseOffset);
      const text = chunk.map((w) => w.word).join(" ");

      lines.push(`${formatTimestampVtt(start)} --> ${formatTimestampVtt(end)}`);
      lines.push(text);
      lines.push("");
    }
  } else {
    lines.push(`${formatTimestampVtt(0)} --> ${formatTimestampVtt(clip.duration)}`);
    lines.push(clip.transcriptText || clip.title);
    lines.push("");
  }

  return lines.join("\n");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clipId } = await params;
    const result = db.getClip(clipId);
    if (!result) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }
    const clip = result.clip;

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "srt").toLowerCase();

    const safeTitle = clip.title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);

    if (format === "vtt") {
      const vttContent = generateVtt(clip);
      return new NextResponse(vttContent, {
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeTitle}.vtt"`,
        },
      });
    }

    // Default to SRT
    const srtContent = generateSrt(clip);
    return new NextResponse(srtContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.srt"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
