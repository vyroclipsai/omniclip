import os
import sys
import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlunparse

class IngestionError(Exception):
    def __init__(self, message: str, details: str = "", error_type: str = "IngestionError"):
        super().__init__(message)
        self.message = message
        self.details = details
        self.error_type = error_type

class BotCheckError(IngestionError):
    def __init__(self, details: str = ""):
        super().__init__(
            message="YouTube bot verification / sign-in requested. Provide cookies file via YTDLP_COOKIES_PATH.",
            details=details,
            error_type="BotCheckError"
        )

class AgeRestrictedError(IngestionError):
    def __init__(self, details: str = ""):
        super().__init__(
            message="This video is age-restricted and requires account verification via cookies.",
            details=details,
            error_type="AgeRestrictedError"
        )

class PrivateVideoError(IngestionError):
    def __init__(self, details: str = ""):
        super().__init__(
            message="This video is private, unlisted, or has been removed by the creator.",
            details=details,
            error_type="PrivateVideoError"
        )

class VideoNotFoundError(IngestionError):
    def __init__(self, details: str = ""):
        super().__init__(
            message="Video could not be found or the URL is invalid.",
            details=details,
            error_type="VideoNotFoundError"
        )

def normalize_youtube_url(url: str) -> str:
    """
    Normalizes YouTube URLs:
    - Strips playlist parameters (&list=, &index=, &start_radio=)
    - Strips tracking query parameters (&si=, &pp=, &feature=)
    - Converts shorts and youtu.be to canonical watch URLs
    """
    clean_url = url.strip()
    
    # youtu.be/<id>
    m_short = re.match(r"https?://(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})", clean_url)
    if m_short:
        video_id = m_short.group(1)
        return f"https://www.youtube.com/watch?v={video_id}"

    # youtube.com/shorts/<id>
    m_shorts = re.match(r"https?://(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})", clean_url)
    if m_shorts:
        video_id = m_shorts.group(1)
        return f"https://www.youtube.com/watch?v={video_id}"

    # youtube.com/live/<id>
    m_live = re.match(r"https?://(?:www\.)?youtube\.com/live/([a-zA-Z0-9_-]{11})", clean_url)
    if m_live:
        video_id = m_live.group(1)
        return f"https://www.youtube.com/watch?v={video_id}"

    # Standard youtube.com/watch?v=<id>
    try:
        parsed = urlparse(clean_url)
        if "youtube.com" in parsed.netloc and parsed.path.startswith("/watch"):
            qs = parse_qs(parsed.query)
            if "v" in qs and qs["v"]:
                video_id = qs["v"][0]
                return f"https://www.youtube.com/watch?v={video_id}"
    except Exception:
        pass

    return clean_url

def get_video_info(video_path: str) -> dict:
    """Probes video metadata using ffprobe with graceful fallbacks."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        video_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(res.stdout)
        video_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
        duration = float(data.get("format", {}).get("duration", 0.0))
        if not duration and video_stream:
            duration = float(video_stream.get("duration", 0.0))

        width = int(video_stream.get("width", 1920)) if video_stream else 1920
        height = int(video_stream.get("height", 1080)) if video_stream else 1080
        fps_eval = video_stream.get("r_frame_rate", "30/1") if video_stream else "30/1"
        try:
            num, den = fps_eval.split("/")
            fps = float(num) / float(den)
        except Exception:
            fps = 30.0

        return {
            "path": os.path.abspath(video_path),
            "filename": Path(video_path).name,
            "duration": round(duration, 2),
            "width": width,
            "height": height,
            "aspect_ratio": round(width / height, 2) if height else 1.77,
            "fps": round(fps, 2),
        }
    except Exception as e:
        return {
            "path": os.path.abspath(video_path),
            "filename": Path(video_path).name,
            "duration": 0.0,
            "width": 1920,
            "height": 1080,
            "aspect_ratio": 1.77,
            "fps": 30.0,
            "error": str(e)
        }

def find_node_executable() -> str:
    """Dynamically locates node executable across platforms."""
    node = shutil.which("node")
    if node:
        return node
    for candidate in [
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
        os.path.expanduser("~/AppData/Local/Programs/node/node.exe"),
        "/usr/local/bin/node",
        "/usr/bin/node"
    ]:
        if os.path.exists(candidate):
            return candidate
    return ""

def download_video_link(url: str, output_dir: str) -> str:
    """
    Downloads a video from YouTube or other platform using yt-dlp.
    Features:
    - Canonical URL normalization
    - Optional cookies via YTDLP_COOKIES_PATH / YTDLP_COOKIES_FILE
    - Specific error categorization (BotCheck, AgeRestricted, Private, NotFound)
    - Re-uses cached complete downloads
    """
    normalized_url = normalize_youtube_url(url)
    os.makedirs(output_dir, exist_ok=True)
    
    # Check if a completed video file already exists in local output_dir
    existing_files = [f for f in Path(output_dir).glob("*.mp4") if not f.name.endswith(".part")]
    if existing_files:
        latest_existing = max(existing_files, key=os.path.getmtime)
        if os.path.getsize(latest_existing) > 1024 * 1024:
            return str(latest_existing)

    # Check shared cache in data/cache/downloads
    shared_cache_dir = Path(__file__).resolve().parent.parent / "data" / "cache" / "downloads"
    if shared_cache_dir.exists():
        # Match by YouTube video ID
        m_id = re.search(r"(?:v=|youtu\.be/|shorts/|live/)([a-zA-Z0-9_-]{11})", normalized_url)
        if m_id:
            vid = m_id.group(1)
            cached_match = list(shared_cache_dir.glob(f"*{vid}*.mp4"))
            if cached_match and os.path.getsize(cached_match[0]) > 1024 * 1024:
                cached_target = Path(output_dir) / cached_match[0].name
                if not cached_target.exists():
                    shutil.copy2(cached_match[0], cached_target)
                return str(cached_target)

    out_template = os.path.join(output_dir, "%(id)s.%(ext)s")

    # Dynamic Node runtime flag
    node_bin = find_node_executable()
    js_runtime_arg = ["--js-runtimes", f"node:{node_bin}"] if node_bin else []

    # Optional Cookies File from environment
    cookies_path = os.getenv("YTDLP_COOKIES_PATH") or os.getenv("YTDLP_COOKIES_FILE") or ""
    cookies_arg = ["--cookies", os.path.abspath(cookies_path)] if cookies_path and os.path.exists(cookies_path) else []

    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--newline",
        "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
        "--merge-output-format", "mp4",
        "-o", out_template,
        "--no-playlist",
        "--socket-timeout", "30",
        "--retries", "3",
        *cookies_arg,
        *js_runtime_arg,
        normalized_url
    ]

    dl_pattern = re.compile(r"\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+~?([\d\.]+\w+)(?:\s+at\s+([\d\.]+\w+/s))?(?:\s+ETA\s+(\S+))?")
    full_output = []
    last_reported_pct = -5

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        for line in proc.stdout:
            full_output.append(line)
            m = dl_pattern.search(line)
            if m:
                try:
                    pct_val = float(m.group(1))
                    size_s = m.group(2) or ""
                    spd_s = m.group(3) or ""
                    eta_s = m.group(4) or ""
                    if pct_val >= last_reported_pct + 5 or pct_val >= 99.0:
                        last_reported_pct = int(pct_val)
                        scaled_prog = 10 + int(pct_val * 0.15)
                        msg = f"Downloading source video {pct_val:.0f}%"
                        if size_s: msg += f" of {size_s}"
                        if spd_s: msg += f" ({spd_s}"
                        if eta_s: msg += f", ETA {eta_s})"
                        elif spd_s: msg += ")"
                        print(f"[STATUS] {scaled_prog}% - {msg}", flush=True)
                except Exception:
                    pass
        ret_code = proc.wait()
    except Exception as e:
        raise IngestionError(f"Failed to execute yt-dlp: {str(e)}", details=str(e))

    if ret_code != 0:
        err_out = "".join(full_output)
        err_lower = err_out.lower()

        if "sign in to confirm you're not a bot" in err_lower or "bot" in err_lower and "confirm" in err_lower:
            raise BotCheckError(details=err_out)
        elif "confirm your age" in err_lower or "age-restricted" in err_lower or "sign in if you've been granted access" in err_lower:
            raise AgeRestrictedError(details=err_out)
        elif "this video is private" in err_lower or "members-only" in err_lower:
            raise PrivateVideoError(details=err_out)
        elif "video unavailable" in err_lower or "does not exist" in err_lower:
            raise VideoNotFoundError(details=err_out)
        else:
            raise IngestionError(
                message=f"YouTube download failed: {err_out.splitlines()[-1] if err_out.splitlines() else 'Unknown yt-dlp error'}",
                details=err_out
            )

    # Search for output video file
    video_files = list(Path(output_dir).glob("*.mp4")) + list(Path(output_dir).glob("*.mkv")) + list(Path(output_dir).glob("*.webm"))
    completed = [f for f in video_files if not f.name.endswith(".part")]
    if not completed:
        raise IngestionError("yt-dlp exited cleanly but no output video file was created in the directory.")

    latest = max(completed, key=os.path.getmtime)
    if latest.suffix.lower() != ".mp4":
        mp4_path = str(latest.with_suffix(".mp4"))
        remux_cmd = ["ffmpeg", "-y", "-i", str(latest), "-c", "copy", mp4_path]
        subprocess.run(remux_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return mp4_path

    return str(latest)
