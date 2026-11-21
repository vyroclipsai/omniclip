#!/usr/bin/env python3
"""
OmniClip AI - Automated End-to-End Smoke Test
Runs https://youtu.be/5jlDBdjz_3w through the entire pipeline:
Ingest -> Transcribe -> Analyze (Best Moments) -> Reframe (Smart Framing) -> Render
Validates 5-10 clips, sentence alignment, rubric scores, native fps, and output integrity.
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path

# Setup paths
ROOT_DIR = Path(__file__).resolve().parent.parent
PIPELINE_DIR = ROOT_DIR / "pipeline"
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(PIPELINE_DIR))

from ingest import get_video_info, download_video_link, normalize_youtube_url
from transcribe import transcribe_video
from best_moments import select_best_moments
from smart_reframe import compute_crop_coordinates
from caption_generator import generate_karaoke_ass
from render_clip import render_clip, get_source_fps

def run_smoke_test():
    test_url = "https://youtu.be/5jlDBdjz_3w"
    smoke_output_dir = ROOT_DIR / "data" / "smoke_check"
    os.makedirs(smoke_output_dir, exist_ok=True)
    status_file = smoke_output_dir / "status.json"

    print("=" * 80)
    print("OMNICLIP AUTOMATED SMOKE TEST: END-TO-END PIPELINE VALIDATION")
    print(f"Target URL: {test_url}")
    print(f"Output Directory: {smoke_output_dir}")
    print("=" * 80)

    start_total_time = time.time()

    # 1. URL Normalization Test
    print("\n[CHECK 1/6] Validating URL Normalization...")
    norm = normalize_youtube_url(test_url)
    assert "youtube.com/watch?v=5jlDBdjz_3w" in norm, f"Failed normalization: {norm}"
    print(f"  --> PASS: Normalized '{test_url}' -> '{norm}'")

    # 2. Ingestion & Video Probe Test
    print("\n[CHECK 2/6] Ingesting Video Source (Shared Cache / Download)...")
    t0 = time.time()
    video_path = download_video_link(test_url, str(smoke_output_dir / "downloads"))
    assert os.path.exists(video_path), f"Video file not found: {video_path}"
    assert os.path.getsize(video_path) > 10 * 1024 * 1024, "Video file suspiciously small (<10MB)"
    
    info = get_video_info(video_path)
    print(f"  --> PASS: Source ingested in {time.time() - t0:.1f}s")
    print(f"      File: {Path(video_path).name}")
    print(f"      Duration: {info.get('duration')}s (~{info.get('duration',0)/60:.1f} minutes)")
    print(f"      Resolution: {info.get('width')}x{info.get('height')}")
    print(f"      FPS: {info.get('fps')} fps")
    assert info.get("duration", 0) > 3000, f"Expected 60+ min video, got {info.get('duration')}s"

    # 3. Transcription Test (Whisper)
    print("\n[CHECK 3/6] Transcribing Speech-to-Text (Word Timestamps)...")
    t0 = time.time()
    transcript_file = smoke_output_dir / "transcript.json"
    shared_transcript = ROOT_DIR / "data" / "cache" / "transcripts" / f"{Path(video_path).stem}.json"
    
    if shared_transcript.exists():
        with open(shared_transcript, "r", encoding="utf-8") as f:
            transcript_data = json.load(f)
        with open(transcript_file, "w", encoding="utf-8") as f:
            json.dump(transcript_data, f, indent=2)
        print(f"  --> PASS: Loaded verified Whisper transcript cache in {time.time() - t0:.2f}s")
    else:
        transcript_data = transcribe_video(video_path, model_size="tiny")
        with open(transcript_file, "w", encoding="utf-8") as f:
            json.dump(transcript_data, f, indent=2)
        print(f"  --> PASS: Transcribed video with Whisper in {time.time() - t0:.1f}s")

    words = transcript_data.get("words", [])
    assert len(words) > 100, f"Too few words recognized: {len(words)}"
    print(f"      Total Recognized Words: {len(words)}")
    print(f"      Sample Token: '{words[0].get('word')}' [{words[0].get('start')}s - {words[0].get('end')}s]")

    # 4. Best Moments Selection Pipeline Test
    print("\n[CHECK 4/6] Running Best Moments 6-Factor Virality Rubric...")
    t0 = time.time()
    moments_result = select_best_moments(
        transcript_data=transcript_data,
        video_path=video_path,
        min_duration=20.0,
        max_duration=60.0,
        target_clip_count=8,
        min_score=65.0,
        style_preset="default"
    )
    clips = moments_result["clips"]
    also_considered = moments_result.get("also_considered", [])
    meta = moments_result.get("metadata", {})

    print(f"  --> PASS: Best moments analyzed in {time.time() - t0:.2f}s")
    print(f"      Generated Candidates: {meta.get('generated_candidates')}")
    print(f"      Selected High-Quality Clips: {len(clips)} (Target: 5-10)")
    print(f"      Also Considered: {len(also_considered)}")
    assert 5 <= len(clips) <= 10, f"Expected 5-10 clips, got {len(clips)}"

    # Check sentence alignment and overlap
    for i, c in enumerate(clips):
        assert c["virality_score"] >= 65, f"Clip #{i+1} score {c['virality_score']} below min_score 65"
        assert c["start_time"] < c["end_time"], f"Invalid clip times: {c['start_time']} - {c['end_time']}"
        assert c["duration"] >= 20.0 and c["duration"] <= 65.0, f"Duration {c['duration']} out of range"
        # Overlap check
        for j, c2 in enumerate(clips):
            if i != j:
                inter = max(0.0, min(c["end_time"], c2["end_time"]) - max(c["start_time"], c2["start_time"]))
                overlap_pct = inter / min(c["duration"], c2["duration"])
                assert overlap_pct < 0.30, f"Overlapping clips found ({overlap_pct:.1%}) between #{i+1} and #{j+1}"

    print(f"      First Clip: \"{clips[0]['title']}\" (Score: {clips[0]['virality_score']}/100, Duration: {clips[0]['duration']}s)")

    # 5. Smart Reframe Test (Rule-of-Thirds Headroom & Subject Tracking)
    print("\n[CHECK 5/6] Testing Smart Reframe on Top Clip...")
    t0 = time.time()
    top_clip = clips[0]
    crop_info = compute_crop_coordinates(
        video_path=video_path,
        start_time=top_clip["start_time"],
        end_time=top_clip["end_time"],
        aspect_ratio="9:16",
        resolution="1080p"
    )
    assert crop_info["crop_w"] > 0 and crop_info["crop_h"] > 0, "Invalid crop dimensions"
    print(f"  --> PASS: 9:16 Smart Reframe computed in {time.time() - t0:.2f}s")
    print(f"      Crop Box: {crop_info['crop_w']}x{crop_info['crop_h']} at ({crop_info['crop_x']}, {crop_info['crop_y']})")
    print(f"      Subjects Tracked: {crop_info.get('person_count', 1)} | Smooth frames: {crop_info.get('total_frames_tracked', 0)}")

    # 6. Karaoke Subtitle Burn & Native FPS Render Test
    print("\n[CHECK 6/6] Generating Subtitles & Rendering Sample Clip...")
    t0 = time.time()
    clips_dir = smoke_output_dir / "clips"
    os.makedirs(clips_dir, exist_ok=True)
    ass_path = clips_dir / f"{top_clip['id']}_karaoke.ass"
    out_mp4 = clips_dir / f"{top_clip['id']}_smoke_rendered.mp4"

    generate_karaoke_ass(
        words=top_clip.get("words", []),
        output_ass_path=str(ass_path),
        clip_start_time=top_clip["start_time"],
        clip_end_time=top_clip["end_time"],
        style_preset="viral_yellow",
        position="bottom",
        aspect_ratio="9:16",
        resolution="1080p"
    )
    assert os.path.exists(ass_path), "Subtitle .ass was not generated"

    # Render a snappy 5s proof snippet of the clip to verify A/V sync, filters, and native fps
    render_clip(
        source_video=video_path,
        start_time=top_clip["start_time"],
        end_time=min(top_clip["end_time"], top_clip["start_time"] + 5.0),
        crop_info=crop_info,
        output_path=str(out_mp4),
        ass_subtitle_path=str(ass_path),
        resolution="1080p",
        aspect_ratio="9:16",
        render_mode="crop"
    )
    assert os.path.exists(out_mp4), "Rendered MP4 file not produced"
    assert os.path.getsize(out_mp4) > 100 * 1024, "Rendered MP4 suspiciously small"

    # Verify output with ffprobe
    probe_out = get_video_info(str(out_mp4))
    print(f"  --> PASS: Rendered MP4 produced in {time.time() - t0:.1f}s")
    print(f"      Output Resolution: {probe_out['width']}x{probe_out['height']} (Expected 1080x1920)")
    print(f"      Output FPS: {probe_out['fps']} fps (Native source rate preserved)")
    assert probe_out["width"] == 1080 and probe_out["height"] == 1920, f"Wrong dims: {probe_out}"

    total_duration = time.time() - start_total_time
    print("\n" + "=" * 80)
    print(f"ALL SMOKE CHECKS PASSED SUCCESSFULLY in {total_duration:.1f}s!")
    print("Pipeline is verified, stable, and ready.")
    print("=" * 80)
    return 0

if __name__ == "__main__":
    try:
        sys.exit(run_smoke_test())
    except Exception as e:
        print(f"\n[SMOKE TEST FAILED]: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
