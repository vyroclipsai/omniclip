import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ClipItem } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "A valid clip ID is required" },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }

    // Verify clip exists
    const existing = db.getClip(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Clip '${id}' not found` },
        { status: 404 }
      );
    }

    // Validate trim range / timings
    const effectiveStart =
      body.startTime !== undefined
        ? Number(body.startTime)
        : body.startSec !== undefined
        ? Number(body.startSec)
        : existing.clip.startTime;

    const effectiveEnd =
      body.endTime !== undefined
        ? Number(body.endTime)
        : body.endSec !== undefined
        ? Number(body.endSec)
        : existing.clip.endTime;

    if (isNaN(effectiveStart) || effectiveStart < 0) {
      return NextResponse.json(
        { success: false, error: "startTime/startSec must be a non-negative number" },
        { status: 400 }
      );
    }

    if (isNaN(effectiveEnd) || effectiveEnd <= effectiveStart) {
      return NextResponse.json(
        { success: false, error: "endTime/endSec must be greater than startTime/startSec" },
        { status: 400 }
      );
    }

    // Validate words if provided
    if (body.words !== undefined) {
      if (!Array.isArray(body.words)) {
        return NextResponse.json(
          { success: false, error: "words must be an array of word tokens" },
          { status: 400 }
        );
      }
      for (let i = 0; i < body.words.length; i++) {
        const w = body.words[i];
        if (typeof w?.word !== "string" || typeof w?.start !== "number" || typeof w?.end !== "number") {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid word token at index ${i}: must contain word (string), start (number), and end (number)`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Validate cropInfo if provided
    if (body.cropInfo !== undefined) {
      if (typeof body.cropInfo !== "object" || body.cropInfo === null) {
        return NextResponse.json(
          { success: false, error: "cropInfo must be an object" },
          { status: 400 }
        );
      }
    }

    // Validate captionStyle if provided
    if (body.captionStyle !== undefined) {
      if (typeof body.captionStyle !== "object" || body.captionStyle === null) {
        return NextResponse.json(
          { success: false, error: "captionStyle must be an object" },
          { status: 400 }
        );
      }
    }

    // Perform atomic update in DB
    const updated = db.updateClip(id, {
      ...body,
      startTime: effectiveStart,
      endTime: effectiveEnd,
      startSec: effectiveStart,
      endSec: effectiveEnd,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update clip in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Clip saved successfully",
      clip: updated,
      savedAt: updated.updatedAt || new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  return POST(req, props);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = db.getClip(id);
    if (!item) {
      return NextResponse.json(
        { success: false, error: `Clip '${id}' not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      clip: item.clip,
      project: item.project,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
