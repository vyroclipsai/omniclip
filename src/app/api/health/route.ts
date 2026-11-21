import { NextResponse } from "next/server";
import { performSystemCheck } from "@/lib/system-check";

export async function GET() {
  const diagnostic = performSystemCheck();
  return NextResponse.json({
    status: diagnostic.healthy ? "ok" : "degraded",
    ...diagnostic,
  });
}
