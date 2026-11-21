import os
import sys
import json
import re
import math
import subprocess
import wave
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

# Style Presets and their Rubric Weight distributions
STYLE_PRESET_WEIGHTS = {
    "default": {
        "hook_strength": 0.30,
        "emotional_intensity": 0.20,
        "story_completeness": 0.20,
        "value_density": 0.15,
        "shareability": 0.10,
        "clarity": 0.05
    },
    "educational": {
        "value_density": 0.35,
        "hook_strength": 0.25,
        "story_completeness": 0.20,
        "clarity": 0.10,
        "shareability": 0.05,
        "emotional_intensity": 0.05
    },
    "funny": {
        "emotional_intensity": 0.40,
        "hook_strength": 0.25,
        "shareability": 0.20,
        "story_completeness": 0.10,
        "clarity": 0.05,
        "value_density": 0.00
    },
    "storytelling": {
        "story_completeness": 0.35,
        "emotional_intensity": 0.25,
        "hook_strength": 0.20,
        "value_density": 0.10,
        "shareability": 0.05,
        "clarity": 0.05
    },
    "controversial": {
        "emotional_intensity": 0.35,
        "hook_strength": 0.30,
        "shareability": 0.20,
        "value_density": 0.10,
        "story_completeness": 0.05,
        "clarity": 0.00
    },
    "inspirational": {
        "emotional_intensity": 0.35,
        "value_density": 0.25,
        "hook_strength": 0.20,
        "shareability": 0.10,
        "story_completeness": 0.10,
        "clarity": 0.00
    }
}

# Filler patterns to trim from the opening of candidates
LEADING_FILLER_PATTERNS = [
    r"^(so|um|uh|like|and|yeah|well|ok|okay|right|now)\b",
    r"^(you know|i mean|so like|and so|you see)\b",
]

# Fluff, housekeeping, and sponsor indicators to drop immediately
FLUFF_INDICATORS = [
    "like and subscribe", "subscribe to the channel", "leave a comment below",
    "check the link in the description", "brought to you by", "today's sponsor",
    "our sponsor", "welcome back to the channel", "welcome back to the podcast",
    "welcome to the show", "thanks for watching", "see you guys next week",
    "hit that notification bell", "hit the bell", "patreon link", "merch in the bio",
    "can you hear me", "let me check my notes", "audio check", "housekeeping"
]

# Pronoun / hanging conjunction patterns that lack standalone context
BAD_OPENER_PATTERN = re.compile(
    r"^(this|that|these|those|he said|she said|they said|they were|he was|she was|"
    r"and then|so then|because of that|which means|which is why|like i said|as i said|"
    r"and also|or even|but then)\b",
    re.IGNORECASE
)

# Hook trigger phrases
HOOK_TRIGGERS = [
    r"\b(how to|how i|how we|how you)\b",
    r"\b(secret|mistake|truth|hack|rule|formula|trick|lie|trap)\b",
    r"\b(why you should|why you need|why people|why nobody)\b",
    r"\b(stop doing|never do|don't do|avoid this)\b",
    r"\b(the biggest|the single|the most|the best|the worst|the number one)\b",
    r"\b(nobody talks about|what they don't tell you|the real reason)\b",
    r"\b(million|billion|thousand|\$\d+|\d+x|\d+ percent|\d+ years)\b",
    r"\b(actually|listen|watch this|pay attention|crazy|insane|blew my mind)\b",
    r"\b(one day|when i started|i remember when|years ago|my mentor)\b",
]

# Payoff / Punchline markers
PAYOFF_MARKERS = [
    "result", "because", "lesson", "realize", "finally", "outcome", "turned out",
    "profit", "success", "changed", "remember", "means", "takeaway", "conclusion",
    "so that's why", "that's how", "the difference", "the key"
]


def extract_sentence_units(words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Groups word-level timestamps into clean sentence-level units based on
    punctuation (. ? ! ...) or conversational pause gaps (>= 0.65s).
    """
    if not words:
        return []

    sentences = []
    current_words = []

    for i, w in enumerate(words):
        current_words.append(w)
        txt = str(w.get("word", "")).strip()
        is_punct = any(txt.endswith(p) for p in [".", "?", "!", "..."])
        
        is_pause = False
        if i < len(words) - 1:
            next_start = float(words[i + 1].get("start", 0.0))
            curr_end = float(w.get("end", 0.0))
            if (next_start - curr_end) >= 0.65:
                is_pause = True

        if is_punct or is_pause or i == len(words) - 1:
            s_text = " ".join(str(x.get("word", "")) for x in current_words).strip()
            if len(s_text) > 2:
                s_start = float(current_words[0].get("start", 0.0))
                s_end = float(current_words[-1].get("end", 0.0))
                dur = max(0.1, s_end - s_start)
                sentences.append({
                    "id": len(sentences),
                    "text": s_text,
                    "start": round(s_start, 3),
                    "end": round(s_end, 3),
                    "duration": round(dur, 3),
                    "words": current_words,
                    "is_question": "?" in s_text,
                    "wpm": round((len(current_words) / dur) * 60.0, 1)
                })
            current_words = []

    return sentences


def trim_leading_fillers(words: List[Dict[str, Any]], text: str) -> Tuple[List[Dict[str, Any]], str, float]:
    """
    Trims leading conversational filler tokens ('so', 'um', 'like', 'and', etc.)
    so the clip opens directly on substantive speech, updating words, text, and start time.
    """
    trimmed_words = list(words)
    filler_tokens = {
        "so", "um", "uh", "like", "and", "yeah", "well", "ok", "okay",
        "right", "now", "you know", "i mean", "so like", "and so", "you see"
    }

    iterations = 0
    while len(trimmed_words) > 2 and iterations < 4:
        first_w = str(trimmed_words[0].get("word", "")).strip().lower()
        clean_w = re.sub(r"[^\w]", "", first_w)
        if clean_w in filler_tokens:
            trimmed_words.pop(0)
            iterations += 1
        elif len(trimmed_words) >= 2:
            two_words = f"{clean_w} {re.sub(r'[^\w]', '', str(trimmed_words[1].get('word', '')).strip().lower())}"
            if two_words in filler_tokens:
                trimmed_words.pop(0)
                trimmed_words.pop(0)
                iterations += 1
            else:
                break
        else:
            break

    if trimmed_words:
        new_start = float(trimmed_words[0].get("start", 0.0))
        trimmed_text = " ".join(str(w.get("word", "")) for w in trimmed_words).strip()
    else:
        new_start = 0.0
        trimmed_text = text.strip()

    return trimmed_words, trimmed_text, new_start


def get_audio_rms_profile(video_path: str, cache_dir: Optional[str] = None) -> np.ndarray:
    """
    Extracts 1-second RMS audio energy bins across video duration.
    Cached per video file to make repeated discovery instant.
    """
    if not os.path.exists(video_path):
        return np.array([], dtype=np.float32)

    stem = Path(video_path).stem
    c_dir = cache_dir or os.path.join(os.path.dirname(os.path.abspath(video_path)), "..", "..", "cache", "audio")
    os.makedirs(c_dir, exist_ok=True)
    cache_file = os.path.join(c_dir, f"{stem}_rms.npy")

    if os.path.exists(cache_file):
        try:
            return np.load(cache_file)
        except Exception:
            pass

    temp_wav = os.path.join(c_dir, f"{stem}_temp.wav")
    cmd = [
        "ffmpeg", "-y",
        "-i", os.path.abspath(video_path),
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
        temp_wav
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if not os.path.exists(temp_wav):
        return np.array([], dtype=np.float32)

    try:
        with wave.open(temp_wav, "rb") as wf:
            n_frames = wf.getnframes()
            raw = wf.readframes(n_frames)
            data = np.frombuffer(raw, dtype=np.int16).astype(np.float32)

        bin_size = 16000
        n_bins = int(len(data) // bin_size)
        if n_bins == 0:
            return np.array([], dtype=np.float32)

        truncated = data[:n_bins * bin_size].reshape(n_bins, bin_size)
        rms_bins = np.sqrt(np.mean(truncated ** 2, axis=1)).astype(np.float32)

        try:
            np.save(cache_file, rms_bins)
        except Exception:
            pass

        return rms_bins
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass


def compute_tfidf_vectors(texts: List[str]) -> np.ndarray:
    """Computes pure-NumPy TF-IDF vectors for semantic cosine diversity."""
    tokenized = [[w.lower() for w in re.findall(r"\b[a-zA-Z]{3,}\b", t)] for t in texts]
    vocab = sorted(list(set(w for doc in tokenized for w in doc)))
    if not vocab:
        return np.zeros((len(texts), 1), dtype=np.float32)
    word2idx = {w: i for i, w in enumerate(vocab)}

    n_docs = len(texts)
    n_words = len(vocab)
    tf = np.zeros((n_docs, n_words), dtype=np.float32)
    df = np.zeros(n_words, dtype=np.float32)

    for d_idx, doc in enumerate(tokenized):
        if not doc:
            continue
        unique_words = set(doc)
        for w in unique_words:
            df[word2idx[w]] += 1
        for w in doc:
            tf[d_idx, word2idx[w]] += 1

    tf = np.log1p(tf)
    idf = np.log((n_docs + 1.0) / (df + 1.0)) + 1.0
    tfidf = tf * idf
    norms = np.linalg.norm(tfidf, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return tfidf / norms


def generate_candidate_segments(
    sentences: List[Dict[str, Any]],
    min_duration: float = 20.0,
    max_duration: float = 90.0,
    target_candidates: int = 35,
    rms_profile: Optional[np.ndarray] = None,
    user_prompt: str = ""
) -> List[Dict[str, Any]]:
    """
    STAGE 1: Candidate Generation (Recall).
    Generates 20-40 candidate segments snapped to sentence boundaries,
    anchored on Q&A pairs, strong hook triggers, audio energy peaks, and high-pacing spikes.
    """
    if not sentences:
        return []

    candidates = []
    n_sentences = len(sentences)

    # 1. Anchor indices to evaluate
    anchor_indices = set()

    # (a) Question sentences (Q&A pairs)
    for i, s in enumerate(sentences):
        if s["is_question"]:
            anchor_indices.add(i)

    # (b) Strong statement & hook patterns
    for i, s in enumerate(sentences):
        lower_s = s["text"].lower()
        for pat in HOOK_TRIGGERS:
            if re.search(pat, lower_s):
                anchor_indices.add(i)
                break

    # (c) Audio Energy Peaks (if RMS profile available)
    if rms_profile is not None and len(rms_profile) > 0:
        high_threshold = np.percentile(rms_profile, 85)
        for i, s in enumerate(sentences):
            start_sec = int(s["start"])
            end_sec = min(len(rms_profile) - 1, int(s["end"]))
            if start_sec <= end_sec:
                if np.max(rms_profile[start_sec:end_sec + 1]) >= high_threshold:
                    anchor_indices.add(i)

    # (d) Speech-rate spikes (>160 WPM)
    for i, s in enumerate(sentences):
        if s["wpm"] >= 160.0:
            anchor_indices.add(i)

    # (e) User Prompt keywords
    if user_prompt.strip():
        keywords = [k.lower() for k in re.findall(r"\b\w{3,}\b", user_prompt)]
        for i, s in enumerate(sentences):
            lower_s = s["text"].lower()
            if any(k in lower_s for k in keywords):
                anchor_indices.add(i)

    # (f) Stride coverage fallback across video
    step = max(3, n_sentences // 25)
    for idx in range(0, n_sentences, step):
        anchor_indices.add(idx)

    # Build 1-2 optimal candidate duration windows per anchor (25-45 candidates total)
    for start_idx in sorted(list(anchor_indices)):
        if start_idx >= n_sentences:
            continue

        raw_words = sentences[start_idx]["words"]
        raw_text = sentences[start_idx]["text"]
        trimmed_words, trimmed_text, actual_start = trim_leading_fillers(raw_words, raw_text)

        accumulated_words = list(trimmed_words)
        curr_text_parts = [trimmed_text]
        curr_start = actual_start
        found_primary_window = False

        for end_idx in range(start_idx, n_sentences):
            if end_idx > start_idx:
                accumulated_words.extend(sentences[end_idx]["words"])
                curr_text_parts.append(sentences[end_idx]["text"])

            curr_end = sentences[end_idx]["end"]
            curr_dur = curr_end - curr_start

            # Check if within duration window
            if curr_dur >= min_duration:
                # Primary sweetspot window (25s - 52s)
                if not found_primary_window:
                    full_text = " ".join(curr_text_parts).strip()
                    candidates.append({
                        "start_time": curr_start,
                        "end_time": curr_end,
                        "duration": round(curr_dur, 2),
                        "text": full_text,
                        "words": list(accumulated_words),
                        "start_sentence_idx": start_idx,
                        "end_sentence_idx": end_idx
                    })
                    found_primary_window = True
                # Secondary extended window (55s - 75s) if narrative payoff extends
                elif curr_dur >= 55.0 and curr_dur <= max_duration:
                    full_text = " ".join(curr_text_parts).strip()
                    candidates.append({
                        "start_time": curr_start,
                        "end_time": curr_end,
                        "duration": round(curr_dur, 2),
                        "text": full_text,
                        "words": list(accumulated_words),
                        "start_sentence_idx": start_idx,
                        "end_sentence_idx": end_idx
                    })
                    break

            if curr_dur > max_duration:
                break

    return candidates


def apply_hard_filters(
    candidates: List[Dict[str, Any]],
    min_duration: float = 20.0,
    max_duration: float = 90.0
) -> List[Dict[str, Any]]:
    """
    STAGE 2: Hard Filters (Drop Bad Candidates).
    Drops candidates that:
    - Need earlier context to make sense (bad pronoun opener)
    - Lack clear payoff or end abruptly mid-thought
    - Contain housekeeping, sponsor reads, or filler
    - Fall outside configured duration bounds
    """
    filtered = []
    seen_boundaries = set()

    for cand in candidates:
        dur = cand["duration"]
        if dur < min_duration or dur > max_duration:
            continue

        text = cand["text"].strip()
        lower_text = text.lower()

        # 1. Filter boundary duplicate
        boundary_key = (round(cand["start_time"], 1), round(cand["end_time"], 1))
        if boundary_key in seen_boundaries:
            continue
        seen_boundaries.add(boundary_key)

        # 2. Check pronoun / lack of context opening
        if BAD_OPENER_PATTERN.search(text):
            continue

        # 3. Check for Fluff, Housekeeping, or Sponsors
        if any(fluff in lower_text for fluff in FLUFF_INDICATORS):
            continue

        # 4. Check for incomplete ending / trailing sentence
        last_word = text.split()[-1] if text.split() else ""
        if last_word.lower() in ["and", "or", "because", "so", "but", "which", "like"]:
            continue
        # If candidate ends in a question without answering it, drop
        if text.endswith("?") and "?" not in text[:-1]:
            continue

        # 5. Check lexical diversity (unique words / total words >= 0.38)
        tokens = [t.lower() for t in text.split()]
        if len(tokens) >= 15:
            diversity = len(set(tokens)) / len(tokens)
            if diversity < 0.38:
                continue

        filtered.append(cand)

    return filtered


def generate_punchy_title_and_hook(text: str) -> Tuple[str, str, str]:
    """Generates punchy 3-6 word all-caps title, 1-line reason, and suggested hook."""
    clean = re.sub(r"[^\w\s]", "", text)
    words = clean.split()

    # Title extraction
    title_words = words[:6] if len(words) >= 6 else words
    title = " ".join(title_words).upper()
    if len(title) > 40:
        title = title[:40].rsplit(" ", 1)[0]

    # Generate 1-line reason based on content signals
    lower = text.lower()
    if any(re.search(p, lower) for p in HOOK_TRIGGERS[:4]):
        reason = "Opens with a high-curiosity viral hook that creates an instant gap."
    elif any(p in lower for p in PAYOFF_MARKERS[:4]):
        reason = "Delivers a cohesive takeaway with clear payoff and high retention."
    elif re.search(r"\b(million|billion|\$\d+|\d+x)\b", lower):
        reason = "Features concrete metrics and high-stakes proof points."
    else:
        reason = "Strong standalone narrative arc with engaging delivery."

    # Suggested improved hook line
    first_sentence = text.split(".")[0].split("?")[0].strip()
    suggested_hook = f"Here is the truth: {first_sentence}" if len(first_sentence) < 60 else first_sentence

    return title, reason, suggested_hook


def score_candidates(
    candidates: List[Dict[str, Any]],
    style_preset: str = "default",
    user_prompt: str = "",
    rms_profile: Optional[np.ndarray] = None,
    video_duration: float = 1200.0
) -> List[Dict[str, Any]]:
    """
    STAGE 3: Scoring (Precision).
    Evaluates 0-10 on:
    1. hook_strength
    2. emotional_intensity
    3. story_completeness
    4. value_density
    5. shareability
    6. clarity
    Combines LLM Rubric Score (70%) with Measurable Signal Score (30%).
    """
    weights = STYLE_PRESET_WEIGHTS.get(style_preset.lower(), STYLE_PRESET_WEIGHTS["default"])
    prompt_keywords = [k.lower() for k in re.findall(r"\b\w{3,}\b", user_prompt)] if user_prompt.strip() else []

    scored = []

    for cand in candidates:
        text = cand["text"]
        lower = text.lower()
        duration = cand["duration"]
        words = cand["words"]

        # --- 1. Hook Strength (0 - 10) ---
        first_15_words = " ".join([w.get("word", "") for w in words[:15]]).lower()
        hook_pts = 4.0
        for pat in HOOK_TRIGGERS:
            if re.search(pat, first_15_words):
                hook_pts += 1.8
            elif re.search(pat, lower):
                hook_pts += 0.5
        if "?" in first_15_words:
            hook_pts += 1.5
        hook_strength = min(10.0, max(2.0, hook_pts))

        # --- 2. Emotional Intensity (0 - 10) ---
        emotion_pts = 4.5
        if any(w in lower for w in ["insane", "crazy", "shocking", "worst", "unbelievable", "huge", "massive", "hate", "love"]):
            emotion_pts += 2.0
        if "!" in text:
            emotion_pts += 1.2
        # Audio energy spike inside clip
        if rms_profile is not None and len(rms_profile) > 0:
            s_sec = int(cand["start_time"])
            e_sec = min(len(rms_profile) - 1, int(cand["end_time"]))
            if s_sec <= e_sec:
                clip_max_rms = np.max(rms_profile[s_sec:e_sec + 1])
                overall_rms_80 = np.percentile(rms_profile, 80)
                if clip_max_rms >= overall_rms_80:
                    emotion_pts += 2.2
        emotional_intensity = min(10.0, max(2.0, emotion_pts))

        # --- 3. Story Completeness (0 - 10) ---
        story_pts = 5.0
        last_20_words = " ".join([w.get("word", "") for w in words[-20:]]).lower()
        for pw in PAYOFF_MARKERS:
            if pw in last_20_words:
                story_pts += 1.5
                break
        if text.endswith(".") or text.endswith("!"):
            story_pts += 1.5
        if cand.get("start_sentence_idx") != cand.get("end_sentence_idx"):
            story_pts += 1.0
        story_completeness = min(10.0, max(3.0, story_pts))

        # --- 4. Value Density (0 - 10) ---
        value_pts = 4.0
        if re.search(r"\b(\$\d+|\d+ percent|\d+x|step \d+|rule \d+|day \d+)\b", lower):
            value_pts += 2.5
        if any(w in lower for w in ["strategy", "framework", "system", "mistake", "secret", "formula", "principle", "advice"]):
            value_pts += 2.0
        value_density = min(10.0, max(2.0, value_pts))

        # --- 5. Shareability (0 - 10) ---
        share_pts = 4.5
        if any(w in lower for w in ["everyone", "people", "nobody", "friend", "money", "life", "future", "career"]):
            share_pts += 2.0
        if hook_strength >= 7.5 and story_completeness >= 7.0:
            share_pts += 1.5
        shareability = min(10.0, max(2.0, share_pts))

        # --- 6. Clarity (0 - 10) ---
        wpm = (len(words) / duration) * 60.0
        clarity_pts = 8.0 if (125.0 <= wpm <= 185.0) else 6.0
        clarity = min(10.0, max(4.0, clarity_pts))

        # Weighted LLM Rubric Score (0 - 100)
        rubric_score_raw = (
            hook_strength * weights["hook_strength"] +
            emotional_intensity * weights["emotional_intensity"] +
            story_completeness * weights["story_completeness"] +
            value_density * weights["value_density"] +
            shareability * weights["shareability"] +
            clarity * weights["clarity"]
        )
        rubric_score_100 = rubric_score_raw * 10.0

        # User Prompt Relevance Bonus (up to +15 points)
        if prompt_keywords:
            matches = sum(1 for kw in prompt_keywords if kw in lower)
            if matches > 0:
                bonus = min(15.0, matches * 5.0)
                rubric_score_100 = min(99.0, rubric_score_100 + bonus)

        # Measurable Signal Score (30% weight)
        # Combines RMS energy & pacing sweetspot (30s - 55s)
        signal_score = 70.0
        if 25.0 <= duration <= 55.0:
            signal_score += 15.0
        elif 20.0 <= duration < 25.0 or 55.0 < duration <= 75.0:
            signal_score += 8.0

        if rms_profile is not None and len(rms_profile) > 0:
            s_sec = int(cand["start_time"])
            e_sec = min(len(rms_profile) - 1, int(cand["end_time"]))
            if s_sec <= e_sec:
                mean_energy = np.mean(rms_profile[s_sec:e_sec + 1])
                overall_median = np.median(rms_profile)
                if mean_energy >= overall_median:
                    signal_score += 15.0

        signal_score = min(100.0, signal_score)

        # Final Score: 70% Rubric + 30% Signal
        final_score = int(round(0.70 * rubric_score_100 + 0.30 * signal_score))
        final_score = max(50, min(99, final_score))

        title, reason, suggested_hook = generate_punchy_title_and_hook(text)

        cand_copy = dict(cand)
        cand_copy["virality_score"] = final_score
        cand_copy["rubric"] = {
            "hook_strength": round(hook_strength, 1),
            "emotional_intensity": round(emotional_intensity, 1),
            "story_completeness": round(story_completeness, 1),
            "value_density": round(value_density, 1),
            "shareability": round(shareability, 1),
            "clarity": round(clarity, 1)
        }
        cand_copy["title"] = title
        cand_copy["reason"] = reason
        cand_copy["suggested_hook"] = suggested_hook
        cand_copy["hook_rating"] = f"Hook {hook_strength:.1f}/10"
        cand_copy["explanation"] = f"{reason} • Story {story_completeness:.1f}/10 • Emotion {emotional_intensity:.1f}/10"

        scored.append(cand_copy)

    # Sort descending by final score
    scored.sort(key=lambda x: x["virality_score"], reverse=True)
    return scored


def deduplicate_and_diversify(
    scored_candidates: List[Dict[str, Any]],
    overlap_threshold: float = 0.30,
    cosine_threshold: float = 0.72
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    STAGE 4: Dedupe & Diversity.
    1. Temporal Non-Max Suppression (NMS): Drops candidates with > 30% time overlap,
       keeping the higher scoring moment.
    2. Semantic Diversity: Drops candidates with > 72% TF-IDF cosine similarity,
       ensuring diverse topics across the video.
    Returns (accepted_candidates, rejected_or_suppressed_candidates).
    """
    if not scored_candidates:
        return [], []

    # Sort by score descending
    sorted_candidates = sorted(scored_candidates, key=lambda x: x["virality_score"], reverse=True)

    # 1. Temporal Non-Max Suppression
    time_filtered = []
    suppressed = []

    for cand in sorted_candidates:
        s1 = cand["start_time"]
        e1 = cand["end_time"]
        d1 = cand["duration"]
        has_overlap = False

        for accepted in time_filtered:
            s2 = accepted["start_time"]
            e2 = accepted["end_time"]
            d2 = accepted["duration"]

            # Compute intersection
            inter_start = max(s1, s2)
            inter_end = min(e1, e2)
            if inter_end > inter_start:
                intersection = inter_end - inter_start
                overlap_ratio = max(intersection / d1, intersection / d2)
                if overlap_ratio > overlap_threshold:
                    has_overlap = True
                    suppressed.append(cand)
                    break

        if not has_overlap:
            time_filtered.append(cand)

    # 2. Semantic Diversity via TF-IDF Vectors
    if len(time_filtered) <= 1:
        return time_filtered, suppressed

    texts = [c["text"] for c in time_filtered]
    tfidf_matrix = compute_tfidf_vectors(texts)

    diverse_candidates = []
    semantic_suppressed = []

    for idx, cand in enumerate(time_filtered):
        vec = tfidf_matrix[idx]
        is_duplicate = False

        for div_idx, div_cand in enumerate(diverse_candidates):
            prev_vec = tfidf_matrix[time_filtered.index(div_cand)]
            sim = float(np.dot(vec, prev_vec))
            if sim > cosine_threshold:
                is_duplicate = True
                semantic_suppressed.append(cand)
                break

        if not is_duplicate:
            diverse_candidates.append(cand)

    all_suppressed = suppressed + semantic_suppressed
    return diverse_candidates, all_suppressed


def select_best_moments(
    transcript_data: Dict[str, Any],
    video_path: Optional[str] = None,
    min_duration: float = 20.0,
    max_duration: float = 90.0,
    target_clip_count: int = 8,
    min_score: float = 65.0,
    style_preset: str = "default",
    user_prompt: str = "",
    padding: float = 0.3
) -> Dict[str, Any]:
    """
    STAGE 1-5 End-to-End Execution:
    Returns the top 5-10 high quality clips (strictly <= target_clip_count),
    along with 'also_considered' candidates for manual inspection.
    """
    words = transcript_data.get("words", [])
    if not words:
        # Fallback to segments if words array is empty
        for seg in transcript_data.get("segments", []):
            words.extend(seg.get("words", []))

    if not words:
        return {"clips": [], "also_considered": []}

    # Extract audio profile if video file is provided
    rms_profile = None
    if video_path and os.path.exists(video_path):
        try:
            rms_profile = get_audio_rms_profile(video_path)
        except Exception:
            rms_profile = None

    # Stage 1: Candidate Generation
    sentences = extract_sentence_units(words)
    candidates = generate_candidate_segments(
        sentences=sentences,
        min_duration=min_duration,
        max_duration=max_duration,
        rms_profile=rms_profile,
        user_prompt=user_prompt
    )

    # Stage 2: Hard Filters
    valid_candidates = apply_hard_filters(
        candidates=candidates,
        min_duration=min_duration,
        max_duration=max_duration
    )

    # Stage 3: Scoring & Precision
    scored_candidates = score_candidates(
        candidates=valid_candidates,
        style_preset=style_preset,
        user_prompt=user_prompt,
        rms_profile=rms_profile
    )

    # Stage 4: Deduplicate & Diversify
    diverse_candidates, suppressed = deduplicate_and_diversify(
        scored_candidates=scored_candidates,
        overlap_threshold=0.15,
        cosine_threshold=0.72
    )

    # Stage 5: Selection
    # Apply min_score filter
    passing = [c for c in diverse_candidates if c["virality_score"] >= min_score]
    # If fewer than 5 pass min_score, take the top 5 anyway if available
    if len(passing) < min(5, len(diverse_candidates)):
        passing = diverse_candidates[:min(5, len(diverse_candidates))]

    # Cap to target_clip_count (default 8, 5-10 range)
    top_clips = passing[:target_clip_count]
    also_considered = passing[target_clip_count:target_clip_count + 8] + suppressed[:5]

    # Finalize clip structures with IDs and padded boundaries
    final_clips = []
    for idx, c in enumerate(top_clips):
        # Snap start and end with 0.3s padding
        p_start = max(0.0, round(c["start_time"] - padding, 2))
        p_end = round(c["end_time"] + padding, 2)
        p_dur = round(p_end - p_start, 2)

        clip_item = {
            "id": f"clip_{idx + 1}",
            "rank": idx + 1,
            "title": c["title"],
            "virality_score": c["virality_score"],
            "hook_rating": c["hook_rating"],
            "explanation": c["explanation"],
            "reason": c["reason"],
            "suggested_hook": c["suggested_hook"],
            "rubric": c["rubric"],
            "start_time": p_start,
            "end_time": p_end,
            "duration": p_dur,
            "transcript_text": c["text"],
            "words": c["words"],
            "style_preset": style_preset
        }
        final_clips.append(clip_item)

    # Prepare also considered items
    formatted_also_considered = []
    for idx, ac in enumerate(also_considered):
        formatted_also_considered.append({
            "id": f"alt_{idx + 1}",
            "title": ac["title"],
            "virality_score": ac["virality_score"],
            "reason": ac["reason"],
            "rubric": ac.get("rubric", {}),
            "start_time": ac["start_time"],
            "end_time": ac["end_time"],
            "duration": ac["duration"],
            "transcript_text": ac["text"][:120] + "..."
        })

    return {
        "clips": final_clips,
        "also_considered": formatted_also_considered,
        "metadata": {
            "total_sentences": len(sentences),
            "generated_candidates": len(candidates),
            "passed_hard_filters": len(valid_candidates),
            "selected_count": len(final_clips),
            "style_preset": style_preset,
            "target_clip_count": target_clip_count,
            "min_score": min_score
        }
    }
