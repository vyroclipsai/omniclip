# OmniClip AI — Local AI Video Clipping & Editing Studio

> **"Transform Long Videos & Podcasts into 10 Viral 9:16 Shorts in 1 Click"**  
> A clean-room engineered local AI video clipping platform featuring an edge-inspired marketing landing page, an interactive Clip Studio editor, and a 100% locally runnable AI media processing pipeline.

---

## ⚡ Quick Test with Sample YouTube URL

You can test the entire pipeline end-to-end immediately using this sample podcast URL:
`https://youtu.be/5jlDBdjz_3w`

### Option 1: Via the Web Dashboard
1. Start the server (see [Running the Application](#-running-the-application)).
2. Open your browser at `http://localhost:3000/app` (or your public Cloudflare tunnel URL).
3. Click the pre-filled **"Paste Test Podcast URL"** button (or paste `https://youtu.be/5jlDBdjz_3w`).
4. (Optional) Click **"Show Advanced Options"** to customize:
   - Aspect Ratio: **9:16 Vertical**, **1:1 Square**, or **16:9 Landscape**
   - Framing: **Smart Face Crop** or **Blur Background Fill**
   - Caption Styles: **Viral Yellow**, **Neon Green**, **Cyber Cyan**, **Fire Orange**, **Clean Minimal**
   - Position: **Bottom**, **Middle**, **Top**
   - Max Clips: **3, 5, or 8**
5. Click **"Get Clips Now"**.
6. Watch the live progress bar advance through `Ingest` ➔ `Whisper Speech-to-Text` ➔ `Virality Scoring` ➔ `Aspect Reframe` ➔ `Karaoke Subtitle Render`.
7. Preview the clips in the dashboard, or click **"Open in Studio & Editor"** / **"Edit in Studio"** to open `/project/[id]`.
8. In the **Clip Studio Editor**:
   - Trim start/end times with instant second precision
   - Switch subtitle style presets and positions live
   - Switch between Smart Crop and Blur Background Fill
   - Click any word in the **Synced Transcript Panel** to seek the video player to that exact word
   - Edit transcript words inline
   - Click **"Re-render & Save Clip"** to produce updated 1080p MP4s on-demand!

### Option 2: Via the Command-Line Interface (CLI)
Run the pipeline directly from your terminal:
```bash
python pipeline/cli.py process --input "https://youtu.be/5jlDBdjz_3w" --output-dir "data/runs/test_podcast" --max-clips 4 --aspect-ratio 9:16 --caption-style viral_yellow
```
Rendered clips and subtitles will be saved directly to `data/runs/test_podcast/clips/`.

To re-render an individual clip with custom framing or aspect ratio:
```bash
python pipeline/cli.py render-single --source "path/to/source.mp4" --start 12.0 --end 48.0 --aspect-ratio 1:1 --render-mode blur_bg --caption-style neon_green --output "output_square.mp4"
```

---

## 🛠️ System Prerequisites

Ensure the following tools are installed and available in your system `PATH`:

1. **Node.js**: v18.0.0 or higher (`node -v`)
2. **Python**: v3.10, 3.11, or 3.12 (`python --version`)
3. **FFmpeg & FFprobe**: Required for media demuxing, video cropping, and subtitle burn-in:
   - **Windows**: `winget install Gyan.FFmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt update && sudo apt install -y ffmpeg`
4. **Python Dependencies**:
   ```bash
   pip install yt-dlp openai-whisper opencv-python numpy
   ```

---

## ⚙️ Environment Configuration

1. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
2. Configure settings in `.env`:
   ```env
   # Server Port & API URL (supports HTTPS tunnel domains)
   PORT=3000
   NEXT_PUBLIC_API_URL=http://localhost:3000

   # Optional LLM API Keys (for Phase 2 virality scoring)
   # If left empty, OmniClip automatically uses high-performance local heuristic scoring ($0 cost)
   OPENAI_API_KEY=
   GEMINI_API_KEY=

   # Optional YouTube Cookies Path (if you encounter bot checks or age-restricted videos)
   YTDLP_COOKIES_PATH=
   ```

3. Verify system health and diagnostics anytime at:
   - UI: `http://localhost:3000/settings`
   - API: `GET http://localhost:3000/api/health`

---

## 🚀 Running the Application

### Option A: Local Development
```bash
# 1. Install Node dependencies
npm install

# 2. Start the dev server
npm run dev
```
The app will be available at:
- **Landing Page**: `http://localhost:3000/`
- **Dashboard**: `http://localhost:3000/app`
- **Clip Studio & Results**: `http://localhost:3000/project/[id]`
- **Settings & Health**: `http://localhost:3000/settings`
- **Pricing**: `http://localhost:3000/pricing`

### Option B: Docker & Docker Compose
```bash
docker-compose up --build
```
Runs the containerized Next.js frontend, Python AI engine, FFmpeg pipeline, and Redis cache.

### Option C: Share with Friends via Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:3000
```
Copy the generated `https://*.trycloudflare.com` URL and share it with anyone worldwide.

---

## 📂 Architecture & Project Structure

```
omniclip/
├── data/
│   ├── projects.json                      # Atomic JSON database storing projects and clips
│   ├── jobs.json                          # Background job queue registry
│   └── runs/                              # Ingested videos, Whisper transcripts, and renders
├── pipeline/                              # Local Python AI & Media Engine
│   ├── ingest.py                          # yt-dlp link downloader with bot-check error handler
│   ├── transcribe.py                      # OpenAI Whisper ASR with word-level timestamps
│   ├── llm_virality.py                    # OpenAI & Gemini highlight detection with local fallback
│   ├── virality_scorer.py                 # 4-pillar local heuristic virality scorer
│   ├── smart_reframe.py                   # Multi-aspect ratio reframing & face tracking (9:16, 1:1, 16:9)
│   ├── caption_generator.py               # 5-preset karaoke .ass generator with configurable positions
│   ├── render_clip.py                     # Multi-aspect ratio FFmpeg encoder (crop & blur_bg modes)
│   ├── logger.py                          # Structured JSON logger tracing pipeline stages
│   └── cli.py                             # Unified CLI runner (process / render-single)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/                    # Diagnostic endpoint verifying FFmpeg, Python & env
│   │   │   ├── jobs/                      # Background job queue and polling (/api/jobs/:id)
│   │   │   ├── projects/                  # Project management, listing & deletion
│   │   │   ├── clips/                     # Clip editing, atomic saving & 1080p MP4 re-export
│   │   │   └── media/                     # Streaming endpoint for rendered clips
│   │   ├── app/                           # Studio App Dashboard (/app)
│   │   ├── project/[id]/                  # Interactive Results & Studio Editor (/project/:id)
│   │   ├── settings/                      # System Diagnostics & Preferences (/settings)
│   │   ├── pricing/                       # Transparent 3-Tier Pricing Matrix (/pricing)
│   │   └── page.tsx                       # Marketing Homepage (/)
│   ├── components/marketing/              # 12 Modular OpusClip-matched UI components
│   └── lib/
│       ├── api-client.ts                  # Unified API fetch client respecting NEXT_PUBLIC_API_URL
│       ├── system-check.ts                # Startup validator for FFmpeg, Python & environment
│       ├── job-queue.ts                   # Detached background job runner with retry semantics
│       ├── storage.ts                     # Storage provider abstraction (local / S3 / R2)
│       ├── rate-limit.ts                  # Token-bucket rate limiter for API endpoints
│       └── db.ts                          # Atomic database manager with project/clip CRUD
├── prisma/
│   └── schema.prisma                      # Prisma schema ready for SQLite / PostgreSQL
├── Dockerfile                             # Production multi-stage Docker container
└── docker-compose.yml                     # Docker Compose stack with App and Redis
```

---

## 🧪 Automated Testing

### 1. Save & Persistence Test Suite
```bash
npm test
```
Verifies atomic disk persistence, model merging, and API validation.

### 2. Phase 2 Pipeline Feature Test Suite
```bash
python test_phase2_features.py
```
Verifies karaoke subtitle presets, aspect ratio coordinate generation, and LLM schema validation.

### 3. TypeScript Type Safety
```bash
npx tsc --noEmit
```
Exits with code 0 (zero TypeScript errors in strict mode).
