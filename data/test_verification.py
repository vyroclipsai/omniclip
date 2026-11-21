import json
import os
import subprocess
from pathlib import Path

PROJECT_JSON = Path("data/runs/best_moments_test/project.json")
with open(PROJECT_JSON, "r", encoding="utf-8") as f:
    project = json.load(f)

clips = project["clips"]
print(f"Total clips selected: {len(clips)}")
assert 5 <= len(clips) <= 10, f"Expected 5-10 clips, got {len(clips)}"

# Check pairwise overlap
max_overlap = 0.0
overlap_pairs = []
for i in range(len(clips)):
    for j in range(i + 1, len(clips)):
        c1, c2 = clips[i], clips[j]
        inter_start = max(c1["start_time"], c2["start_time"])
        inter_end = min(c1["end_time"], c2["end_time"])
        inter = max(0.0, inter_end - inter_start)
        d1 = c1["end_time"] - c1["start_time"]
        d2 = c2["end_time"] - c2["start_time"]
        ratio = max(inter / d1, inter / d2) if min(d1, d2) > 0 else 0.0
        if ratio > max_overlap:
            max_overlap = ratio
        if ratio > 0.15:
            overlap_pairs.append((c1["title"], c2["title"], ratio))

print(f"Maximum pairwise overlap: {max_overlap * 100:.2f}%")
print(f"Clips overlapping > 15%: {len(overlap_pairs)}")
assert len(overlap_pairs) == 0, f"Found overlapping clips: {overlap_pairs}"

# Check rendered mp4 files
clips_dir = Path("data/runs/best_moments_test/clips")
rendered_mp4s = list(clips_dir.glob("*_rendered.mp4"))
print(f"Rendered MP4 count in directory: {len(rendered_mp4s)}")
assert len(rendered_mp4s) == len(clips), f"Expected {len(clips)} rendered MP4s, found {len(rendered_mp4s)}"

# Verify ffprobe on each rendered clip
print("\nVerifying rendered files with ffprobe:")
for c in clips:
    mp4_path = c.get("rendered_video_path")
    assert mp4_path and os.path.exists(mp4_path), f"File missing: {mp4_path}"
    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", mp4_path]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    probe = json.loads(res.stdout)
    vstream = next(s for s in probe["streams"] if s["codec_type"] == "video")
    w, h = vstream["width"], vstream["height"]
    dur = float(probe["format"]["duration"])
    size_mb = os.path.getsize(mp4_path) / (1024 * 1024)
    print(f"  [{c['id']}] {Path(mp4_path).name}: {w}x{h} ({w}:{h}), duration={dur:.1f}s, size={size_mb:.1f} MB, title={c['title']}")

print("\nAll programmatic verifications PASSED!")
