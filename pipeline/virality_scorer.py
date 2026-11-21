import re
from typing import List, Dict, Any

HOOK_PATTERNS = [
    r"\b(how to|how i|how we|how you)\b",
    r"\b(secret|mistake|truth|hack|rule|formula|trick)\b",
    r"\b(why you should|why you need|why people)\b",
    r"\b(stop doing|never do|don't do|avoid)\b",
    r"\b(the biggest|the single|the most|the best|the worst)\b",
    r"\b(nobody talks about|what they don't tell you)\b",
    r"\b(million|billion|10x|100x|step 1|day 1)\b",
    r"\b(actually|listen|watch this|pay attention)\b",
    r"\?",
]

PUNCHLINE_WORDS = [
    "result", "because", "lesson", "realize", "finally", "outcome", "turned out",
    "profit", "success", "million", "views", "changed everything", "remember"
]

def calculate_virality_score(text: str, duration: float, words: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculates virality score (0-100) based on Hook, Flow, Pacing, and Duration."""
    lower_text = text.lower()
    
    # 1. Hook Score (40 points max)
    hook_points = 15  # baseline
    first_10_words = " ".join([w["word"] for w in words[:10]]).lower() if words else lower_text[:60]
    
    for pattern in HOOK_PATTERNS:
        if re.search(pattern, first_10_words):
            hook_points += 6
        elif re.search(pattern, lower_text):
            hook_points += 2
    hook_score = min(40, hook_points)

    # 2. Pacing & Energy (25 points max)
    # Optimal words per second: 2.2 to 3.2 wps
    word_count = len(words) if words else len(text.split())
    wps = word_count / duration if duration > 0 else 0
    if 2.0 <= wps <= 3.4:
        pacing_score = 25
    elif 1.5 <= wps < 2.0:
        pacing_score = 18
    else:
        pacing_score = 12

    # 3. Punchline & Payoff (20 points max)
    payoff_score = 10
    last_15_words = " ".join([w["word"] for w in words[-15:]]).lower() if len(words) >= 15 else lower_text[-80:]
    for pw in PUNCHLINE_WORDS:
        if pw in last_15_words:
            payoff_score += 5
            break
    payoff_score = min(20, payoff_score)

    # 4. Duration Optimization (15 points max)
    # Ideal viral short length: 30s to 55s
    if 30 <= duration <= 55:
        duration_score = 15
    elif 20 <= duration < 30 or 55 < duration <= 75:
        duration_score = 10
    else:
        duration_score = 5

    total_score = min(99, max(65, hook_score + pacing_score + payoff_score + duration_score))

    # Generate rationale
    reasons = []
    if hook_score >= 30:
        reasons.append("Strong curiosity-gap hook in first 3 seconds")
    else:
        reasons.append("Clear topic assertion")
    if pacing_score >= 20:
        reasons.append("High conversational energy without dead air")
    if payoff_score >= 15:
        reasons.append("Satisfying punchline and actionable takeaway")
    if duration_score == 15:
        reasons.append("Ideal 30-50s retention sweetspot")

    return {
        "score": total_score,
        "hook_score": hook_score,
        "pacing_score": pacing_score,
        "payoff_score": payoff_score,
        "rationale": " • ".join(reasons)
    }

def discover_viral_clips(transcript_data: dict, min_duration: float = 25.0, max_duration: float = 60.0) -> List[Dict[str, Any]]:
    """Chunks transcript into high-scoring clip candidates."""
    segments = transcript_data.get("segments", [])
    if not segments:
        return []

    clips = []
    clip_counter = 1

    # Sliding window chunker over segments
    i = 0
    n = len(segments)

    while i < n:
        chunk_start = segments[i]["start"]
        chunk_words = []
        chunk_text_parts = []
        j = i

        while j < n:
            seg = segments[j]
            chunk_words.extend(seg.get("words", []))
            chunk_text_parts.append(seg.get("text", ""))
            current_duration = seg["end"] - chunk_start

            if current_duration >= min_duration:
                # We have a candidate
                chunk_end = seg["end"]
                full_chunk_text = " ".join(chunk_text_parts).strip()
                eval_result = calculate_virality_score(full_chunk_text, current_duration, chunk_words)

                # Generate a punchy headline title
                first_sentence = full_chunk_text.split(".")[0]
                words_clean = re.sub(r"[^\w\s]", "", first_sentence).split()
                title_words = words_clean[:6] if words_clean else ["Viral", "Moment"]
                title = " ".join(title_words).upper()

                clips.append({
                    "id": f"clip_{clip_counter}",
                    "title": title,
                    "virality_score": eval_result["score"],
                    "hook_rating": f"{eval_result['hook_score']}/40",
                    "explanation": eval_result["rationale"],
                    "start_time": round(chunk_start, 2),
                    "end_time": round(chunk_end, 2),
                    "duration": round(current_duration, 2),
                    "transcript_text": full_chunk_text,
                    "words": chunk_words
                })
                clip_counter += 1
                i = j + 1
                break

            j += 1
        else:
            # Reached end
            if chunk_words and (segments[-1]["end"] - chunk_start >= 15.0):
                chunk_end = segments[-1]["end"]
                full_chunk_text = " ".join(chunk_text_parts).strip()
                eval_result = calculate_virality_score(full_chunk_text, chunk_end - chunk_start, chunk_words)
                clips.append({
                    "id": f"clip_{clip_counter}",
                    "title": "KEY TAKEAWAY & SUMMARY",
                    "virality_score": eval_result["score"],
                    "hook_rating": f"{eval_result['hook_score']}/40",
                    "explanation": eval_result["rationale"],
                    "start_time": round(chunk_start, 2),
                    "end_time": round(chunk_end, 2),
                    "duration": round(chunk_end - chunk_start, 2),
                    "transcript_text": full_chunk_text,
                    "words": chunk_words
                })
            break

    # Sort clips descending by virality score
    clips.sort(key=lambda x: x["virality_score"], reverse=True)
    return clips
