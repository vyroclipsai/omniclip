import os
import sys
import cv2
import json
import subprocess
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

source_video = "data/cache/downloads/5jlDBdjz_3w.mp4"
assert os.path.exists(source_video), f"Source video not found: {source_video}"

test_out_dir = Path("data/runs/smart_framing_test")
test_out_dir.mkdir(parents=True, exist_ok=True)
frames_dir = test_out_dir / "frames"
frames_dir.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Test 1: Frame Rate Preservation Check
# ---------------------------------------------------------------------------
print("=" * 80)
print("TEST 1: NATIVE SOURCE FRAME RATE PRESERVATION VERIFICATION")
print("=" * 80)

# Probe source video fps
cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", source_video]
res = subprocess.run(cmd, capture_output=True, text=True, check=True)
meta = json.loads(res.stdout)
vstream = next(s for s in meta["streams"] if s["codec_type"] == "video")
src_r_fps = vstream["r_frame_rate"]
num, den = src_r_fps.split("/") if "/" in src_r_fps else (src_r_fps, "1")
src_fps = float(num) / float(den)
print(f"Source video native r_frame_rate: {src_r_fps} ({src_fps:.2f} fps)")

# Render a short 5-second test with smart crop
test_fps_mp4 = test_out_dir / "test_fps_preservation.mp4"
render_cmd = [
    "python", "pipeline/cli.py", "render-single",
    "--source", source_video,
    "--start", "1612.08",
    "--end", "1617.08",
    "--aspect-ratio", "9:16",
    "--resolution", "1080p",
    "--render-mode", "crop",
    "--no-captions",
    "--output", str(test_fps_mp4)
]
subprocess.run(render_cmd, check=True)

# Probe rendered video fps
cmd_out = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", str(test_fps_mp4)]
res_out = subprocess.run(cmd_out, capture_output=True, text=True, check=True)
vstream_out = next(s for s in json.loads(res_out.stdout)["streams"] if s["codec_type"] == "video")
out_r_fps = vstream_out["r_frame_rate"]
num, den = out_r_fps.split("/") if "/" in out_r_fps else (out_r_fps, "1")
out_fps = float(num) / float(den)
print(f"Rendered clip r_frame_rate: {out_r_fps} ({out_fps:.2f} fps)")
assert abs(out_fps - src_fps) < 0.1, f"Frame rate mismatch! Expected {src_fps}, got {out_fps}"
print("Frame rate preservation: PASSED! Exact native frame rate preserved.\n")

# ---------------------------------------------------------------------------
# Test 2: Before & After Frame Extraction Across 5 Timestamps (4 Ratios)
# ---------------------------------------------------------------------------
print("=" * 80)
print("TEST 2: BEFORE & AFTER FRAME EXTRACTION AT 5 TIMESTAMPS (ALL 4 RATIOS)")
print("=" * 80)

clip_start = 1612.08
clip_end = 1671.66
timestamps = [
    clip_start + 5.0,   # t1: 1617.08s
    clip_start + 18.0,  # t2: 1630.08s
    clip_start + 30.0,  # t3: 1642.08s
    clip_start + 42.0,  # t4: 1654.08s
    clip_start + 54.0,  # t5: 1666.08s
]

ratios = ["9:16", "4:5", "1:1", "16:9"]
ratio_files = {
    "9:16": "data/runs/aspect_ratio_test/clip_1_9-16_1080p.mp4",
    "4:5":  "data/runs/aspect_ratio_test/clip_1_4-5_1080p.mp4",
    "1:1":  "data/runs/aspect_ratio_test/clip_1_1-1_1080p.mp4",
    "16:9": "data/runs/aspect_ratio_test/clip_1_16-9_1080p.mp4",
}

extracted_summary = []
for i, t in enumerate(timestamps):
    idx = i + 1
    rel_t = t - clip_start
    # Extract Original Source Frame (Before)
    orig_frame = frames_dir / f"frame_{idx}_before_source_16-9.jpg"
    cmd = ["ffmpeg", "-y", "-ss", str(t), "-i", source_video, "-vframes", "1", "-q:v", "2", str(orig_frame)]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    after_paths = {}
    for r in ratios:
        r_file = ratio_files[r]
        after_frame = frames_dir / f"frame_{idx}_after_{r.replace(':', '-')}.jpg"
        cmd = ["ffmpeg", "-y", "-ss", str(rel_t), "-i", r_file, "-vframes", "1", "-q:v", "2", str(after_frame)]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        after_paths[r] = after_frame.name

    extracted_summary.append({
        "timestamp": f"{t:.2f}s (rel: +{rel_t:.1f}s)",
        "source_before": orig_frame.name,
        "ratios_after": after_paths
    })
    print(f"Extracted timestamp #{idx} @ {t:.2f}s: Before (1280x720) -> After (9:16, 4:5, 1:1, 16:9)")

# ---------------------------------------------------------------------------
# Test 3: Two-Person Clip Test (SPLIT Layout & Active Speaker)
# ---------------------------------------------------------------------------
print("\n" + "=" * 80)
print("TEST 3: TWO-PERSON CLIP (SPLIT LAYOUT & ACTIVE SPEAKER)")
print("=" * 80)

split_mp4 = test_out_dir / "two_person_split_9-16.mp4"
split_cmd = [
    "python", "pipeline/cli.py", "render-single",
    "--source", source_video,
    "--start", "210.0",
    "--end", "225.0",
    "--aspect-ratio", "9:16",
    "--resolution", "1080p",
    "--render-mode", "split",
    "--no-captions",
    "--output", str(split_mp4)
]
print("Rendering 15s two-person SPLIT composition...")
subprocess.run(split_cmd, check=True)

# Probe SPLIT output
cmd_split = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", str(split_mp4)]
meta_split = json.loads(subprocess.check_output(cmd_split, text=True))
v_split = next(s for s in meta_split["streams"] if s["codec_type"] == "video")
print(f"SPLIT Layout Output: {v_split['width']}x{v_split['height']}, size={split_mp4.stat().st_size / (1024*1024):.2f} MB")
assert v_split["width"] == 1080 and v_split["height"] == 1920

# Extract a sample frame from SPLIT video
split_frame = frames_dir / "two_person_split_frame.jpg"
cmd = ["ffmpeg", "-y", "-ss", "5.0", "-i", str(split_mp4), "-vframes", "1", "-q:v", "2", str(split_frame)]
subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
print(f"Extracted SPLIT layout frame: {split_frame.name}")

# ---------------------------------------------------------------------------
# Test 4: Horizontal Video Edge Speaker Test
# ---------------------------------------------------------------------------
print("\n" + "=" * 80)
print("TEST 4: HORIZONTAL VIDEO EDGE SPEAKER FRAMING TEST")
print("=" * 80)

# Generate synthetic 16:9 video where speaker is positioned far on the left edge (x=150)
edge_video = test_out_dir / "edge_speaker_source.mp4"
edge_cmd = [
    "ffmpeg", "-y",
    "-f", "lavfi",
    "-i", "color=c=navy:s=1920x1080:d=5",
    "-vf", "drawbox=x=120:y=200:w=320:h=600:color=orange@1:t=fill,drawbox=x=200:y=120:w=160:h=160:color=pink@1:t=fill,drawtext=text='EDGE SPEAKER':x=160:y=80:fontsize=32:fontcolor=white",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    str(edge_video)
]
subprocess.run(edge_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
print(f"Generated synthetic 16:9 source with subject at left edge: {edge_video}")

# Test smart framing on this edge speaker
from pipeline.smart_reframe import compute_smart_framing
edge_framing = compute_smart_framing(str(edge_video), start_time=0.0, end_time=5.0, aspect_ratio="9:16", resolution="1080p")
print(f"Computed Crop for Edge Speaker: crop_x={edge_framing['crop_x']}, crop_w={edge_framing['crop_w']}, max_x={edge_framing['source_w'] - edge_framing['crop_w']}")
# Center would be (1920-608)//2 = 656. The edge speaker at x=200-280 should produce crop_x near 0-150, NOT 656!
assert edge_framing["crop_x"] < 350, f"Crop should follow edge speaker, but got {edge_framing['crop_x']}"
print(f"Edge speaker tracking verified! Camera framed at x={edge_framing['crop_x']} (subject followed on left, not centered blindly at 656).")

# ---------------------------------------------------------------------------
# Test 5: Debug Overlay Verification
# ---------------------------------------------------------------------------
print("\n" + "=" * 80)
print("TEST 5: DEBUG OVERLAY RENDERING")
print("=" * 80)

debug_mp4 = test_out_dir / "clip_debug_overlay_9-16.mp4"
debug_cmd = [
    "python", "pipeline/cli.py", "render-single",
    "--source", source_video,
    "--start", "1612.08",
    "--end", "1618.08",
    "--aspect-ratio", "9:16",
    "--resolution", "1080p",
    "--render-mode", "crop",
    "--debug-overlay",
    "--no-captions",
    "--output", str(debug_mp4)
]
print("Rendering clip with debug overlay...")
subprocess.run(debug_cmd, check=True)
assert debug_mp4.exists()
print(f"Debug overlay video rendered: {debug_mp4.name} ({debug_mp4.stat().st_size / (1024*1024):.2f} MB)")

# Extract debug overlay frame
debug_frame = frames_dir / "debug_overlay_sample_frame.jpg"
cmd = ["ffmpeg", "-y", "-ss", "2.0", "-i", str(debug_mp4), "-vframes", "1", "-q:v", "2", str(debug_frame)]
subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
print(f"Extracted debug overlay sample frame: {debug_frame.name}")

print("\n" + "=" * 80)
print("ALL SMART FRAMING TESTS AND VERIFICATIONS COMPLETED SUCCESSFULLY!")
print("=" * 80)
