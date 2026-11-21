import json
import os
import subprocess
import zipfile
from pathlib import Path

# Load project.json
proj_path = Path("data/runs/best_moments_test/project.json")
with open(proj_path, "r", encoding="utf-8") as f:
    proj = json.load(f)

clip = proj["clips"][0]
print(f"Testing Clip: {clip['id']} - \"{clip['title']}\"")
print(f"Timing: {clip['start_time']}s to {clip['end_time']}s (dur: {clip['duration']}s)")

source_video = "data/cache/downloads/5jlDBdjz_3w.mp4"
assert os.path.exists(source_video), f"Source video not found: {source_video}"

out_dir = Path("data/runs/aspect_ratio_test")
out_dir.mkdir(parents=True, exist_ok=True)

# Write words json for subtitle rendering
words_json = out_dir / "words.json"
with open(words_json, "w", encoding="utf-8") as f:
    json.dump(clip["words"], f, indent=2)

zip_output = out_dir / "clip_1_all_formats_1080p.zip"

cmd = [
    "python", "pipeline/cli.py", "render-all-ratios",
    "--source", source_video,
    "--start", str(clip["start_time"]),
    "--end", str(clip["end_time"]),
    "--resolution", "1080p",
    "--render-mode", "crop",
    "--caption-style", "viral_yellow",
    "--caption-position", "bottom",
    "--output-dir", str(out_dir),
    "--base-name", "clip_1",
    "--words-json", str(words_json),
    "--zip-output", str(zip_output)
]

print("Executing render-all-ratios...")
res = subprocess.run(cmd, capture_output=True, text=True)
print("Return code:", res.returncode)
if res.returncode != 0:
    print("Stderr:", res.stderr[-500:])
    raise RuntimeError("Failed to render ratios")

print("Stdout:", res.stdout)

# Verify ZIP file exists and list its contents
assert zip_output.exists(), f"ZIP archive missing: {zip_output}"
print(f"\nZIP file verified: {zip_output} ({zip_output.stat().st_size / (1024*1024):.2f} MB)")
with zipfile.ZipFile(zip_output, "r") as zf:
    print("Files inside ZIP:")
    for n in zf.namelist():
        print("  -", n)

# Probe each rendered format with ffprobe
ratios = ["9:16", "4:5", "1:1", "16:9"]
expected_dims = {
    "9:16": (1080, 1920),
    "4:5":  (1080, 1350),
    "1:1":  (1080, 1080),
    "16:9": (1920, 1080),
}

print("\n" + "=" * 95)
print("FFPROBE VALIDATION TABLE ACROSS ALL 4 ASPECT RATIOS")
print("=" * 95)
print(f"{'RATIO':<8} | {'FILE NAME':<32} | {'RESOLUTION':<12} | {'FPS':<6} | {'DURATION':<9} | {'SIZE (MB)':<9}")
print("-" * 95)

for r in ratios:
    r_slug = r.replace(":", "-")
    fpath = out_dir / f"clip_1_{r_slug}_1080p.mp4"
    assert fpath.exists(), f"Rendered file missing: {fpath}"

    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", str(fpath)]
    ff = subprocess.run(cmd, capture_output=True, text=True, check=True)
    meta = json.loads(ff.stdout)

    vstream = next(s for s in meta["streams"] if s["codec_type"] == "video")
    w = vstream["width"]
    h = vstream["height"]
    fps_val = vstream.get("r_frame_rate", "30/1")
    try:
        num, den = fps_val.split("/")
        fps = float(num) / float(den)
    except Exception:
        fps = 30.0

    dur = float(meta["format"]["duration"])
    size_mb = fpath.stat().st_size / (1024 * 1024)

    exp_w, exp_h = expected_dims[r]
    assert (w, h) == (exp_w, exp_h), f"Expected {exp_w}x{exp_h}, got {w}x{h}"

    print(f"{r:<8} | {fpath.name:<32} | {f'{w}x{h}':<12} | {fps:<6.2f} | {f'{dur:.2f}s':<9} | {size_mb:<9.2f}")

print("=" * 95)
print("\nAll 4 aspect ratios successfully rendered, packaged into ZIP, and verified!")
