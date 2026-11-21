import os
import re
from typing import List, Dict, Any, Optional

EMOJI_KEYWORDS = {
    # Wealth & Money
    "money": "💰", "cash": "💵", "dollar": "💵", "dollars": "💵", "rich": "🤑", "wealth": "💎",
    "profit": "📈", "revenue": "📈", "expensive": "💸", "paid": "💳", "million": "💰", "billion": "💰",
    "crypto": "🪙", "bitcoin": "🪙", "gold": "🪙", "cost": "🏷️",
    # Excitement & Fire
    "fire": "🔥", "crazy": "🤯", "insane": "🤯", "wild": "🔥", "lit": "🔥", "exploded": "💥",
    "mind": "🧠", "brain": "🧠", "blown": "🤯", "unbelievable": "😱", "shocking": "😱",
    # Tech & AI
    "ai": "🤖", "robot": "🤖", "algorithm": "💻", "code": "💻", "future": "🔮", "system": "⚙️",
    "tech": "📱", "computer": "💻", "hack": "⚡", "data": "📊",
    # Success & Power
    "win": "🏆", "winner": "🏆", "champion": "🥇", "best": "⭐", "power": "💪", "strong": "💪",
    "king": "👑", "queen": "👑", "boss": "👔", "success": "🎯", "goal": "🎯", "target": "🎯",
    "growth": "🚀", "grow": "🚀", "scale": "🚀", "rocket": "🚀", "viral": "🚀", "launch": "🚀",
    # Emotion & Reaction
    "love": "❤️", "heart": "❤️", "hate": "💔", "dead": "💀", "death": "💀", "died": "💀",
    "rip": "💀", "kill": "☠️", "laugh": "😂", "lol": "🤣", "funny": "😂", "sad": "😢",
    "cry": "😭", "crying": "😭", "happy": "😄", "smile": "😊",
    # Action & Focus
    "listen": "👂", "hear": "👂", "look": "👀", "see": "👀", "watch": "👁️", "stop": "🛑",
    "wait": "⏳", "time": "⏰", "clock": "⏰", "years": "🗓️", "warning": "⚠️", "danger": "⚠️",
    "secret": "🤫", "truth": "💯", "100": "💯", "real": "💯", "rules": "📜", "magic": "✨"
}

STYLE_PRESETS = {
    "viral_yellow": {
        "highlight": "&H00FFFF&",  # Yellow in BGR hex (&HBBGGRR&)
        "base": "&HFFFFFF&",
        "outline": "&H000000&",
        "outline_width": 5,
        "shadow_depth": 3,
        "bold": -1
    },
    "neon_green": {
        "highlight": "&H00FF00&",  # Vivid Green
        "base": "&HFFFFFF&",
        "outline": "&H000000&",
        "outline_width": 5,
        "shadow_depth": 3,
        "bold": -1
    },
    "cyber_cyan": {
        "highlight": "&HFFFF00&",  # Cyan
        "base": "&HFFFFFF&",
        "outline": "&H000000&",
        "outline_width": 5,
        "shadow_depth": 3,
        "bold": -1
    },
    "fire_orange": {
        "highlight": "&H0080FF&",  # Vivid Orange
        "base": "&HFFFFFF&",
        "outline": "&H000000&",
        "outline_width": 5,
        "shadow_depth": 3,
        "bold": -1
    },
    "clean_minimal": {
        "highlight": "&HFFFFFF&",
        "base": "&HE5E7EB&",
        "outline": "&H111827&",
        "outline_width": 3,
        "shadow_depth": 1,
        "bold": 0
    },
    "bold_pop": {
        "highlight": "&H00F0FF&",  # Bright Yellow-Orange
        "base": "&HFFFFFF&",
        "outline": "&H000000&",
        "outline_width": 6,
        "shadow_depth": 4,
        "bold": -1
    },
    "boxed": {
        "highlight": "&H00FFFF&",
        "base": "&HFFFFFF&",
        "outline": "&H000000&",
        "outline_width": 2,
        "shadow_depth": 0,
        "bold": -1
    },
    "typewriter": {
        "highlight": "&H00FF80&",  # Lime Green
        "base": "&HD1D5DB&",
        "outline": "&H000000&",
        "outline_width": 3,
        "shadow_depth": 2,
        "bold": 0
    }
}

# (res_x, res_y, default_font_size, margin_v, words_per_line)
DIMENSION_CONFIG = {
    # 1080p Profiles
    ("9:16", "1080p"): (1080, 1920, 62, 280, 4),
    ("4:5",  "1080p"): (1080, 1350, 54, 180, 4),
    ("1:1",  "1080p"): (1080, 1080, 50, 140, 4),
    ("16:9", "1080p"): (1920, 1080, 48, 120, 6),
    # 720p Profiles
    ("9:16", "720p"):  (720,  1280, 44, 190, 4),
    ("4:5",  "720p"):  (720,  900,  38, 120, 4),
    ("1:1",  "720p"):  (720,  720,  35, 95,  4),
    ("16:9", "720p"):  (1280, 720,  34, 80,  6),
}

ALIGNMENT_MAP = {
    "bottom": 2, # Alignment 2 (bottom-center)
    "middle": 5, # Alignment 5 (middle-center)
    "top":    8  # Alignment 8 (top-center)
}

def format_ass_timestamp(seconds: float) -> str:
    """Formats seconds into ASS timestamp format: H:MM:SS.cs"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 99
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def generate_karaoke_ass(
    words: List[Dict[str, Any]],
    output_ass_path: str,
    clip_start_time: float,
    clip_end_time: float,
    style_preset: str = "viral_yellow",
    position: str = "bottom",
    aspect_ratio: str = "9:16",
    resolution: str = "1080p",
    font_size: Optional[int] = None,
    uppercase: bool = True,
    auto_emojis: bool = True,
    headline_banner: Optional[str] = None
) -> str:
    """
    Generates word-by-word karaoke ASS subtitles formatted for the requested
    aspect ratio (9:16, 4:5, 1:1, 16:9) and resolution (1080p, 720p).
    Includes auto-emojis and optional top hook headline banner.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_ass_path)), exist_ok=True)

    preset = STYLE_PRESETS.get(style_preset, STYLE_PRESETS["viral_yellow"])
    highlight_color = preset["highlight"]
    base_color = preset["base"]
    outline_color = preset["outline"]
    outline_width = preset["outline_width"]
    shadow_depth = preset["shadow_depth"]
    bold_val = preset["bold"]

    # Retrieve dimension, font size, and safe margins
    dim_key = (aspect_ratio, resolution)
    res_x, res_y, default_font_size, default_margin_v, words_per_line = DIMENSION_CONFIG.get(
        dim_key, DIMENSION_CONFIG[("9:16", "1080p")]
    )
    final_font_size = font_size if font_size is not None else default_font_size

    align_code = ALIGNMENT_MAP.get(position, ALIGNMENT_MAP["bottom"])
    if position == "middle":
        margin_v = 0
    elif position == "top":
        margin_v = default_margin_v
    else:
        margin_v = default_margin_v

    # Filter words within the clip boundary and offset relative to 0.00
    clip_words = []
    for w in words:
        w_start = w.get("start", 0.0)
        w_end = w.get("end", 0.0)
        if w_end > clip_start_time and w_start < clip_end_time:
            rel_start = max(0.0, w_start - clip_start_time)
            rel_end = min(clip_end_time - clip_start_time, w_end - clip_start_time)
            raw_w = str(w.get("word", "")).strip()
            
            clean_token = re.sub(r"[^a-zA-Z0-9]", "", raw_w.lower())
            emoji = ""
            if auto_emojis and clean_token in EMOJI_KEYWORDS:
                emoji = f" {EMOJI_KEYWORDS[clean_token]}"

            word_text = (raw_w.upper() if uppercase else raw_w) + emoji
            clip_words.append({
                "word": word_text,
                "start": rel_start,
                "end": rel_end
            })

    # Chunk into lines based on ratio words_per_line
    lines = []
    for i in range(0, len(clip_words), words_per_line):
        line_chunk = clip_words[i:i + words_per_line]
        if line_chunk:
            lines.append(line_chunk)

    font_name = "Courier New" if style_preset == "typewriter" else "Segoe UI Emoji"

    # ASS Header
    ass_content = f"""[Script Info]
Title: OmniClip Karaoke Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: {res_x}
PlayResY: {res_y}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{final_font_size},{base_color},&H000000FF&,{outline_color},&H80000000&,{bold_val},0,0,0,100,100,1,0,1,{outline_width},{shadow_depth},{align_code},80,80,{margin_v},1
Style: Banner,{font_name},{int(final_font_size * 0.72)},&H00FFFFFF&,&H000000FF&,&H00000000&,&HAA000000&,-1,0,0,0,100,100,1,0,3,10,0,8,60,60,110,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    if headline_banner and headline_banner.strip():
        banner_clean = headline_banner.strip().replace("{", "").replace("}", "")
        dur_str = format_ass_timestamp(clip_end_time - clip_start_time)
        ass_content += f"Dialogue: 1,0:00:00.00,{dur_str},Banner,,0,0,0,,{banner_clean}\n"

    for line in lines:
        for active_idx, active_word in enumerate(line):
            w_start_str = format_ass_timestamp(active_word["start"])
            w_end_str = format_ass_timestamp(active_word["end"])

            text_tokens = []
            for idx, w in enumerate(line):
                cleaned = w["word"].replace("{", "").replace("}", "")
                if idx == active_idx:
                    text_tokens.append(f"{{\\c{highlight_color}\\b1}}{cleaned}{{\\c{base_color}\\b{abs(bold_val)}}}")
                else:
                    text_tokens.append(f"{{\\c{base_color}}}{cleaned}")

            formatted_text = " ".join(text_tokens)
            ass_content += f"Dialogue: 0,{w_start_str},{w_end_str},Default,,0,0,0,,{formatted_text}\n"

    with open(output_ass_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

    return output_ass_path
