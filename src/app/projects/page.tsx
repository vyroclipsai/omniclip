"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Film,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Filter,
  Sliders,
} from "lucide-react";
import { Project } from "@/lib/db";
import { apiFetch, getApiUrl } from "@/lib/api-client";

export default function ProjectsDashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "processing" | "failed">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadProjects = async () => {
    setLoading(true);
    const { data, error } = await apiFetch<{ success: boolean; projects: Project[] }>("/api/projects");
    if (data?.success && data.projects) {
      setProjects(data.projects);
    } else {
      const errDetail = error?.error || (data as any)?.error;
      if (errDetail) {
        console.warn("Projects fetch notice:", errDetail);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
    const interval = setInterval(loadProjects, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleStartRename = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(project.id);
    setEditingName(project.name);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }
    const { data } = await apiFetch(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editingName.trim() }),
    });
    if (data?.success) {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: editingName.trim() } : p))
      );
      showToast("Project renamed successfully");
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    const { data } = await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
    if (data?.success) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      showToast("Project deleted");
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-[#08090A] text-white flex flex-col">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[#16181D] border border-violet-500/40 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium animate-fade-in">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-[#1F2328] bg-[#0B0D0E]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <Link href="/app" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">OmniClip AI</span>
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <nav className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/app" className="text-gray-400 hover:text-white transition">
              Home
            </Link>
            <Link href="/projects" className="text-violet-400 font-bold">
              Projects
            </Link>
            <Link href="/status" className="text-gray-400 hover:text-white transition flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Status
            </Link>
          </nav>
        </div>

        <Link
          href="/app"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>New Video</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Title and Stats Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Your Video Projects</span>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                {projects.length} Total
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Manage your AI-repurposed video clips, re-edit compositions, and bulk export.
            </p>
          </div>

          {/* Search Bar & Status Filter */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[#121517] border border-[#272C33] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 w-48 sm:w-64 transition"
              />
            </div>

            <div className="flex rounded-xl bg-[#121517] border border-[#272C33] p-1 text-xs">
              {(["all", "completed", "processing", "failed"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition ${
                    statusFilter === st
                      ? "bg-violet-600 text-white font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project Cards Grid */}
        {loading && projects.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-gray-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-sm font-medium">Loading your projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-[#121517]/50 border border-dashed border-[#272C33] space-y-4">
            <Film className="w-10 h-10 text-gray-600 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-gray-300">No projects found</h3>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery ? "Try a different search query." : "Paste a YouTube link or upload a file to generate clips."}
              </p>
            </div>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition shadow-lg shadow-violet-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => {
              const firstClip = p.clips && p.clips.length > 0 ? p.clips[0] : null;
              const isProcessing = p.status === "processing" || p.status === "queued";
              const isFailed = p.status === "failed";
              const isEditingThis = editingId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/project/${p.id}`)}
                  className="group rounded-2xl border border-[#1F2328] bg-[#111317] hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-950/20 transition-all cursor-pointer flex flex-col overflow-hidden"
                >
                  {/* Card Visual Header / Preview */}
                  <div className="relative aspect-video bg-black/60 overflow-hidden flex items-center justify-center border-b border-[#1F2328]">
                    {firstClip?.videoUrl ? (
                      <video
                        src={getApiUrl(firstClip.videoUrl)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-600 gap-2">
                        <Film className="w-10 h-10 text-violet-500/50" />
                        <span className="text-[11px] font-mono text-gray-500">
                          {isProcessing ? "Analyzing Video..." : p.sourceType.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Status Badge Overlay */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5 shadow-md ${
                          p.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : isProcessing
                            ? "bg-violet-500/20 text-violet-300 border-violet-500/30 animate-pulse"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {p.status === "completed" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{p.clips.length} Clips Ready</span>
                          </>
                        ) : isProcessing ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-violet-400" />
                            <span>{p.progress}% Processing</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            <span>Failed</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Duration / Source Tag */}
                    {p.duration && (
                      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-gray-300">
                        {Math.round(p.duration / 60)}m
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Title & Rename Mode */}
                      {isEditingThis ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2.5 py-1 bg-[#1A1D23] border border-violet-500 rounded-lg text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={(e) => handleSaveRename(p.id, e)}
                            className="p-1 rounded bg-violet-600 hover:bg-violet-500 text-white"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 text-gray-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors line-clamp-2 leading-snug">
                            {p.name}
                          </h3>
                          <button
                            onClick={(e) => handleStartRename(p, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition"
                            title="Rename Project"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 font-mono mt-1.5 flex items-center gap-2">
                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="capitalize">{p.sourceType}</span>
                      </p>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-violet-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>{isProcessing ? "View Progress" : "Open Studio"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>

                      <button
                        onClick={(e) => handleDelete(p.id, p.name, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
