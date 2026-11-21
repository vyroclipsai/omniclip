-- OmniClip AI Database Schema (SQLite / PostgreSQL compatible)

-- 1. Users Table (for optional auth)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    password_hash VARCHAR(255),
    role VARCHAR(32) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(32) NOT NULL, -- 'url' | 'upload' | 'sample'
    source_url TEXT,
    source_path TEXT,
    status VARCHAR(32) DEFAULT 'queued', -- 'queued' | 'downloading' | 'transcribing' | 'analyzing' | 'rendering' | 'completed' | 'failed'
    progress INT DEFAULT 0,
    current_step VARCHAR(255),
    duration_seconds FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transcripts Table
CREATE TABLE IF NOT EXISTS transcripts (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    language VARCHAR(16) DEFAULT 'en',
    full_text TEXT NOT NULL,
    segments_json TEXT NOT NULL, -- Detailed JSON array with word-level timestamps
    total_words INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Clips Table
CREATE TABLE IF NOT EXISTS clips (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    virality_score INT NOT NULL, -- 0 to 100
    hook_rating VARCHAR(64),
    explanation TEXT,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    duration FLOAT NOT NULL,
    aspect_ratio VARCHAR(16) DEFAULT '9:16', -- '9:16' | '1:1' | '16:9'
    render_mode VARCHAR(16) DEFAULT 'crop',   -- 'crop' | 'blur_bg'
    transcript_text TEXT,
    words_json TEXT, -- JSON array of {word, start, end}
    crop_info_json TEXT, -- JSON object {crop_w, crop_h, crop_x, crop_y}
    caption_style_json TEXT, -- JSON object {preset, position, fontSize}
    ass_subtitle_path TEXT,
    rendered_video_path TEXT,
    video_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Jobs Table (Background Task Queue)
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'queued',
    progress INT DEFAULT 0,
    current_step VARCHAR(255),
    error_message TEXT,
    error_details TEXT,
    logs_json TEXT, -- JSON array of structured log lines
    max_clips INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_project_id ON clips(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
