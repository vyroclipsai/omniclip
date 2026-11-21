import fs from "fs";
import path from "path";
import assert from "assert";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "projects.json");
const BACKUP_FILE = path.join(DATA_DIR, "projects.json.backup");

// Backup original projects.json
if (fs.existsSync(DB_FILE)) {
  fs.copyFileSync(DB_FILE, BACKUP_FILE);
  console.log("✓ Backed up original projects.json");
}

try {
  // Test 1: Import db.ts
  console.log("\n--- TEST 1: DB & Atomic Persistence ---");
  const { db } = await import("./src/lib/db.ts");
  
  const clipBefore = db.getClip("clip_1");
  assert(clipBefore, "clip_1 should exist in db");
  console.log(`✓ Initial clip found: "${clipBefore.clip.title}"`);

  // Test 2: Update clip via db.updateClip
  const updatePayload = {
    title: "THE BIGGEST MISTAKE FOUNDERS MAKE (TEST SAVE)",
    startTime: 14.5,
    endTime: 42.0,
    startSec: 14.5,
    endSec: 42.0,
    words: [
      { word: "THE", start: 14.5, end: 14.8 },
      { word: "BIGGEST", start: 14.8, end: 15.3 },
      { word: "FOUNDER", start: 15.3, end: 15.8 },
      { word: "ERROR", start: 15.8, end: 16.4 },
    ],
    cropInfo: {
      crop_w: 608,
      crop_h: 1080,
      crop_x: 720,
      crop_y: 0,
    },
    captionStyle: {
      theme: "emerald",
      size: "xl",
      isUppercase: true,
      preset: "emerald",
    },
  };

  const updatedClip = db.updateClip("clip_1", updatePayload);
  assert(updatedClip, "db.updateClip should return updated clip");
  assert.strictEqual(updatedClip.title, updatePayload.title);
  assert.strictEqual(updatedClip.startTime, 14.5);
  assert.strictEqual(updatedClip.endTime, 42.0);
  assert.strictEqual(updatedClip.duration, 27.5);
  assert.strictEqual(updatedClip.transcriptText, "THE BIGGEST FOUNDER ERROR");
  assert.strictEqual(updatedClip.cropInfo.crop_x, 720);
  assert.deepStrictEqual(updatedClip.captionStyle, updatePayload.captionStyle);
  assert(updatedClip.updatedAt, "updatedAt should be set");
  console.log("✓ db.updateClip successfully merged and calculated all fields");

  // Test 3: Check disk persistence immediately from raw file
  const rawDiskData = fs.readFileSync(DB_FILE, "utf-8");
  const parsedProjects = JSON.parse(rawDiskData);
  const diskClip = parsedProjects.flatMap(p => p.clips).find(c => c.id === "clip_1");
  assert(diskClip, "Disk clip should exist in projects.json");
  assert.strictEqual(diskClip.title, updatePayload.title);
  assert.strictEqual(diskClip.cropInfo.crop_x, 720);
  assert.strictEqual(diskClip.captionStyle.theme, "emerald");
  assert.strictEqual(diskClip.startTime, 14.5);
  assert.strictEqual(diskClip.endTime, 42.0);
  assert.strictEqual(diskClip.duration, 27.5);
  console.log("✓ Atomic disk persistence verified: projects.json on disk contains exact saved updates");

  // Test 4: Verify API Route handler
  console.log("\n--- TEST 2: API Route Handler /api/clips/[id]/save ---");
  const routeModule = await import("./src/app/api/clips/[id]/save/route.ts");
  const { POST, GET, PUT } = routeModule;
  assert(typeof POST === "function", "POST handler should exist");
  assert(typeof GET === "function", "GET handler should exist");
  assert(typeof PUT === "function", "PUT handler should exist");

  // 4a: Test GET handler
  const getReq = new Request("http://localhost:3000/api/clips/clip_1/save");
  const getRes = await GET(getReq, { params: Promise.resolve({ id: "clip_1" }) });
  const getData = await getRes.json();
  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getData.success, true);
  assert.strictEqual(getData.clip.id, "clip_1");
  console.log("✓ GET /api/clips/clip_1/save returned 200 with saved clip");

  // 4b: Test POST with invalid clip ID -> 404
  const notFoundReq = new Request("http://localhost:3000/api/clips/non_existent/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "New Title" }),
  });
  const notFoundRes = await POST(notFoundReq, { params: Promise.resolve({ id: "non_existent" }) });
  const notFoundData = await notFoundRes.json();
  assert.strictEqual(notFoundRes.status, 404);
  assert.strictEqual(notFoundData.success, false);
  console.log("✓ POST with non-existent clip returned 404 Not Found");

  // 4c: Test POST with invalid timings (end <= start) -> 400
  const invalidTimeReq = new Request("http://localhost:3000/api/clips/clip_1/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startTime: 50.0, endTime: 10.0 }),
  });
  const invalidTimeRes = await POST(invalidTimeReq, { params: Promise.resolve({ id: "clip_1" }) });
  const invalidTimeData = await invalidTimeRes.json();
  assert.strictEqual(invalidTimeRes.status, 400);
  assert.strictEqual(invalidTimeData.success, false);
  console.log("✓ POST with invalid timings (startTime > endTime) returned 400 Bad Request");

  // 4d: Test POST with invalid word tokens -> 400
  const invalidWordReq = new Request("http://localhost:3000/api/clips/clip_1/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ words: [{ word: 123, start: "zero" }] }),
  });
  const invalidWordRes = await POST(invalidWordReq, { params: Promise.resolve({ id: "clip_1" }) });
  const invalidWordData = await invalidWordRes.json();
  assert.strictEqual(invalidWordRes.status, 400);
  assert.strictEqual(invalidWordData.success, false);
  console.log("✓ POST with invalid word format returned 400 Bad Request");

  // 4e: Test successful POST saving modified words, captionStyle, trim, crop
  const validApiPayload = {
    title: "FOUNDER SECRETS: SCALING FAST",
    startTime: 12.0,
    endTime: 38.0,
    cropInfo: { crop_w: 608, crop_h: 1080, crop_x: 680, crop_y: 0 },
    captionStyle: {
      theme: "cyan",
      size: "lg",
      isUppercase: true,
      preset: "cyan",
    },
    words: [
      { word: "FOUNDER", start: 12.0, end: 12.5 },
      { word: "SECRETS", start: 12.5, end: 13.0 },
      { word: "FOR", start: 13.0, end: 13.3 },
      { word: "SCALE.", start: 13.3, end: 14.0 },
    ],
  };

  const saveReq = new Request("http://localhost:3000/api/clips/clip_1/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validApiPayload),
  });
  const saveRes = await POST(saveReq, { params: Promise.resolve({ id: "clip_1" }) });
  const saveData = await saveRes.json();
  assert.strictEqual(saveRes.status, 200);
  assert.strictEqual(saveData.success, true);
  assert.strictEqual(saveData.clip.title, "FOUNDER SECRETS: SCALING FAST");
  assert.strictEqual(saveData.clip.captionStyle.theme, "cyan");
  assert.strictEqual(saveData.clip.cropInfo.crop_x, 680);
  assert.strictEqual(saveData.clip.duration, 26.0);
  assert(saveData.savedAt, "Response should include savedAt timestamp");
  console.log("✓ POST /api/clips/clip_1/save returned 200 with saved clip and timestamp");

  // Check disk after API route execution
  const rawDiskAfterApi = fs.readFileSync(DB_FILE, "utf-8");
  const parsedAfterApi = JSON.parse(rawDiskAfterApi);
  const diskClipAfterApi = parsedAfterApi.flatMap(p => p.clips).find(c => c.id === "clip_1");
  assert.strictEqual(diskClipAfterApi.title, "FOUNDER SECRETS: SCALING FAST");
  assert.strictEqual(diskClipAfterApi.captionStyle.theme, "cyan");
  assert.strictEqual(diskClipAfterApi.cropInfo.crop_x, 680);
  console.log("✓ projects.json persistence confirmed after API route call");

  console.log("\n==========================================");
  console.log("🎉 ALL SAVE & PERSISTENCE TESTS PASSED!");
  console.log("==========================================\n");

} finally {
  // Restore original projects.json backup
  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, DB_FILE);
    fs.unlinkSync(BACKUP_FILE);
    console.log("✓ Restored original projects.json from backup");
  }
}
