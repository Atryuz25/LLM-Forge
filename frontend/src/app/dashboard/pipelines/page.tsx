"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAppState } from "@/context/AppStateContext";

export default function PipelinesPage() {
  const router = useRouter();
  const { pipelines, pipelinesLoaded, pipelinesLoading, fetchPipelines } = useAppState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pipelineName, setPipelineName] = useState("");
  const [nameError, setNameError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);

  // Search + expanded state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);
  const [deletingPipeline, setDeletingPipeline] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !pipelinesLoaded) fetchPipelines();
    });
    return () => unsubscribe();
  }, [pipelinesLoaded]);

  // Filter pipelines by search
  const filteredPipelines = pipelines.filter((p: any) =>
    (p.name || p.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.files || []).some((f: string) => f.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const validateFile = (file: File) => {
    setFileError("");
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|md)$/i)) {
      setFileError("Only PDF, TXT, MD files supported");
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setFileError("File too large — max 50MB");
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) setSelectedFile(file);
    }
  };

  const handleCreate = async () => {
    setNameError("");
    setFileError("");
    if (!pipelineName.trim()) { setNameError("Pipeline name is required"); return; }
    if (!selectedFile) { setFileError("Please upload a document"); return; }

    setIsCreating(true);
    setCreationProgress(0);
    const interval = setInterval(() => {
      setCreationProgress(prev => prev >= 95 ? 95 : prev + 5);
    }, 100);

    try {
      const res = await api.createPipeline(pipelineName, selectedFile);
      setCreationProgress(100);
      clearInterval(interval);
      toast.success(`Pipeline created — ${res.chunks_stored || 0} chunks indexed`);
      setTimeout(() => {
        setIsModalOpen(false);
        setPipelineName("");
        setSelectedFile(null);
        setCreationProgress(0);
        setIsCreating(false);
        fetchPipelines();
      }, 500);
    } catch (e: any) {
      clearInterval(interval);
      setIsCreating(false);
      setCreationProgress(0);
      toast.error("Failed to create pipeline — check your file and try again");
    }
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    if (!confirm(`Delete pipeline "${pipelineId}" and all its documents? This cannot be undone.`)) return;
    setDeletingPipeline(pipelineId);
    try {
      await api.deletePipeline(pipelineId);
      toast.success(`Pipeline "${pipelineId}" deleted`);
      fetchPipelines();
    } catch (e) {
      toast.error("Failed to delete pipeline");
    } finally {
      setDeletingPipeline(null);
    }
  };

  const handleDeleteFile = async (pipelineId: string, fileName: string) => {
    if (!confirm(`Remove "${fileName}" from pipeline "${pipelineId}"?`)) return;
    setDeletingFile(fileName);
    try {
      await api.deleteFileFromPipeline(pipelineId, fileName);
      toast.success(`"${fileName}" removed`);
      fetchPipelines();
    } catch (e) {
      toast.error("Failed to delete file");
    } finally {
      setDeletingFile(null);
    }
  };

  const openModal = () => {
    setPipelineName("");
    setSelectedFile(null);
    setNameError("");
    setFileError("");
    setIsModalOpen(true);
  };

  return (
    <>
      <header className="flex justify-between items-center mb-lg border-b border-outline-variant/30 pb-md animate-fade-in">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-white">Pipelines</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-sm">Manage your data ingestion and processing pipelines.</p>
        </div>
        <button
          onClick={openModal}
          className="bg-primary hover:bg-[#5B54E6] text-white font-label-caps text-sm px-lg py-sm rounded transition-colors flex items-center gap-sm shadow-[0_0_15px_rgba(108,99,255,0.3)]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Pipeline
        </button>
      </header>

      {/* Search bar */}
      <div className="mb-lg relative animate-fade-in">
        <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search pipelines or file names..."
          className="w-full bg-[#111118] border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-lg pl-[44px] pr-md py-sm font-body-sm text-white placeholder:text-zinc-600 outline-none transition-all"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-md animate-fade-in">
        {pipelinesLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-[90px] w-full bg-surface-variant/20 animate-pulse rounded-lg border border-outline-variant/30"></div>
          ))
        ) : filteredPipelines.length > 0 ? (
          filteredPipelines.map((p: any, i) => {
            const pid = typeof p === 'string' ? p : (p.id || p.name || String(p));
            const isExpanded = expandedPipeline === pid;
            const files: string[] = p.files || [];
            return (
              <div
                key={pid || i}
                className="bg-[#111118] border border-outline-variant/30 rounded-lg hover-glow transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Pipeline header row */}
                <div className="p-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
                  <div className="flex flex-col gap-sm flex-1">
                    <div className="flex items-center gap-md">
                      <span className="material-symbols-outlined text-primary text-[24px]">dataset</span>
                      <h3 className="font-headline-md text-headline-md text-white">{p.name || pid}</h3>
                      <span className="bg-secondary/10 text-secondary border border-secondary/30 px-sm py-[2px] rounded-full font-label-caps text-[10px] uppercase tracking-wider flex items-center gap-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Active
                      </span>
                    </div>
                    <div className="flex gap-lg font-code-md text-sm text-on-surface-variant flex-wrap">
                      <span className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[16px]">segment</span>
                        {p.chunks || 0} chunks
                      </span>
                      <span className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        {files.length} file{files.length !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {p.updated || "Recently"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-sm w-full md:w-auto mt-sm md:mt-0">
                    {/* Toggle files */}
                    {files.length > 0 && (
                      <button
                        onClick={() => setExpandedPipeline(isExpanded ? null : pid)}
                        className="flex-none border border-outline-variant hover:border-primary hover:text-primary bg-transparent text-white font-label-caps text-xs px-md py-sm rounded transition-colors flex items-center gap-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        Files
                        <span className="material-symbols-outlined text-[14px] transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                          expand_more
                        </span>
                      </button>
                    )}
                    <Link
                      href={`/dashboard/pipelines/${pid}`}
                      className="flex-1 md:flex-none border border-outline-variant hover:border-primary hover:text-primary bg-transparent text-white font-label-caps text-xs px-md py-sm rounded transition-colors flex items-center justify-center gap-xs group"
                    >
                      Query <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                    <button
                      onClick={() => router.push('/dashboard/evaluations')}
                      className="flex-none border border-outline-variant hover:border-primary hover:text-primary bg-transparent text-white font-label-caps text-xs px-md py-sm rounded transition-colors flex items-center gap-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">analytics</span> Eval
                    </button>
                    <button
                      onClick={() => handleDeletePipeline(pid)}
                      disabled={deletingPipeline === pid}
                      className="flex-none border border-outline-variant hover:border-error hover:text-error bg-transparent text-on-surface-variant font-label-caps text-xs px-sm py-sm rounded transition-colors flex items-center gap-xs disabled:opacity-50"
                      title="Delete pipeline"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {deletingPipeline === pid ? "hourglass_empty" : "delete"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Expandable file list */}
                {isExpanded && files.length > 0 && (
                  <div className="border-t border-outline-variant/20 px-lg pb-md pt-sm bg-[#0e0d16] rounded-b-lg animate-fade-in">
                    <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mb-sm">Uploaded Files</p>
                    <div className="flex flex-col gap-xs">
                      {files.map((fname, fi) => (
                        <div key={fi} className="flex items-center justify-between gap-sm bg-[#111118] border border-outline-variant/20 rounded px-md py-sm group">
                          <div className="flex items-center gap-sm min-w-0">
                            <span className="material-symbols-outlined text-[16px] text-primary flex-none">description</span>
                            <span className="font-code-md text-sm text-white truncate">{fname}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteFile(pid, fname)}
                            disabled={deletingFile === fname}
                            className="flex-none text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Remove this file"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {deletingFile === fname ? "hourglass_empty" : "delete"}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : searchQuery ? (
          <div className="w-full py-xl flex flex-col items-center justify-center text-on-surface-variant gap-md bg-[#111118] border border-outline-variant/30 rounded-lg border-dashed">
            <span className="material-symbols-outlined text-[48px] opacity-50">search_off</span>
            <p className="font-body-md text-center">No pipelines match "<span className="text-white">{searchQuery}</span>"</p>
            <button onClick={() => setSearchQuery("")} className="mt-sm px-lg py-sm bg-surface-variant/20 text-white border border-outline-variant/30 hover:bg-surface-variant/30 rounded text-sm font-label-caps transition-colors">
              Clear search
            </button>
          </div>
        ) : (
          <div className="w-full py-xl flex flex-col items-center justify-center text-on-surface-variant gap-md bg-[#111118] border border-outline-variant/30 rounded-lg border-dashed">
            <span className="material-symbols-outlined text-[48px] opacity-50">route</span>
            <p className="font-body-md text-center">No pipelines yet — create your first one</p>
            <button
              onClick={openModal}
              className="mt-sm px-lg py-sm bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 rounded text-sm font-label-caps transition-colors"
            >
              New Pipeline
            </button>
          </div>
        )}
      </div>

      {/* Create pipeline modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0d16]/80 backdrop-blur-md p-md animate-fade-in">
          <div className="bg-[#111118] border border-outline-variant/50 rounded-xl w-[90vw] md:w-[600px] max-w-full shadow-[0_0_40px_rgba(108,99,255,0.1)] flex flex-col animate-slide-up">
            <div className="flex justify-between items-center px-xl py-lg border-b border-outline-variant/30 bg-[#1b1b24] rounded-t-xl">
              <h3 className="font-headline-md text-headline-md text-white">New Pipeline</h3>
              <button onClick={() => !isCreating && setIsModalOpen(false)} className="text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-xl py-lg flex flex-col gap-xl">
              <div className="flex flex-col gap-xs w-full relative">
                <label className="font-label-caps text-xs text-on-surface-variant uppercase flex justify-between">
                  Pipeline Name
                  <span className={pipelineName.length > 50 ? 'text-error' : ''}>{pipelineName.length}/50</span>
                </label>
                <input
                  autoFocus
                  value={pipelineName}
                  onChange={(e) => { if (e.target.value.length <= 50) setPipelineName(e.target.value); }}
                  className={`w-full bg-[#1f1f28] border ${nameError ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-primary/50'} focus:ring-1 rounded px-md py-sm font-code-md text-sm text-white placeholder:text-zinc-600 outline-none transition-all`}
                  placeholder="e.g., customer_support_kb"
                  type="text"
                  disabled={isCreating}
                />
                {nameError && <span className="text-error text-xs absolute -bottom-5">{nameError}</span>}
              </div>

              <div className="flex flex-col gap-xs w-full relative mt-sm">
                <label className="font-label-caps text-xs text-on-surface-variant uppercase">Upload Document</label>
                <div
                  className={`w-full border-2 border-dashed rounded-lg py-xl px-lg flex flex-col items-center justify-center gap-md transition-all cursor-pointer ${fileError ? 'border-error bg-error/5' : isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-outline-variant bg-[#1f1f28]/50 hover:border-primary hover:bg-[#1f1f28]'}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md" disabled={isCreating} />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-sm text-center">
                      <div className="w-12 h-12 rounded-full bg-[#00D4AA]/20 flex items-center justify-center text-[#00D4AA] shadow-[0_0_15px_rgba(0,212,170,0.3)]">
                        <span className="material-symbols-outlined text-[24px]">check_circle</span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#111118] border border-[#1E1E2E] px-3 py-1.5 rounded-full mt-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">description</span>
                        <span className="font-code-md text-sm text-white truncate max-w-[200px]">{selectedFile.name}</span>
                        <span className="text-xs text-on-surface-variant">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          disabled={isCreating}
                          className="ml-2 text-on-surface-variant hover:text-error transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-primary/20 text-primary' : 'bg-surface-variant/50 text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-[28px]">upload_file</span>
                      </div>
                      <div className="text-center">
                        <p className={`font-body-md ${isDragging ? 'text-primary font-medium' : 'text-white'}`}>
                          {isDragging ? 'Drop to upload' : 'Drag and drop files here'}
                        </p>
                        <p className="font-body-sm text-xs text-on-surface-variant mt-1">Supports PDF, TXT, MD up to 50MB</p>
                      </div>
                      <button disabled={isCreating} className="mt-2 text-xs font-label-caps px-4 py-1.5 rounded border border-outline-variant hover:border-primary hover:text-primary text-white transition-colors">
                        Browse Files
                      </button>
                    </>
                  )}
                </div>
                {fileError && <span className="text-error text-xs absolute -bottom-5">{fileError}</span>}
              </div>

              {isCreating && (
                <div className="w-full mt-2 animate-fade-in">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-label-caps text-primary">Ingesting Document...</span>
                    <span className="text-xs font-code-md text-primary">{Math.round(creationProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1b1b24] rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_rgba(108,99,255,0.8)]" style={{ width: `${creationProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-xl py-md border-t border-outline-variant/30 bg-[#1b1b24] rounded-b-xl flex justify-end gap-md">
              <button onClick={() => setIsModalOpen(false)} disabled={isCreating} className="font-label-caps text-sm text-on-surface-variant hover:text-white px-md py-sm transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="bg-primary hover:bg-[#5B54E6] disabled:opacity-50 text-white font-label-caps text-sm px-lg py-sm rounded transition-colors shadow-[0_0_15px_rgba(108,99,255,0.3)] flex items-center gap-sm"
              >
                {isCreating ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : null}
                {isCreating ? "Creating..." : "Create Pipeline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
