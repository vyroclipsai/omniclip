# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS base

# Install Python, FFmpeg, and build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up virtual environment and install python dependencies
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install yt-dlp, faster-whisper, and numpy
RUN pip install --no-cache-dir \
    yt-dlp \
    opencv-python-headless \
    numpy

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm ci

# Copy project files
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Expose server port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "start"]
