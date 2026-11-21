import json
from pathlib import Path

PROJECT_JSON = Path("data/runs/best_moments_test/project.json")
with open(PROJECT_JSON, "r", encoding="utf-8") as f:
    project = json.load(f)

for c in project["clips"]:
    words = c.get("words", [])
    first_words = " ".join([w["word"] for w in words[:6]])
    last_words = " ".join([w["word"] for w in words[-6:]])
    print(f"\nClip #{c['rank']} ({c['start_time']:.1f}s - {c['end_time']:.1f}s, dur: {c['duration']:.1f}s):")
    print(f"  Title: {c['title']}")
    print(f"  Start boundary: \"{first_words}...\"")
    print(f"  End boundary:   \"...{last_words}\"")
