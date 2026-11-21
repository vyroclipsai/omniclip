import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSocialMediaPosts } from "@/lib/social-post-generator";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = db.getClip(id);
    if (!item) {
      return NextResponse.json({ success: false, error: "Clip not found" }, { status: 404 });
    }

    const { clip } = item;
    const posts = generateSocialMediaPosts(
      clip.title,
      clip.transcriptText || (clip.words ? clip.words.map((w) => w.word).join(" ") : ""),
      clip.suggestedHook,
      clip.viralityScore
    );

    return NextResponse.json({
      success: true,
      clipId: id,
      posts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
