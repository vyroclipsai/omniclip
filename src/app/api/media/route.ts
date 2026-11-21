import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("file");

    if (!filePath || !fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();

    let contentType = "video/mp4";
    if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".webm") contentType = "video/webm";
    else if (ext === ".mov") contentType = "video/quicktime";
    else if (ext === ".json") contentType = "application/json";
    else if (ext === ".ass" || ext === ".srt") contentType = "text/plain";

    const range = req.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      const headers = new Headers({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunksize),
        "Content-Type": contentType,
      });

      // @ts-ignore
      return new NextResponse(fileStream, { status: 206, headers });
    } else {
      const headers = new Headers({
        "Content-Length": String(fileSize),
        "Content-Type": contentType,
      });
      const fileStream = fs.createReadStream(filePath);
      // @ts-ignore
      return new NextResponse(fileStream, { headers });
    }
  } catch (err: any) {
    return new NextResponse(`Media stream error: ${err.message}`, { status: 500 });
  }
}
