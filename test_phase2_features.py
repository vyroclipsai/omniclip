import os
import sys
import json
import tempfile
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline.caption_generator import generate_karaoke_ass, STYLE_PRESETS, ALIGNMENT_MAP, RESOLUTION_MAP
from pipeline.smart_reframe import compute_crop_coordinates
from pipeline.render_clip import render_clip
from pipeline.llm_virality import discover_viral_clips_llm, _validate_and_sanitize_clips

def test_caption_generator_styles():
    print("[TEST] Caption generator presets & positions...")
    with tempfile.TemporaryDirectory() as tmpdir:
        words = [
            {"word": "THE", "start": 0.0, "end": 0.4},
            {"word": "SECRET", "start": 0.4, "end": 0.8},
            {"word": "TO", "start": 0.8, "end": 1.0},
            {"word": "SCALE", "start": 1.0, "end": 1.5},
        ]
        for style in ["viral_yellow", "neon_green", "cyber_cyan", "fire_orange", "clean_sub"]:
            ass_path = os.path.join(tmpdir, f"sub_{style}.ass")
            out = generate_karaoke_ass(
                words=words,
                output_ass_path=ass_path,
                clip_start_time=0.0,
                clip_end_time=2.0,
                style_preset=style,
                position="bottom",
                aspect_ratio="9:16"
            )
            assert os.path.exists(out), f"ASS file not created for {style}"
            with open(out, "r", encoding="utf-8") as f:
                content = f.read()
                assert "PlayResX: 1080" in content
                assert "PlayResY: 1920" in content
                assert "Dialogue: 0," in content
    print("  -> Passed all 5 style presets and aspect ratio headers.")

def test_smart_reframe_aspect_ratios():
    print("[TEST] Smart reframe aspect ratio coordinate mapping...")
    # Test with dummy synthetic video / fallback
    res_916 = compute_crop_coordinates("nonexistent.mp4", 0.0, 5.0, aspect_ratio="9:16")
    assert res_916["scaled_w"] == 1080 and res_916["scaled_h"] == 1920
    
    res_11 = compute_crop_coordinates("nonexistent.mp4", 0.0, 5.0, aspect_ratio="1:1")
    assert res_11["scaled_w"] == 1080 and res_11["scaled_h"] == 1080

    res_169 = compute_crop_coordinates("nonexistent.mp4", 0.0, 5.0, aspect_ratio="16:9")
    assert res_169["scaled_w"] == 1920 and res_169["scaled_h"] == 1080
    print("  -> Passed 9:16, 1:1, and 16:9 coordinate calculations.")

def test_llm_virality_validation_and_fallback():
    print("[TEST] LLM output schema validation & local fallback...")
    # Test validation
    raw_llm_payload = {
        "clips": [
            {
                "start": 10.0,
                "end": 45.0,
                "title": "THE BIG SECRET",
                "hook": "Shocking claim in first 3s",
                "reason": "High retention rate",
                "virality_score": 95
            }
        ]
    }
    validated = _validate_and_sanitize_clips(raw_llm_payload, min_duration=15.0, max_duration=90.0)
    assert len(validated) == 1
    assert validated[0]["title"] == "THE BIG SECRET"
    assert validated[0]["duration"] == 35.0
    assert validated[0]["virality_score"] == 95

    # Test local heuristic fallback when no LLM keys
    sample_transcript = {
        "segments": [
            {"start": 0.0, "end": 15.0, "text": "How to scale your business with one simple hack.", "words": [
                {"word": "how", "start": 0.0, "end": 0.5},
                {"word": "to", "start": 0.5, "end": 0.8},
                {"word": "scale", "start": 0.8, "end": 1.2},
            ]},
            {"start": 15.0, "end": 32.0, "text": "This changed everything and finally turned into millions.", "words": [
                {"word": "this", "start": 15.0, "end": 15.5},
                {"word": "finally", "start": 25.0, "end": 26.0},
                {"word": "millions", "start": 30.0, "end": 31.0},
            ]}
        ]
    }
    fallback_clips = discover_viral_clips_llm(sample_transcript, min_duration=15.0, max_duration=60.0)
    assert len(fallback_clips) >= 1
    assert fallback_clips[0]["virality_score"] >= 60
    print("  -> Passed LLM schema validation and local heuristic fallback.")

if __name__ == "__main__":
    test_caption_generator_styles()
    test_smart_reframe_aspect_ratios()
    test_llm_virality_validation_and_fallback()
    print("\n==========================================")
    print("🎉 ALL PHASE 2 PIPELINE TESTS PASSED!")
    print("==========================================")
