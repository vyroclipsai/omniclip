import os
import sys
import json
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from pipeline.best_moments import select_best_moments

transcript = json.load(open("data/runs/step_a_test/transcript.json", "r", encoding="utf-8"))
video_path = "data/runs/step_a_test/downloads/5jlDBdjz_3w.mp4"

res = select_best_moments(
    transcript_data=transcript,
    video_path=video_path,
    min_duration=20.0,
    max_duration=60.0,
    target_clip_count=8,
    min_score=65.0,
    style_preset="default"
)

clips = res["clips"]
print(f"Selected clips count: {len(clips)}")
print(f"Metadata: {res['metadata']}")
print("=" * 80)
for c in clips:
    first_words = " ".join([w["word"] for w in c["words"][:8]])
    print(f"#{c['rank']} [{c['start_time']}s - {c['end_time']}s] ({c['duration']}s) Score: {c['virality_score']}/100")
    print(f"   Title: {c['title']}")
    print(f"   Rubric: {c['rubric']}")
    print(f"   Reason: {c['reason']}")
    print(f"   Opens with: {first_words}")
    print("-" * 80)
