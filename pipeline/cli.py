import os
import sys
import json
import argparse
from pathlib import Path

# Ensure both project root and pipeline dir are on sys.path
_ROOT = Path(__file__).resolve().parent.parent
_PIPELINE = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
if str(_PIPELINE) not in sys.path:
    sys.path.insert(0, str(_PIPELINE))

from ingest import get_video_info, download_video_link, IngestionError
from transcribe import transcribe_video, fetch_youtube_captions
from llm_virality import discover_viral_clips_llm
from best_moments import select_best_moments
from smart_reframe import compute_crop_coordinates
from caption_generator import generate_karaoke_ass
from render_clip import render_clip
from logger import StructuredLogger
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

def print_json(data: dict):
    print(json.dumps(data, indent=2))

def run_full_pipeline(
    input_source: str,
    output_dir: str,
    max_clips: int = 8,
    min_score: float = 65.0,
    clip_style: str = "default",
    prompt: str = "",
    min_duration: float = 20.0,
    max_duration: float = 60.0,
    render_previews: bool = True,
    aspect_ratio: str = "9:16",
    resolution: str = "1080p",
    render_mode: str = "crop",
    caption_style: str = "viral_yellow",
    caption_position: str = "bottom",
    captions_enabled: bool = True,
    language: str = "auto",
    job_id: str = "default"
):
    os.makedirs(output_dir, exist_ok=True)
    status_file = os.path.join(output_dir, "status.json")
    logger = StructuredLogger(job_id=job_id)

    def update_status(step: str, progress: int, message: str, details: any = None):
        st = {"step": step, "progress": progress, "message": message}
        with open(status_file, "w", encoding="utf-8") as f:
            json.dump(st, f)
        logger.info(step, message, progress, details)

    try:
        # Step 1: Ingestion
        logger.start_timer("ingest")
        update_status("ingest", 10, "Ingesting video source from URL / upload...")
        if input_source.startswith("http://") or input_source.startswith("https://"):
            video_file = download_video_link(input_source, os.path.join(output_dir, "downloads"))
        else:
            if not os.path.exists(input_source):
                raise FileNotFoundError(f"Source video not found: {input_source}")
            video_file = os.path.abspath(input_source)

        video_info = get_video_info(video_file)
        logger.info("ingest", f"Source ingested: {video_info.get('filename')} ({video_info.get('duration')}s, {video_info.get('width')}x{video_info.get('height')})")

        # Step 2: Speech-to-Text Transcription with Whisper
        logger.start_timer("transcribe")
        transcript_path = os.path.join(output_dir, "transcript.json")
        shared_transcript_cache = Path(__file__).resolve().parent.parent / "data" / "cache" / "transcripts"
        video_stem = Path(video_file).stem

        if os.path.exists(transcript_path) and os.path.getsize(transcript_path) > 100:
            update_status("transcribe", 50, "Loaded verified Whisper transcript cache...")
            with open(transcript_path, "r", encoding="utf-8") as f:
                transcript_data = json.load(f)
        elif shared_transcript_cache.exists() and (shared_transcript_cache / f"{video_stem}.json").exists():
            update_status("transcribe", 50, "Loaded shared Whisper transcript cache...")
            with open(shared_transcript_cache / f"{video_stem}.json", "r", encoding="utf-8") as f:
                transcript_data = json.load(f)
            with open(transcript_path, "w", encoding="utf-8") as f:
                json.dump(transcript_data, f, indent=2)
        else:
            transcript_data = None
            if input_source.startswith("http://") or input_source.startswith("https://"):
                update_status("transcribe", 30, "Checking YouTube native word captions...")
                yt_caps = fetch_youtube_captions(input_source, os.path.join(output_dir, "captions"))
                if yt_caps and len(yt_caps.get("words", [])) > 10:
                    transcript_data = yt_caps
                    update_status("transcribe", 50, f"Extracted {len(yt_caps['words'])} words from YouTube auto-captions in 1.2s!")

            if not transcript_data:
                update_status("transcribe", 35, "Running Whisper word-level transcription...")
                dur = video_info.get("duration", 0)
                model_name = "tiny" if dur > 600 else "base"
                transcript_data = transcribe_video(video_file, model_size=model_name, language=language)

            with open(transcript_path, "w", encoding="utf-8") as f:
                json.dump(transcript_data, f, indent=2)

        total_words = len(transcript_data.get("words", []))
        logger.info("transcribe", f"Transcription complete: {total_words} words recognized", progress=55)

        # Step 3: Best Moments Multi-Stage Selection Pipeline
        logger.start_timer("virality_scoring")
        update_status("virality_scoring", 65, f"Running Best Moments Pipeline (target: {max_clips} clips, min_score: {min_score}, style: {clip_style})...")
        moments_result = select_best_moments(
            transcript_data=transcript_data,
            video_path=video_file,
            min_duration=min_duration,
            max_duration=max_duration,
            target_clip_count=max_clips,
            min_score=min_score,
            style_preset=clip_style,
            user_prompt=prompt
        )

        top_clips = moments_result["clips"]
        also_considered = moments_result.get("also_considered", [])
        meta = moments_result.get("metadata", {})

        print("\n" + "=" * 120)
        print(f"OMNICLIP BEST MOMENTS DISCOVERY (Selected {len(top_clips)} clips from {meta.get('generated_candidates', 0)} candidates)")
        print(f"Settings: Style={clip_style} | Target={max_clips} | MinScore={min_score} | Durations={min_duration}-{max_duration}s")
        print("=" * 120)
        print(f"{'RANK':<5} | {'START - END':<17} | {'SCORE':<7} | {'RUBRIC (H/E/C/V/S/Cl)':<23} | {'1-LINE REASON':<36} | {'TITLE'}")
        print("-" * 120)
        for c in top_clips:
            t_range = f"{c['start_time']:.1f}s - {c['end_time']:.1f}s"
            sc_str = f"{c['virality_score']}/100"
            rb = c['rubric']
            r_str = f"H:{rb.get('hook_strength',0)} E:{rb.get('emotional_intensity',0)} C:{rb.get('story_completeness',0)} V:{rb.get('value_density',0)} S:{rb.get('shareability',0)} Cl:{rb.get('clarity',0)}"
            reason = (c.get('reason') or c.get('explanation', ''))[:35]
            print(f"#{c['rank']:<4} | {t_range:<17} | {sc_str:<7} | {r_str:<23} | {reason:<36} | {c['title']}")
        print("=" * 120 + "\n")

        logger.info("virality_scoring", f"Selected {len(top_clips)} top viral moments; {len(also_considered)} also considered", progress=70)

        # Step 4: Reframing & Subtitle Generation (ONLY for selected clips!)
        logger.start_timer("reframing_and_render")
        clips_dir = os.path.join(output_dir, "clips")
        os.makedirs(clips_dir, exist_ok=True)

        update_status("reframing", 75, f"Building {aspect_ratio} compositions ({render_mode} mode @ {resolution})...")
        rendered_clips = [None] * len(top_clips)
        total_clips = len(top_clips)
        completed_renders = 0

        # Save initial manifest immediately for instant preview in UI
        initial_project_data = {
            "project_id": Path(output_dir).name,
            "status": "rendering",
            "source_video": video_info,
            "clips": top_clips,
            "also_considered": also_considered,
        }
        with open(os.path.join(output_dir, "project.json"), "w", encoding="utf-8") as f:
            json.dump(initial_project_data, f, indent=2)

        def render_worker(item):
            idx, clip = item
            clip_id = clip["id"]
            start_t = clip["start_time"]
            end_t = clip["end_time"]

            # Compute crop box based on selected aspect ratio and resolution
            crop_info = compute_crop_coordinates(video_file, start_t, end_t, aspect_ratio=aspect_ratio, resolution=resolution)
            clip["crop_info"] = crop_info
            clip["aspect_ratio"] = aspect_ratio
            clip["resolution"] = resolution
            clip["render_mode"] = render_mode
            clip["caption_style"] = caption_style
            clip["captions_enabled"] = captions_enabled

            # Generate Karaoke Subtitles (.ass)
            ass_path = None
            if captions_enabled:
                ass_path = os.path.join(clips_dir, f"{clip_id}_karaoke.ass")
                generate_karaoke_ass(
                    words=clip.get("words", []),
                    output_ass_path=ass_path,
                    clip_start_time=start_t,
                    clip_end_time=end_t,
                    style_preset=caption_style,
                    position=caption_position,
                    aspect_ratio=aspect_ratio,
                    resolution=resolution
                )
            clip["ass_subtitle_path"] = ass_path

            # Render MP4
            if render_previews:
                out_mp4 = os.path.join(clips_dir, f"{clip_id}_rendered.mp4")
                render_clip(
                    source_video=video_file,
                    start_time=start_t,
                    end_time=end_t,
                    crop_info=crop_info,
                    aspect_ratio=aspect_ratio,
                    resolution=resolution,
                    render_mode=render_mode,
                    ass_subtitle_path=ass_path,
                    captions_enabled=captions_enabled,
                    output_mp4=out_mp4
                )
                clip["rendered_video_path"] = out_mp4
            else:
                clip["rendered_video_path"] = None

            return idx, clip

        # Concurrent multithreaded rendering (2 concurrent workers)
        with ThreadPoolExecutor(max_workers=min(2, total_clips or 1)) as executor:
            futures = [executor.submit(render_worker, (i, c)) for i, c in enumerate(top_clips)]
            for future in as_completed(futures):
                idx, finished_clip = future.result()
                rendered_clips[idx] = finished_clip
                completed_renders += 1
                prog = 75 + int((completed_renders / total_clips) * 20)
                update_status("rendering", prog, f"Rendered clip {completed_renders}/{total_clips}: {finished_clip['title'][:30]}...")

        # Final project metadata
        project_data = {
            "project_id": Path(output_dir).name,
            "status": "completed",
            "source_video": video_info,
            "settings": {
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "render_mode": render_mode,
                "caption_style": caption_style,
                "caption_position": caption_position,
                "captions_enabled": captions_enabled,
                "clip_style": clip_style,
                "target_clip_count": max_clips,
                "min_score": min_score,
                "prompt": prompt,
                "min_duration": min_duration,
                "max_duration": max_duration
            },
            "transcript_summary": {
                "language": transcript_data.get("language", "en"),
                "total_words": len(transcript_data.get("words", [])),
                "full_text": transcript_data.get("full_text", "")[:300] + "..."
            },
            "clips": rendered_clips,
            "also_considered": also_considered,
            "metadata": meta
        }

        project_path = os.path.join(output_dir, "project.json")
        with open(project_path, "w", encoding="utf-8") as f:
            json.dump(project_data, f, indent=2)

        update_status("completed", 100, f"Successfully generated {len(rendered_clips)} viral clips!")
        print_json(project_data)
        return project_data

    except Exception as e:
        err_msg = str(e)
        details = getattr(e, "details", "") or ""
        logger.error("failed", err_msg, details)
        st = {"step": "failed", "progress": 0, "message": f"Pipeline error: {err_msg}", "details": details}
        with open(status_file, "w", encoding="utf-8") as f:
            json.dump(st, f)
        print(f"[ERROR] {err_msg}", file=sys.stderr)
        if details:
            print(f"[DETAILS] {details}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="OmniClip AI Pipeline CLI")
    subparsers = parser.add_subparsers(dest="command", help="Subcommand to run")

    # Command: process
    proc = subparsers.add_parser("process", help="Run end-to-end processing pipeline")
    proc.add_argument("--input", required=True, help="YouTube URL or local video path")
    proc.add_argument("--output-dir", required=True, help="Directory to save runs, clips, and manifests")
    proc.add_argument("--max-clips", type=int, default=8, help="Maximum clips to extract (default 8, target 5-10)")
    proc.add_argument("--min-score", type=float, default=65.0, help="Minimum virality score threshold (default 65.0)")
    proc.add_argument("--clip-style", default="default", choices=["default", "educational", "funny", "storytelling", "controversial", "inspirational"], help="Rubric reweighting style preset")
    proc.add_argument("--prompt", default="", help="Natural language prompt to steer topic selection")
    proc.add_argument("--min-duration", type=float, default=20.0, help="Minimum clip duration in seconds")
    proc.add_argument("--max-duration", type=float, default=60.0, help="Maximum clip duration in seconds")
    proc.add_argument("--no-render", action="store_true", help="Skip MP4 rendering")
    proc.add_argument("--aspect-ratio", default="9:16", choices=["9:16", "4:5", "1:1", "16:9"], help="Target aspect ratio")
    proc.add_argument("--resolution", default="1080p", choices=["1080p", "720p"], help="Output resolution")
    proc.add_argument("--render-mode", default="crop", choices=["crop", "blur_bg"], help="Framing mode")
    proc.add_argument("--caption-style", default="viral_yellow", choices=["viral_yellow", "neon_green", "cyber_cyan", "fire_orange", "clean_minimal", "bold_pop", "boxed", "typewriter"], help="Subtitle styling preset")
    proc.add_argument("--caption-position", default="bottom", choices=["bottom", "middle", "top"], help="Subtitle vertical position")
    proc.add_argument("--no-captions", action="store_true", help="Disable burned subtitles")
    proc.add_argument("--language", default="auto", help="Spoken language code for transcription")
    proc.add_argument("--job-id", default=os.getenv("JOB_ID", "cli_job"), help="Background job tracking ID")

    # Command: discover (fast best-moments recall and scoring)
    disc = subparsers.add_parser("discover", help="Discover and score best moments without rendering MP4s")
    disc.add_argument("--transcript", required=True, help="Path to transcript.json")
    disc.add_argument("--video", default=None, help="Optional path to source video for audio RMS analysis")
    disc.add_argument("--max-clips", type=int, default=8)
    disc.add_argument("--min-score", type=float, default=65.0)
    disc.add_argument("--clip-style", default="default", choices=["default", "educational", "funny", "storytelling", "controversial", "inspirational"])
    disc.add_argument("--prompt", default="")
    disc.add_argument("--min-duration", type=float, default=20.0)
    disc.add_argument("--max-duration", type=float, default=60.0)
    disc.add_argument("--output-json", default=None, help="Optional output JSON path")

    # Command: render-single (for Clip Editor re-renders)
    rnd = subparsers.add_parser("render-single", help="Render a single clip with custom parameters")
    rnd.add_argument("--source", required=True, help="Path to source video")
    rnd.add_argument("--start", type=float, required=True, help="Start time in seconds")
    rnd.add_argument("--end", type=float, required=True, help="End time in seconds")
    rnd.add_argument("--aspect-ratio", default="9:16", choices=["9:16", "4:5", "1:1", "16:9"])
    rnd.add_argument("--resolution", default="1080p", choices=["1080p", "720p"])
    rnd.add_argument("--render-mode", default="crop", choices=["crop", "blur_bg", "split", "fill", "fit"])
    rnd.add_argument("--debug-overlay", action="store_true", help="Draw smart framing debug overlay")
    rnd.add_argument("--target-person-id", type=int, default=None, help="Lock tracking onto specific person ID")
    rnd.add_argument("--caption-style", default="viral_yellow")
    rnd.add_argument("--caption-position", default="bottom")
    rnd.add_argument("--headline-banner", default=None, help="Top hook headline banner")
    rnd.add_argument("--no-captions", action="store_true", help="Disable burned subtitles")
    rnd.add_argument("--no-auto-emojis", action="store_true", help="Disable auto emoji insertion in subtitles")
    rnd.add_argument("--words-json", default=None, help="JSON file containing array of word objects")
    rnd.add_argument("--output", required=True, help="Destination MP4 path")

    # Command: render-all-ratios (for Export All Formats ZIP)
    all_rnd = subparsers.add_parser("render-all-ratios", help="Render clip in all 4 aspect ratios and package into ZIP")
    all_rnd.add_argument("--source", required=True, help="Path to source video")
    all_rnd.add_argument("--start", type=float, required=True, help="Start time in seconds")
    all_rnd.add_argument("--end", type=float, required=True, help="End time in seconds")
    all_rnd.add_argument("--resolution", default="1080p", choices=["1080p", "720p"])
    all_rnd.add_argument("--render-mode", default="crop", choices=["crop", "blur_bg", "split", "fill", "fit"])
    all_rnd.add_argument("--debug-overlay", action="store_true", help="Draw smart framing debug overlay")
    all_rnd.add_argument("--caption-style", default="viral_yellow")
    all_rnd.add_argument("--caption-position", default="bottom")
    all_rnd.add_argument("--no-captions", action="store_true", help="Disable burned subtitles")
    all_rnd.add_argument("--words-json", default=None, help="JSON file containing array of word objects")
    all_rnd.add_argument("--output-dir", required=True, help="Directory to save renders and ZIP")
    all_rnd.add_argument("--base-name", default="clip", help="Base filename prefix")
    all_rnd.add_argument("--zip-output", default=None, help="Optional destination path for the ZIP archive")

    args = parser.parse_args()

    if args.command == "process":
        run_full_pipeline(
            input_source=args.input,
            output_dir=args.output_dir,
            max_clips=args.max_clips,
            min_score=args.min_score,
            clip_style=args.clip_style,
            prompt=args.prompt,
            min_duration=args.min_duration,
            max_duration=args.max_duration,
            render_previews=not args.no_render,
            aspect_ratio=args.aspect_ratio,
            resolution=args.resolution,
            render_mode=args.render_mode,
            caption_style=args.caption_style,
            caption_position=args.caption_position,
            captions_enabled=not args.no_captions,
            language=args.language,
            job_id=args.job_id
        )
    elif args.command == "discover":
        if not os.path.exists(args.transcript):
            print(f"[ERROR] Transcript file not found: {args.transcript}", file=sys.stderr)
            sys.exit(1)
        with open(args.transcript, "r", encoding="utf-8") as f:
            t_data = json.load(f)

        res = select_best_moments(
            transcript_data=t_data,
            video_path=args.video,
            min_duration=args.min_duration,
            max_duration=args.max_duration,
            target_clip_count=args.max_clips,
            min_score=args.min_score,
            style_preset=args.clip_style,
            user_prompt=args.prompt
        )

        clips = res["clips"]
        also_considered = res.get("also_considered", [])
        meta = res.get("metadata", {})

        print("\n" + "=" * 120)
        print(f"OMNICLIP BEST MOMENTS DISCOVERY (Selected {len(clips)} clips | Generated {meta.get('generated_candidates', 0)} candidates)")
        print(f"Settings: Style={args.clip_style} | Target={args.max_clips} | MinScore={args.min_score} | Durations={args.min_duration}-{args.max_duration}s")
        print("=" * 120)
        print(f"{'RANK':<5} | {'START - END':<17} | {'SCORE':<7} | {'RUBRIC (H/E/C/V/S/Cl)':<23} | {'1-LINE REASON':<36} | {'TITLE'}")
        print("-" * 120)
        for c in clips:
            t_range = f"{c['start_time']:.1f}s - {c['end_time']:.1f}s"
            sc_str = f"{c['virality_score']}/100"
            rb = c['rubric']
            r_str = f"H:{rb.get('hook_strength',0)} E:{rb.get('emotional_intensity',0)} C:{rb.get('story_completeness',0)} V:{rb.get('value_density',0)} S:{rb.get('shareability',0)} Cl:{rb.get('clarity',0)}"
            reason = (c.get('reason') or c.get('explanation', ''))[:35]
            print(f"#{c['rank']:<4} | {t_range:<17} | {sc_str:<7} | {r_str:<23} | {reason:<36} | {c['title']}")
        print("=" * 120)

        if also_considered:
            print(f"\nAlso Considered ({len(also_considered)} candidates):")
            for ac in also_considered[:4]:
                print(f"  • {ac['start_time']:.1f}s - {ac['end_time']:.1f}s ({ac['duration']:.1f}s) Score: {ac['virality_score']}/100 - {ac['title']}")
        print()

        if args.output_json:
            with open(args.output_json, "w", encoding="utf-8") as f:
                json.dump(res, f, indent=2)
            print(f"Saved manifest: {args.output_json}")
    elif args.command == "render-single":
        captions_on = not args.no_captions
        ass_path = None
        if captions_on and args.words_json and os.path.exists(args.words_json):
            with open(args.words_json, "r", encoding="utf-8") as f:
                words_data = json.load(f)
            ass_path = os.path.splitext(args.output)[0] + ".ass"
            generate_karaoke_ass(
                words=words_data,
                output_ass_path=ass_path,
                clip_start_time=args.start,
                clip_end_time=args.end,
                style_preset=args.caption_style,
                position=args.caption_position,
                aspect_ratio=args.aspect_ratio,
                resolution=args.resolution,
                auto_emojis=not getattr(args, "no_auto_emojis", False),
                headline_banner=getattr(args, "headline_banner", None)
            )

        crop_info = compute_crop_coordinates(
            video_path=args.source,
            start_time=args.start,
            end_time=args.end,
            aspect_ratio=args.aspect_ratio,
            resolution=args.resolution
        )

        out = render_clip(
            source_video=args.source,
            start_time=args.start,
            end_time=args.end,
            crop_info=crop_info,
            aspect_ratio=args.aspect_ratio,
            resolution=args.resolution,
            render_mode=args.render_mode,
            ass_subtitle_path=ass_path,
            captions_enabled=captions_on,
            debug_overlay=getattr(args, "debug_overlay", False),
            output_mp4=args.output
        )
        print(f"Rendered: {out}")

    elif args.command == "render-all-ratios":
        os.makedirs(args.output_dir, exist_ok=True)
        ratios = ["9:16", "4:5", "1:1", "16:9"]
        captions_on = not args.no_captions
        words_data = []
        if args.words_json and os.path.exists(args.words_json):
            with open(args.words_json, "r", encoding="utf-8") as f:
                words_data = json.load(f)

        rendered_files = {}
        for r in ratios:
            r_slug = r.replace(":", "-")
            out_mp4 = os.path.join(args.output_dir, f"{args.base_name}_{r_slug}_{args.resolution}.mp4")

            ass_path = None
            if captions_on and words_data:
                ass_path = os.path.join(args.output_dir, f"{args.base_name}_{r_slug}_{args.resolution}.ass")
                generate_karaoke_ass(
                    words=words_data,
                    output_ass_path=ass_path,
                    clip_start_time=args.start,
                    clip_end_time=args.end,
                    style_preset=args.caption_style,
                    position=args.caption_position,
                    aspect_ratio=r,
                    resolution=args.resolution
                )

            crop_info = compute_crop_coordinates(
                video_path=args.source,
                start_time=args.start,
                end_time=args.end,
                aspect_ratio=r,
                resolution=args.resolution
            )

            render_clip(
                source_video=args.source,
                start_time=args.start,
                end_time=args.end,
                crop_info=crop_info,
                aspect_ratio=r,
                resolution=args.resolution,
                render_mode=args.render_mode,
                ass_subtitle_path=ass_path,
                captions_enabled=captions_on,
                debug_overlay=getattr(args, "debug_overlay", False),
                output_mp4=out_mp4
            )
            rendered_files[r] = out_mp4

        # Package into ZIP archive
        zip_path = args.zip_output or os.path.join(args.output_dir, f"{args.base_name}_all_formats_{args.resolution}.zip")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for r, fpath in rendered_files.items():
                arcname = f"{args.base_name}_{r.replace(':', '-')}_{args.resolution}.mp4"
                zipf.write(fpath, arcname=arcname)

        result = {
            "success": True,
            "zip_path": zip_path,
            "rendered_files": rendered_files,
            "resolution": args.resolution
        }
        print(json.dumps(result, indent=2))

    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
