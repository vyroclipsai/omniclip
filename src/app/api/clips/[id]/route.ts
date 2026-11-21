import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = db.getClip(id);
    if (!result) {
      return NextResponse.json({ success: false, error: "Clip not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, clip: result.clip, project: result.project });
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
    const ok = db.deleteClip(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Clip not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Clip deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
