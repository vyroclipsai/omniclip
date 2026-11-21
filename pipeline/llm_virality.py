import os
import json
import re
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional

try:
    from pipeline.logger import emit_log
    from pipeline.virality_scorer import discover_viral_clips as fallback_discover_clips
except ImportError:
    from logger import emit_log
    from virality_scorer import discover_viral_clips as fallback_discover_clips

CLIP_CANDIDATE_SYSTEM_PROMPT = """You are an elite viral short-form video editor (YouTube Shorts, TikTok, Instagram Reels).
Your mission is to analyze the video transcript and identify the top 5 to 10 most viral, high-retention clip candidates.

CRITERIA FOR VIRAL CLIPS:
1. Duration: strictly between 15 and 90 seconds (end - start).
2. Strong Hook: The first 3 seconds must grab attention immediately (curiosity gap, surprising statement, contrarian view, or high energy).
3. Standalone Context: The viewer must understand the concept without having watched the whole video.
4. Complete Thought: Clear beginning and satisfying punchline/payoff. Never cut in the middle of a sentence.
5. Virality Score: Rate each clip from 60 to 99 based on hook strength, storytelling, and emotional resonance.

OUTPUT FORMAT:
You must respond with ONLY valid JSON with this exact structure:
{
  "clips": [
    {
      "start": 124.5,
      "end": 168.0,
      "title": "PUNCHY 3-6 WORD ALL CAPS HEADLINE",
      "hook": "Why the opening 3 seconds hook the viewer",
      "reason": "Why this snippet will retain 90%+ attention and drive shares",
      "virality_score": 92
    }
  ]
}
"""

def _format_seconds(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"

def _build_transcript_text(transcript_data: Dict[str, Any]) -> str:
    segments = transcript_data.get("segments", [])
    lines = []
    for s in segments:
        start_str = _format_seconds(s.get("start", 0.0))
        lines.append(f"[{start_str} - {s.get('start', 0.0):.1f}s] {s.get('text', '').strip()}")
    return "\n".join(lines)

def _call_openai(api_key: str, transcript_summary: str, retry: bool = False) -> Optional[dict]:
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": CLIP_CANDIDATE_SYSTEM_PROMPT},
            {"role": "user", "content": f"Here is the timestamped transcript:\n\n{transcript_summary}\n\nSelect the 5-10 best viral short clips in valid JSON format."}
        ],
        "temperature": 0.2 if retry else 0.4,
        "response_format": {"type": "json_object"}
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=45) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        content = res["choices"][0]["message"]["content"]
        return json.loads(content)

def _call_gemini(api_key: str, transcript_summary: str, retry: bool = False) -> Optional[dict]:
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    payload = {
        "system_instruction": {"parts": [{"text": CLIP_CANDIDATE_SYSTEM_PROMPT}]},
        "contents": [
            {
                "parts": [
                    {"text": f"Here is the timestamped transcript:\n\n{transcript_summary}\n\nSelect the 5-10 best viral short clips in valid JSON format."}
                ]
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2 if retry else 0.4
        }
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=45) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        candidate = res["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(candidate)

def _validate_and_sanitize_clips(raw_data: Any, min_duration: float, max_duration: float) -> List[Dict[str, Any]]:
    if not isinstance(raw_data, dict) or "clips" not in raw_data or not isinstance(raw_data["clips"], list):
        raise ValueError("Response must be an object with a 'clips' array")
    
    valid_clips = []
    for item in raw_data["clips"]:
        if not isinstance(item, dict):
            continue
        try:
            start = float(item["start"])
            end = float(item["end"])
            duration = end - start
            if duration < min_duration or duration > max_duration:
                continue
            
            title = str(item.get("title", "VIRAL MOMENT")).strip().upper()
            hook = str(item.get("hook", "High interest opening")).strip()
            reason = str(item.get("reason", "Engaging insight")).strip()
            score = int(item.get("virality_score", 85))
            score = max(60, min(99, score))
            
            valid_clips.append({
                "start_time": round(start, 2),
                "end_time": round(end, 2),
                "duration": round(duration, 2),
                "title": title,
                "hook_rating": hook,
                "explanation": f"{hook} • {reason}",
                "virality_score": score
            })
        except (ValueError, TypeError, KeyError):
            continue
            
    if not valid_clips:
        raise ValueError("No valid clips passed duration and structure criteria")
        
    return valid_clips

def _attach_words_and_text(clips: List[Dict[str, Any]], transcript_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Attaches word-level timestamps and slice transcript text to each LLM clip."""
    all_words = []
    for seg in transcript_data.get("segments", []):
        all_words.extend(seg.get("words", []))
        
    enriched = []
    for idx, c in enumerate(clips):
        start = c["start_time"]
        end = c["end_time"]
        
        clip_words = [w for w in all_words if w.get("end", 0.0) >= start and w.get("start", 0.0) <= end]
        transcript_text = " ".join([w.get("word", "") for w in clip_words]).strip()
        
        enriched.append({
            "id": f"clip_{idx + 1}",
            "title": c["title"],
            "virality_score": c["virality_score"],
            "hook_rating": c["hook_rating"],
            "explanation": c["explanation"],
            "start_time": start,
            "end_time": end,
            "duration": c["duration"],
            "transcript_text": transcript_text,
            "words": clip_words
        })
        
    enriched.sort(key=lambda x: x["virality_score"], reverse=True)
    return enriched

def discover_viral_clips_llm(
    transcript_data: Dict[str, Any],
    min_duration: float = 15.0,
    max_duration: float = 90.0,
    max_clips: int = 10,
    job_id: str = "cli"
) -> List[Dict[str, Any]]:
    """
    Identifies high-virality clips using OpenAI or Gemini LLM with strict validation
    and 1 automatic retry on malformed output, cleanly falling back to the local
    heuristic model if no API key is set.
    """
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    
    if not openai_key and not gemini_key:
        emit_log(
            "INFO",
            "No LLM API keys provided (OPENAI_API_KEY / GEMINI_API_KEY). Running local high-precision virality heuristic model.",
            job_id=job_id,
            step="analyzing",
            progress=45
        )
        return fallback_discover_clips(transcript_data, min_duration=min_duration, max_duration=max_duration)
    
    provider = "OpenAI" if openai_key else "Gemini"
    emit_log(
        "INFO",
        f"Querying {provider} LLM for top viral candidate selection with hook and payoff analysis...",
        job_id=job_id,
        step="analyzing",
        progress=45
    )
    
    transcript_text = _build_transcript_text(transcript_data)
    
    # Attempt 1
    raw_response = None
    for attempt in range(2):
        try:
            is_retry = (attempt == 1)
            if openai_key:
                raw_response = _call_openai(openai_key, transcript_text, retry=is_retry)
            else:
                raw_response = _call_gemini(gemini_key, transcript_text, retry=is_retry)
                
            validated = _validate_and_sanitize_clips(raw_response, min_duration, max_duration)
            enriched = _attach_words_and_text(validated[:max_clips], transcript_data)
            emit_log(
                "INFO",
                f"Successfully identified {len(enriched)} viral clips via {provider} LLM.",
                job_id=job_id,
                step="analyzing",
                progress=55
            )
            return enriched
        except Exception as e:
            emit_log(
                "WARNING" if attempt == 0 else "ERROR",
                f"LLM clip discovery attempt {attempt + 1} failed: {e}",
                job_id=job_id,
                step="analyzing"
            )
            if attempt == 1:
                emit_log(
                    "WARNING",
                    "Falling back to local heuristic virality model after LLM retry exhaustion.",
                    job_id=job_id,
                    step="analyzing"
                )
                return fallback_discover_clips(transcript_data, min_duration=min_duration, max_duration=max_duration)
                
    return fallback_discover_clips(transcript_data, min_duration=min_duration, max_duration=max_duration)
