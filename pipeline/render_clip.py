import os
import subprocess
import json
from typing import Dict, Any, Optional

DIMENSIONS = {
    ("9:16", "1080p"): (1080, 1920),
    ("9:16", "720p"):  (720,  1280),
    ("4:5",  "1080p"): (1080, 1350),
    ("4:5",  "720p"):  (720,  900),
    ("1:1",  "1080p"): (1080, 1080),
    ("1:1",  "720p"):  (720,  720),
    ("16:9", "1080p"): (1920, 1080),
    ("16:9", "720p"):  (1280, 720),
}

_NVENC_AVAILABLE = None

def is_nvenc_available() -> bool:
    global _NVENC_AVAILABLE
    if _NVENC_AVAILABLE is not None:
        return _NVENC_AVAILABLE
    try:
        check = subprocess.run(
            ["ffmpeg", "-f", "lavfi", "-i", "color=c=black:s=256x256:d=0.1", "-c:v", "h264_nvenc", "-f", "null", "-"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=3
        )
        _NVENC_AVAILABLE = (check.returncode == 0)
    except Exception:
        _NVENC_AVAILABLE = False
    return _NVENC_AVAILABLE

def get_source_fps(source_video: str) -> float:
    """Probes the exact native frame rate of the source video without hardcoding."""
    try:
        cmd = [
            "ffprobe", "-v", "quiet",
            "-select_streams", "v:0",
            "-show_entries", "stream=r_frame_rate,avg_frame_rate",
            "-print_format", "json",
            source_video
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        stream = data.get("streams", [{}])[0]
        r_fps = stream.get("r_frame_rate", "30/1")
        if "/" in r_fps:
            num, den = r_fps.split("/")
            return float(num) / float(den)
        return float(r_fps)
    except Exception:
        return 30.0

def render_clip(
    source_video: str,
    start_time: float,
    end_time: float,
    crop_info: Optional[Dict[str, Any]] = None,
    aspect_ratio: str = "9:16",
    resolution: str = "1080p",
    render_mode: str = "crop", # "crop" / "fill", "blur_bg" / "fit", "split"
    ass_subtitle_path: Optional[str] = None,
    captions_enabled: bool = True,
    debug_overlay: bool = False,
    output_mp4: Optional[str] = None,
    output_path: Optional[str] = None,
    **kwargs
) -> str:
    """
    Renders clip with specified aspect ratio (9:16, 4:5, 1:1, 16:9),
    resolution (1080p, 720p), smart layout mode (crop/fill, blur_bg/fit, split),
    and optional subtitles, preserving source video native frame rate and high audio fidelity.
    """
    output_mp4 = output_path or output_mp4 or "output.mp4"
    out_dir = os.path.dirname(os.path.abspath(output_mp4))
    os.makedirs(out_dir, exist_ok=True)
    duration = max(0.5, end_time - start_time)

    dim_key = (aspect_ratio, resolution)
    scaled_w, scaled_h = DIMENSIONS.get(dim_key, DIMENSIONS[("9:16", "1080p")])

    # Subtitle handling: only burn if captions_enabled is True and file exists
    ass_rel = None
    if captions_enabled and ass_subtitle_path and os.path.exists(ass_subtitle_path):
        ass_rel = os.path.relpath(ass_subtitle_path, out_dir).replace("\\", "/")

    filter_complex = None
    vf_simple = None

    # Normalize layout alias
    mode = render_mode.lower()
    if mode in ["fill", "smart_crop"]: mode = "crop"
    if mode in ["fit", "blur"]: mode = "blur_bg"

    # Layout 1: SPLIT (Two speakers stacked vertically for 9:16 and 4:5)
    if mode == "split" and aspect_ratio in ["9:16", "4:5"]:
        half_h = scaled_h // 2
        split_boxes = crop_info.get("split_boxes", {}) if crop_info else {}
        top_box = split_boxes.get("top", {})
        bot_box = split_boxes.get("bottom", {})

        src_w = crop_info.get("source_w", 1920) if crop_info else 1920
        src_h = crop_info.get("source_h", 1080) if crop_info else 1080

        # Calculate crop coordinates for each speaker
        tw = top_box.get("crop_w", int(src_h * (scaled_w / half_h)))
        th = top_box.get("crop_h", src_h)
        tx = top_box.get("crop_x", int(src_w * 0.15))
        ty = top_box.get("crop_y", 0)

        bw = bot_box.get("crop_w", int(src_h * (scaled_w / half_h)))
        bh = bot_box.get("crop_h", src_h)
        bx = bot_box.get("crop_x", int(min(src_w - bw, src_w * 0.55)))
        by = bot_box.get("crop_y", 0)

        overlay_chain = f"[top][bot]vstack=inputs=2[v_stack];[v_stack]drawbox=x=0:y={half_h - 2}:w={scaled_w}:h=4:color=black@0.9:t=fill"
        if ass_rel:
            overlay_chain += f",ass={ass_rel}"
        overlay_chain += "[v]"

        filter_complex = (
            f"[0:v]split=2[in_top][in_bot];"
            f"[in_top]crop={tw}:{th}:{tx}:{ty},scale={scaled_w}:{half_h}:flags=lanczos[top];"
            f"[in_bot]crop={bw}:{bh}:{bx}:{by},scale={scaled_w}:{half_h}:flags=lanczos[bot];"
            f"{overlay_chain}"
        )

    # Layout 2: FIT (Blur background composition)
    elif mode == "blur_bg" and aspect_ratio in ["9:16", "4:5", "1:1"]:
        overlay_filter = f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
        if debug_overlay:
            overlay_filter += f",drawbox=x=10:y=10:w=160:h=40:color=cyan@0.8:t=fill,drawtext=text='FIT (BLUR)':x=20:y=22:fontsize=22:fontcolor=black"
        if ass_rel:
            overlay_filter += f",ass={ass_rel}"
        overlay_filter += "[v]"

        filter_complex = (
            f"[0:v]split=2[orig][blur];"
            f"[blur]scale={scaled_w}:{scaled_h}:force_original_aspect_ratio=increase,crop={scaled_w}:{scaled_h},boxblur=25:5[bg];"
            f"[orig]scale={scaled_w}:{scaled_h}:force_original_aspect_ratio=decrease[fg];"
            f"{overlay_filter}"
        )

    # Layout 3: FILL (Smart cropped framing with rule-of-thirds headroom)
    else:
        cw = crop_info.get("crop_w", scaled_w) if crop_info else scaled_w
        ch = crop_info.get("crop_h", scaled_h) if crop_info else scaled_h
        cx = crop_info.get("crop_x", 0) if crop_info else 0
        cy = crop_info.get("crop_y", 0) if crop_info else 0

        vf_chain = [
            f"crop={cw}:{ch}:{cx}:{cy}",
            f"scale={scaled_w}:{scaled_h}:flags=bicubic"
        ]

        if debug_overlay:
            # Draw rule-of-thirds eye line & layout indicator
            third_y = int(scaled_h * 0.33)
            vf_chain.append(f"drawbox=x=0:y={third_y}:w={scaled_w}:h=2:color=yellow@0.7:t=fill")
            vf_chain.append(f"drawbox=x=15:y=15:w=260:h=45:color=black@0.75:t=fill")
            vf_chain.append(f"drawtext=text='SMART CROP (33% EYES)':x=25:y=30:fontsize=20:fontcolor=yellow")

        if ass_rel:
            vf_chain.append(f"ass={ass_rel}")

        vf_simple = ",".join(vf_chain)

    out_name = os.path.basename(output_mp4)

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(round(start_time, 3)),
        "-i", os.path.abspath(source_video),
        "-t", str(round(duration, 3)),
    ]

    if filter_complex:
        cmd.extend(["-filter_complex", filter_complex, "-map", "[v]", "-map", "0:a?"])
    else:
        cmd.extend(["-vf", vf_simple])

    # Use hardware NVENC encoder if available on GPU for 3x-5x faster rendering
    use_nvenc = is_nvenc_available()
    vcodec_args = (
        ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "23", "-pix_fmt", "yuv420p"]
        if use_nvenc
        else ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p"]
    )

    # Preserve native source frame rate by not hardcoding -r and passing passthrough
    cmd.extend(vcodec_args + [
        "-fps_mode", "passthrough",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        out_name
    ])

    proc = subprocess.run(cmd, cwd=out_dir, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if proc.returncode != 0 and use_nvenc:
        # Fallback to libx264 if NVENC fails
        cmd_fallback = [
            "ffmpeg", "-y",
            "-ss", str(round(start_time, 3)),
            "-i", os.path.abspath(source_video),
            "-t", str(round(duration, 3)),
        ]
        if filter_complex:
            cmd_fallback.extend(["-filter_complex", filter_complex, "-map", "[v]", "-map", "0:a?"])
        else:
            cmd_fallback.extend(["-vf", vf_simple])
        cmd_fallback.extend([
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-fps_mode", "passthrough",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            out_name
        ])
        proc = subprocess.run(cmd_fallback, cwd=out_dir, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", errors="replace")
        raise RuntimeError(f"FFmpeg render failed (exit code {proc.returncode}): {err[-400:]}")

    return output_mp4

def render_vertical_clip(
    source_video: str,
    start_time: float,
    end_time: float,
    crop_info: Dict[str, Any],
    ass_subtitle_path: Optional[str],
    output_mp4: str
) -> str:
    return render_clip(
        source_video=source_video,
        start_time=start_time,
        end_time=end_time,
        crop_info=crop_info,
        aspect_ratio="9:16",
        resolution="1080p",
        render_mode="crop",
        ass_subtitle_path=ass_subtitle_path,
        captions_enabled=True,
        output_mp4=output_mp4
    )
