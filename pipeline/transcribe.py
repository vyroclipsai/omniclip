import os
import sys
import subprocess
import json
from pathlib import Path

def fetch_youtube_captions(url: str, output_dir: str) -> dict | None:
    """Fast-path extractor for YouTube native word-level captions (takes ~1-2 seconds)."""
    try:
        os.makedirs(output_dir, exist_ok=True)
        sub_prefix = os.path.join(output_dir, "yt_sub")
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--write-auto-sub",
            "--sub-lang", "en,en-orig,hi,hi-orig",
            "--skip-download",
            "--sub-format", "json3",
            "-o", f"{sub_prefix}.%(ext)s",
            "--no-playlist",
            "--socket-timeout", "15",
            url
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20)
        if res.returncode != 0:
            return None

        json3_files = list(Path(output_dir).glob("yt_sub.*.json3"))
        if not json3_files:
            return None

        json3_path = str(json3_files[0])
        with open(json3_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        words = []
        segments = []
        seg_idx = 0
        current_seg_words = []
        seg_start = None

        for event in data.get("events", []):
            t_start = event.get("tStartMs", 0) / 1000.0
            d_dur = event.get("dDurationMs", 0) / 1000.0
            segs = event.get("segs", [])
            for s in segs:
                txt = s.get("utf8", "").strip()
                if not txt or txt == "\n":
                    continue
                offset = s.get("tOffsetMs", 0) / 1000.0
                w_start = round(t_start + offset, 3)
                w_end = round(w_start + max(0.2, min(0.6, d_dur / max(1, len(segs)))), 3)
                word_obj = {"word": txt, "start": w_start, "end": w_end, "confidence": 0.95}
                words.append(word_obj)
                current_seg_words.append(word_obj)
                if seg_start is None:
                    seg_start = w_start

                if txt.endswith((".", "?", "!", "\n")) or len(current_seg_words) >= 15:
                    seg_text = " ".join([w["word"] for w in current_seg_words])
                    segments.append({
                        "id": seg_idx,
                        "start": seg_start,
                        "end": w_end,
                        "text": seg_text,
                        "words": current_seg_words
                    })
                    seg_idx += 1
                    current_seg_words = []
                    seg_start = None

        if current_seg_words:
            seg_text = " ".join([w["word"] for w in current_seg_words])
            segments.append({
                "id": seg_idx,
                "start": seg_start,
                "end": current_seg_words[-1]["end"],
                "text": seg_text,
                "words": current_seg_words
            })

        if len(words) < 10:
            return None

        full_text = " ".join([w["word"] for w in words])
        return {
            "language": "en",
            "full_text": full_text,
            "segments": segments,
            "words": words,
            "source": "youtube_captions"
        }
    except Exception:
        return None

# PyAV 19.0.2 compatibility monkey-patch: remove deprecated 'metadata_errors'
try:
    import av
    _orig_av_open = av.open
    def _patched_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)
    av.open = _patched_av_open
except Exception:
    pass

try:
    from faster_whisper import WhisperModel
    HAS_FASTER_WHISPER = True
except ImportError:
    HAS_FASTER_WHISPER = False

try:
    import whisper
    HAS_OPENAI_WHISPER = True
except ImportError:
    HAS_OPENAI_WHISPER = False

def extract_audio(video_path: str, output_wav: str) -> str:
    """Extracts 16kHz mono audio track for Whisper transcription."""
    os.makedirs(os.path.dirname(os.path.abspath(output_wav)), exist_ok=True)
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_wav
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return output_wav

def transcribe_video(video_path: str, model_size: str = "base", language: str = None) -> dict:
    """Runs local OpenAI Whisper transcription with word-level timestamps."""
    temp_wav = os.path.splitext(video_path)[0] + "_audio.wav"
    try:
        extract_audio(video_path, temp_wav)

        # Probe duration of audio
        audio_dur = 0.0
        try:
            p_cmd = ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", temp_wav]
            res = subprocess.run(p_cmd, stdout=subprocess.PIPE, text=True)
            audio_dur = float(res.stdout.strip())
        except Exception:
            pass

        # For long videos (> 10 mins), use tiny model on CPU for 4x speedup
        selected_model = model_size
        if audio_dur > 600 and model_size == "base":
            selected_model = "tiny"
            print(f"[TRANSCRIPTION] Video is {audio_dur/60:.1f} mins long. Using 'tiny' model for fast CPU processing.", flush=True)

        # High-Speed Fast-Whisper Engine (4x-8x faster with INT8 quantization)
        if HAS_FASTER_WHISPER:
            try:
                print(f"[TRANSCRIPTION] Utilizing faster-whisper ({selected_model}) with INT8 quantization and multi-threading...", flush=True)
                num_threads = min(12, os.cpu_count() or 4)
                fw_model = WhisperModel(selected_model, device="cpu", compute_type="int8", cpu_threads=num_threads)
                lang_arg = language if language and language != "auto" else None
                segments_gen, info = fw_model.transcribe(temp_wav, word_timestamps=True, language=lang_arg, beam_size=1)

                words = []
                segments = []
                for seg in segments_gen:
                    seg_words = []
                    for w in (seg.words or []):
                        word_entry = {
                            "word": w.word.strip(),
                            "start": round(w.start, 3),
                            "end": round(w.end, 3),
                            "confidence": round(w.probability, 2)
                        }
                        words.append(word_entry)
                        seg_words.append(word_entry)
                    segments.append({
                        "id": seg.id,
                        "start": round(seg.start, 3),
                        "end": round(seg.end, 3),
                        "text": seg.text.strip(),
                        "words": seg_words
                    })

                return {
                    "language": getattr(info, "language", "en") or "en",
                    "full_text": " ".join([s["text"] for s in segments]).strip(),
                    "segments": segments,
                    "words": words
                }
            except Exception as fw_err:
                print(f"[TRANSCRIPTION] faster-whisper fallback: {fw_err}, switching to reference whisper", flush=True)

        if HAS_OPENAI_WHISPER:
            model = whisper.load_model(selected_model)
            transcribe_kwargs = {
                "word_timestamps": True,
                "fp16": False,
                "verbose": False
            }
            if language and language != "auto":
                transcribe_kwargs["language"] = language

            result = model.transcribe(temp_wav, **transcribe_kwargs)

            words = []
            segments = []

            for seg in result.get("segments", []):
                seg_words = []
                for w in seg.get("words", []):
                    word_entry = {
                        "word": w.get("word", "").strip(),
                        "start": round(w.get("start", 0.0), 3),
                        "end": round(w.get("end", 0.0), 3),
                        "confidence": round(w.get("probability", 1.0), 2)
                    }
                    words.append(word_entry)
                    seg_words.append(word_entry)

                segments.append({
                    "id": seg.get("id"),
                    "start": round(seg.get("start", 0.0), 3),
                    "end": round(seg.get("end", 0.0), 3),
                    "text": seg.get("text", "").strip(),
                    "words": seg_words
                })

            return {
                "language": result.get("language", "en"),
                "full_text": result.get("text", "").strip(),
                "segments": segments,
                "words": words
            }

        raise RuntimeError("No Whisper engine available (faster-whisper or openai-whisper)")
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass
