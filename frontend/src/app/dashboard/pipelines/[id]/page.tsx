"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

const MODELS = [
  { id: "groq-llama", label: "Llama 3.3 70B (Fast)" },
  { id: "groq-mixtral", label: "Mixtral 8x7B" },
  { id: "groq-gemma", label: "Gemma 2 9B" },
  { id: "gemini-flash", label: "Gemini 1.5 Flash (Recommended)" },
  { id: "gemini-pro", label: "Gemini 1.5 Pro (Accurate)" }
];

export default function PipelineQueryPage() {
  const { id } = useParams();
  const pipelineId = Array.isArray(id) ? id[0] : id;
  
  const [question, setQuestion] = useState("");
  const [model, setModel] = useState("gemini-flash");
  const [isAsking, setIsAsking] = useState(false);
  
  // Response state
  const [response, setResponse] = useState<any>(null);
  const [streamedAnswer, setStreamedAnswer] = useState("");
  const [error, setError] = useState(false);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  // Check auth state before doing anything if needed, though ProtectedRoute handles it
  
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
    setResponse(null);
    setStreamedAnswer("");
    setError(false);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    setIsAsking(true);
    setResponse(null);
    setStreamedAnswer("");
    setError(false);
    setIsSourcesExpanded(false);
    
    try {
      const data = await api.queryPipeline(pipelineId, question, model);
      
      setResponse(data);
      
      // Simulate SSE streaming word-by-word
      const words = data.answer.split(" ");
      let currentIdx = 0;
      
      const streamInterval = setInterval(() => {
        if (currentIdx < words.length) {
          setStreamedAnswer(prev => prev + (prev ? " " : "") + words[currentIdx]);
          currentIdx++;
        } else {
          clearInterval(streamInterval);
          setIsAsking(false); // Done streaming
        }
      }, 50); // 50ms per word
      
    } catch (e) {
      console.error(e);
      setError(true);
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col animate-fade-in">
      <header className="flex items-center gap-sm font-label-caps text-label-caps mb-xl border-b border-outline-variant/30 pb-md">
        <Link href="/dashboard/pipelines" className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Pipelines
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="text-primary tracking-normal font-code-md">{pipelineId}</span>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-lg min-h-0">
        {/* Left Panel */}
        <div className="lg:col-span-4 flex flex-col gap-lg bg-[#111118] border border-outline-variant/30 rounded-xl p-lg">
          <div className="flex flex-col gap-sm relative">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase">Model Selection</label>
            <div className="relative">
              <select 
                value={model}
                onChange={handleModelChange}
                className={`w-full appearance-none bg-[#1f1f28] border border-[#1E1E2E] focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-md px-3 py-3 text-white outline-none transition-all font-code-md text-sm cursor-pointer ${model ? 'ring-1 ring-primary/20 border-primary/50' : ''}`}
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#111118] text-white py-2">
                    {m.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-primary">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-sm flex-1">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase">Your Question</label>
            <textarea 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about the ingested documents..."
              className="flex-1 w-full bg-[#1f1f28] border border-[#1E1E2E] focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-md px-md py-sm font-body-md text-white placeholder:text-zinc-600 outline-none transition-all resize-none custom-scrollbar"
              disabled={isAsking}
            />
          </div>

          <button 
            onClick={handleAsk}
            disabled={isAsking || !question.trim()}
            className="w-full bg-primary hover:bg-[#5B54E6] disabled:opacity-50 text-white font-label-caps text-sm px-lg py-3 rounded transition-colors shadow-[0_0_15px_rgba(108,99,255,0.3)] flex items-center justify-center gap-sm"
          >
            {isAsking ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                Thinking...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">send</span>
                Ask Question
              </>
            )}
          </button>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-8 flex flex-col bg-[#111118] border border-outline-variant/30 rounded-xl overflow-hidden relative">
          <div className="bg-[#1b1b24] border-b border-outline-variant/30 px-lg py-sm flex items-center justify-between h-12">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase">Response</span>
            {response && !isAsking && (
              <span className="font-code-md text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full animate-fade-in">
                {model} • {(response.latency || 0).toFixed(2)}s
              </span>
            )}
          </div>

          <div className="flex-1 p-lg overflow-y-auto custom-scrollbar">
            {!isAsking && !response && !error && (
              <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant gap-md">
                <span className="material-symbols-outlined text-[48px] opacity-20">forum</span>
                <p className="font-body-md">Ask a question to see the response</p>
              </div>
            )}

            {isAsking && !streamedAnswer && (
              <div className="flex flex-col gap-4 w-full max-w-3xl animate-pulse">
                <div className="h-4 bg-surface-variant/30 rounded w-3/4"></div>
                <div className="h-4 bg-surface-variant/30 rounded w-full"></div>
                <div className="h-4 bg-surface-variant/30 rounded w-5/6"></div>
                <div className="h-4 bg-surface-variant/30 rounded w-1/2"></div>
              </div>
            )}

            {(streamedAnswer || response) && (
              <div className="flex flex-col gap-lg animate-fade-in">
                <div className="font-body-md text-white leading-relaxed whitespace-pre-wrap">
                  {streamedAnswer}
                  {isAsking && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle"></span>}
                </div>

                {/* Sources Section - appears when streaming finishes */}
                {response && response.sources && response.sources.length > 0 && !isAsking && (
                  <div className="mt-xl border border-outline-variant/30 rounded-lg overflow-hidden bg-[#0e0d16] animate-slide-up">
                    <button 
                      onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
                      className="w-full px-md py-sm flex justify-between items-center hover:bg-surface-variant/30 transition-colors"
                    >
                      <div className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-[18px] text-primary">library_books</span>
                        <span className="font-label-caps text-xs text-white">Sources Used ({response.sources.length})</span>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px] transition-transform duration-300" style={{ transform: isSourcesExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </button>
                    
                    {isSourcesExpanded && (
                      <div className="p-md border-t border-outline-variant/30 flex flex-col gap-sm">
                        {response.sources.map((src: any, idx: number) => {
                          const text = typeof src === 'string' ? src : (src.page_content || JSON.stringify(src));
                          return (
                            <div key={idx} className="bg-[#1b1b24] p-sm rounded border border-outline-variant/20">
                              <span className="font-code-md text-[10px] text-primary mb-1 block">Chunk {idx + 1}</span>
                              <p className="font-body-sm text-xs text-on-surface-variant line-clamp-3 leading-relaxed">
                                {text.substring(0, 100)}...
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="w-full h-full flex flex-col items-center justify-center text-error gap-md animate-fade-in">
                <span className="material-symbols-outlined text-[48px]">error</span>
                <p className="font-body-md">Something went wrong — try again</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
