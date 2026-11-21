"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, Scissors } from "lucide-react";

interface WaveformTimelineProps {
  currentTime: number;
  duration: number;
  startTime: number;
  endTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onTrimChange?: (start: number, end: number) => void;
}

export function WaveformTimeline({
  currentTime,
  duration,
  startTime,
  endTime,
  isPlaying,
  onSeek,
  onTrimChange,
}: WaveformTimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const clipDuration = Math.max(0.1, duration || endTime - startTime || 10);
  const playheadPercent = Math.min(100, Math.max(0, (currentTime / clipDuration) * 100));

  // Generate 80 deterministic waveform bar heights for rich visual representation
  const barCount = 80;
  const bars = React.useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < barCount; i++) {
      // Harmonic wave formula with pseudo-random speech amplitude peaks
      const base = Math.sin((i / barCount) * Math.PI * 4);
      const noise = Math.sin(i * 12.9898 + (startTime || 0) * 78.233);
      const frac = (noise - Math.floor(noise)) * 0.45;
      const height = Math.min(95, Math.max(18, Math.abs(base) * 55 + frac * 40 + 20));
      list.push(Math.round(height));
    }
    return list;
  }, [barCount, startTime, clipDuration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetPercent = clickX / rect.width;
    const targetTime = targetPercent * clipDuration;
    onSeek(targetTime);
    setIsDraggingPlayhead(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPlayhead || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetPercent = clickX / rect.width;
    const targetTime = targetPercent * clipDuration;
    onSeek(targetTime);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingPlayhead) {
      setIsDraggingPlayhead(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Format seconds to mm:ss.s
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m}:${s.padStart(4, "0")}`;
  };

  return (
    <div className="w-full bg-[#0C0E11] border-t border-[#1F2328] px-4 py-3 select-none flex flex-col gap-2">
      {/* Top Header Row: Current Time & Duration */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-emerald-400 animate-pulse" : "bg-violet-400"}`} />
            <span>{formatTime(currentTime)}</span>
          </div>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400">{formatTime(clipDuration)}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1 text-gray-400">
            <Scissors className="w-3 h-3 text-violet-400" />
            <span>Trim Window: {startTime.toFixed(1)}s - {endTime.toFixed(1)}s ({(endTime - startTime).toFixed(1)}s)</span>
          </span>
          <span className="text-[10px] text-gray-500 hidden sm:inline">Click or drag waveform to scrub</span>
        </div>
      </div>

      {/* Interactive Waveform Track */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-14 w-full bg-[#121518] rounded-xl border border-[#23272D] overflow-hidden cursor-pointer flex items-center px-1"
      >
        {/* Background time ticks */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-2 text-[9px] font-mono text-gray-600 pt-1">
          <span>0s</span>
          <span>{(clipDuration * 0.25).toFixed(1)}s</span>
          <span>{(clipDuration * 0.5).toFixed(1)}s</span>
          <span>{(clipDuration * 0.75).toFixed(1)}s</span>
          <span>{clipDuration.toFixed(1)}s</span>
        </div>

        {/* Waveform Bars */}
        <div className="w-full h-8 flex items-center justify-between gap-[2px] z-10 px-1 pointer-events-none">
          {bars.map((height, idx) => {
            const barPercent = (idx / barCount) * 100;
            const isPassed = barPercent <= playheadPercent;
            return (
              <div
                key={idx}
                className="flex-1 rounded-full transition-colors duration-150"
                style={{
                  height: `${height}%`,
                  backgroundColor: isPassed ? "#8B5CF6" : "#2E343E",
                  opacity: isPassed ? 1 : 0.7,
                }}
              />
            );
          })}
        </div>

        {/* Playhead Vertical Line */}
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-3 h-3 bg-violet-400 rotate-45 -mt-1 shadow-md shadow-violet-500/50" />
          <div className="w-[2px] h-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
        </div>
      </div>
    </div>
  );
}
