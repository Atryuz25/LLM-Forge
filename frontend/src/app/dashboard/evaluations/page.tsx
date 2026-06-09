"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useEval } from "@/context/EvalContext";
import { useAppState } from "@/context/AppStateContext";

const AVAILABLE_MODELS = [
  { id: "groq-llama", label: "Llama 3.3 70B (Fast)" },
  { id: "groq-mixtral", label: "Mixtral 8x7B" },
  { id: "groq-gemma", label: "Gemma 2 9B" },
  { id: "gemini-flash", label: "Gemini 1.5 Flash" },
  { id: "gemini-pro", label: "Gemini 1.5 Pro" }
];

const COLORS = ['#6C63FF', '#00D4AA', '#F59E0B'];

export default function EvaluationsPage() {
  // ── Persistent state via AppStateContext (survives page navigation) ──────────
  const { pipelines, pipelinesLoaded, fetchPipelines, evalState, setEvalState } = useAppState();
  const { isEvaluating, evalProgress, evalResults: results, runEvaluation } = useEval();

  const { pipelineId, selectedModels, selectedFile, csvPreview } = evalState;
  const updateEval = (patch: Partial<typeof evalState>) =>
    setEvalState(prev => ({ ...prev, ...patch }));

  // Local-only transient UI state
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch pipelines once when user is ready (uses cached if already loaded)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !pipelinesLoaded) fetchPipelines();
    });
    return () => unsubscribe();
  }, [pipelinesLoaded]);

  // Auto-select first pipeline if none chosen yet
  useEffect(() => {
    if (pipelines.length > 0 && !pipelineId) {
      updateEval({ pipelineId: pipelines[0].id || String(pipelines[0]) });
    }
  }, [pipelines]);

  const toggleModel = (id: string) => {
    updateEval({
      selectedModels: selectedModels.includes(id)
        ? selectedModels.filter(m => m !== id)
        : selectedModels.length >= 3
          ? (toast.error("Max 3 models at a time"), selectedModels)
          : [...selectedModels, id]
    });
  };

  const parseCSV = (file: File) => {
    setFileError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setFileError("CSV must contain headers and at least one row");
        updateEval({ selectedFile: null, csvPreview: [] });
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      if (!headers.includes('question') || !headers.includes('ground_truth')) {
        setFileError("CSV must have 'question' and 'ground_truth' columns");
        updateEval({ selectedFile: null, csvPreview: [] });
        return;
      }
      const qIdx = headers.indexOf('question');
      const gIdx = headers.indexOf('ground_truth');
      const parsed = lines.slice(1, 4).map(line => {
        const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
        const cols = line.match(regex) || line.split(',');
        return {
          question: cols[qIdx]?.replace(/^"|"$/g, '') || '',
          ground_truth: cols[gIdx]?.replace(/^"|"$/g, '') || ''
        };
      });
      updateEval({ csvPreview: parsed, selectedFile: file });
      toast.success(`✅ ${file.name} — ${lines.length - 1} questions loaded`);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseCSV(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        parseCSV(file);
      } else {
        setFileError("Only CSV files are supported for evaluations");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,question,ground_truth\nWhat is the main topic of the document?,The document discusses AI models.\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "eval_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRunEvaluation = () => {
    if (!pipelineId || selectedModels.length === 0 || !selectedFile) return;
    runEvaluation(pipelineId, selectedFile, selectedModels);
  };

  const isRunEnabled = pipelineId && selectedModels.length > 0 && selectedFile;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-[#00D4AA]';
    if (score >= 0.6) return 'text-[#F59E0B]';
    return 'text-[#EF4444]';
  };

  const getBgScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-[#00D4AA]/10 border-[#00D4AA]/30';
    if (score >= 0.6) return 'bg-[#F59E0B]/10 border-[#F59E0B]/30';
    return 'bg-[#EF4444]/10 border-[#EF4444]/30';
  };

  // Process data for radar chart
  const radarData = [
    { subject: 'Faithfulness' },
    { subject: 'Relevancy' },
    { subject: 'Precision' },
    { subject: 'Recall' }
  ].map(metric => {
    const row: any = { subject: metric.subject };
    if (results && results.leaderboard) {
      results.leaderboard.forEach((lb: any) => {
        row[lb.model] = lb[metric.subject.toLowerCase() === 'relevancy' ? 'answer_relevancy' : `context_${metric.subject.toLowerCase()}`] || lb[metric.subject.toLowerCase()];
      });
    }
    return row;
  });

  // Group per-question results
  const questionsList = results?.results ? Array.from(new Set(results.results.map((r: any) => r.question))) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-xl pb-xl animate-fade-in">
      <header className="mb-xl border-b border-outline-variant/30 pb-md">
        <h2 className="font-headline-lg text-headline-lg text-white">Evaluations</h2>
        <p className="font-body-md text-on-surface-variant mt-sm">Run multi-model evaluations using RAGAS to benchmark performance.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Setup Column */}
        <div className="lg:col-span-5 flex flex-col gap-lg">
          {/* Pipeline Selector */}
          <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-lg">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase mb-sm block">1. Select Pipeline</label>
            <select 
              value={pipelineId}
              onChange={(e) => updateEval({ pipelineId: e.target.value })}
              className="w-full bg-[#1f1f28] border border-[#1E1E2E] focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-md px-3 py-3 text-white outline-none font-code-md text-sm cursor-pointer"
            >
              {pipelines.length === 0 ? <option>Loading...</option> : null}
              {pipelines.map((p: any) => {
                const pid = typeof p === 'string' ? p : (p.id || p.name || String(p));
                return <option key={pid} value={pid}>{pid}</option>
              })}
            </select>
            {pipelineId && (
              <div className="mt-sm font-label-caps text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded inline-block">
                Active: {pipelineId}
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-lg">
            <div className="flex justify-between items-end mb-md">
              <label className="font-label-caps text-xs text-on-surface-variant uppercase">2. Select Models (Max 3)</label>
              <span className="text-xs text-primary font-code-md">{selectedModels.length}/3</span>
            </div>
            <div className="flex flex-col gap-sm">
              {AVAILABLE_MODELS.map(m => {
                const isSelected = selectedModels.includes(m.id);
                const isDisabled = !isSelected && selectedModels.length >= 3;
                return (
                  <label key={m.id} className={`flex items-center gap-md p-sm rounded border cursor-pointer transition-all ${isSelected ? 'bg-primary/10 border-primary shadow-[0_0_10px_rgba(108,99,255,0.1)]' : isDisabled ? 'opacity-50 cursor-not-allowed border-transparent' : 'border-outline-variant/20 hover:border-outline-variant'}`}>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleModel(m.id)}
                    />
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-outline-variant'}`}>
                      {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                    </div>
                    <span className={`font-code-md text-sm ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>{m.label}</span>
                  </label>
                );
              })}
            </div>
            {selectedModels.length > 0 && (
              <div className="mt-md flex flex-wrap gap-2">
                {selectedModels.map(m => (
                  <span key={m} className="bg-primary/20 text-primary border border-primary/30 font-code-md text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    {m} <button onClick={() => toggleModel(m)} className="hover:text-white material-symbols-outlined text-[14px]">close</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* CSV Upload */}
          <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-lg">
            <div className="flex justify-between items-end mb-md">
              <label className="font-label-caps text-xs text-on-surface-variant uppercase">3. Upload Test Cases (CSV)</label>
              <button onClick={downloadTemplate} className="text-primary hover:text-[#5B54E6] text-xs flex items-center gap-1 font-label-caps transition-colors">
                <span className="material-symbols-outlined text-[14px]">download</span> Template
              </button>
            </div>
            
            <div 
              className={`w-full border-2 border-dashed rounded-lg py-xl px-lg flex flex-col items-center justify-center gap-sm transition-all cursor-pointer ${
                fileError ? 'border-error bg-error/5' : 
                isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 
                'border-outline-variant/50 hover:border-primary hover:bg-[#1f1f28]'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".csv"
              />
              
              {selectedFile ? (
                <div className="text-center">
                  <span className="material-symbols-outlined text-[32px] text-[#00D4AA] mb-2">check_circle</span>
                  <p className="font-code-md text-sm text-white">{selectedFile.name}</p>
                </div>
              ) : (
                <>
                  <span className={`material-symbols-outlined text-[32px] ${isDragging ? 'text-primary' : 'text-on-surface-variant'}`}>
                    table_view
                  </span>
                  <p className={`font-body-md ${isDragging ? 'text-primary' : 'text-white'}`}>
                    {isDragging ? 'Drop CSV here' : 'Drag and drop CSV here'}
                  </p>
                </>
              )}
            </div>
            {fileError && <p className="text-error text-xs mt-2">{fileError}</p>}
            
            {csvPreview.length > 0 && (
              <div className="mt-md border border-outline-variant/30 rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1b24] text-on-surface-variant font-label-caps uppercase">
                    <tr>
                      <th className="p-2 border-b border-outline-variant/30 w-1/2">Question</th>
                      <th className="p-2 border-b border-outline-variant/30 w-1/2">Ground Truth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="border-b border-outline-variant/20 last:border-0 bg-[#111118]">
                        <td className="p-2 text-on-surface-variant truncate max-w-[150px]">{row.question}</td>
                        <td className="p-2 text-on-surface-variant truncate max-w-[150px]">{row.ground_truth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button 
            onClick={handleRunEvaluation}
            disabled={!isRunEnabled || isEvaluating}
            className={`w-full py-4 rounded-lg font-label-caps text-sm flex items-center justify-center gap-sm transition-all shadow-lg ${
              !isRunEnabled 
                ? 'bg-surface-variant/50 text-outline-variant cursor-not-allowed' 
                : 'bg-primary hover:bg-[#5B54E6] text-white shadow-[0_0_20px_rgba(108,99,255,0.4)] hover:shadow-[0_0_30px_rgba(108,99,255,0.6)]'
            }`}
          >
            {isEvaluating ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                Running Eval...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Run Evaluation
              </>
            )}
          </button>
          
          {isEvaluating && (
            <div className="bg-[#111118] border border-primary/30 p-md rounded-lg animate-fade-in">
              <p className="font-code-md text-xs text-primary mb-2">Running {csvPreview.length > 0 ? 'questions' : 'evals'} across {selectedModels.length} models...</p>
              <div className="w-full h-2 bg-[#1b1b24] rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(108,99,255,0.8)]" style={{ width: `${evalProgress}%` }}></div>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">This may take 3-4 minutes. RAGAS makes multiple LLM calls per question.</p>
            </div>
          )}
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 flex flex-col gap-lg">
          {results ? (
            <div className="animate-slide-up flex flex-col gap-lg">
              {/* Winner Banner */}
              {results.leaderboard && results.leaderboard.length > 0 && (
                <div className="bg-primary/20 border border-primary shadow-[0_0_30px_rgba(108,99,255,0.15)] rounded-xl p-xl flex items-center gap-lg">
                  <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_0_20px_rgba(108,99,255,0.5)]">
                    <span className="material-symbols-outlined text-[32px]">emoji_events</span>
                  </div>
                  <div>
                    <h2 className="font-headline-lg text-white">🏆 {results.leaderboard[0].model} wins</h2>
                    <p className="font-body-md text-primary mt-1">with {(results.leaderboard[0].avg_score * 100).toFixed(1)}% avg score across all RAGAS metrics.</p>
                  </div>
                </div>
              )}

              {/* Leaderboard Table */}
              <div className="bg-[#111118] border border-outline-variant/30 rounded-xl overflow-hidden">
                <div className="p-md border-b border-outline-variant/30 bg-[#1b1b24]">
                  <h3 className="font-headline-md text-white">Leaderboard</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-code-md text-sm">
                    <thead className="bg-[#111118] text-on-surface-variant text-[10px] uppercase font-label-caps border-b border-outline-variant/20">
                      <tr>
                        <th className="p-md">Model</th>
                        <th className="p-md">Faithfulness</th>
                        <th className="p-md">Relevancy</th>
                        <th className="p-md">Precision</th>
                        <th className="p-md">Recall</th>
                        <th className="p-md text-white">Avg Score</th>
                        <th className="p-md">Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.leaderboard?.map((row: any, idx: number) => (
                        <tr key={row.model} className={`border-b border-outline-variant/20 last:border-0 ${idx === 0 ? 'bg-primary/5' : 'bg-[#111118]'}`}>
                          <td className="p-md font-code-md text-white flex items-center gap-2">
                            {idx === 0 && <span className="material-symbols-outlined text-primary text-[16px]">military_tech</span>}
                            {row.model}
                          </td>
                          <td className={`p-md ${getScoreColor(row.faithfulness)}`}>{row.faithfulness.toFixed(3)}</td>
                          <td className={`p-md ${getScoreColor(row.answer_relevancy)}`}>{row.answer_relevancy.toFixed(3)}</td>
                          <td className={`p-md ${getScoreColor(row.context_precision)}`}>{row.context_precision.toFixed(3)}</td>
                          <td className={`p-md ${getScoreColor(row.context_recall)}`}>{row.context_recall.toFixed(3)}</td>
                          <td className={`p-md font-bold ${getScoreColor(row.avg_score)}`}>{row.avg_score.toFixed(3)}</td>
                          <td className="p-md text-on-surface-variant">{row.avg_latency.toFixed(2)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                {/* Radar Chart */}
                <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-lg flex flex-col items-center">
                  <h3 className="font-headline-md text-white w-full mb-md">Metrics Radar</h3>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#2c2c38" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#a0a0ab', fontSize: 12, fontFamily: 'monospace' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#111118', borderColor: '#2c2c38', color: '#fff' }} />
                        {results.leaderboard?.map((lb: any, idx: number) => (
                          <Radar key={lb.model} name={lb.model} dataKey={lb.model} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.4} />
                        ))}
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Question Breakdown */}
                <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-md flex flex-col">
                   <h3 className="font-headline-md text-white mb-md">Per Question Breakdown</h3>
                   <div className="flex flex-col gap-sm">
                     {questionsList.map((q: any, i: number) => {
                       const isExpanded = expandedQuestions[i];
                       const qResults = results.results.filter((r: any) => r.question === q);
                       
                       return (
                         <div key={i} className="border border-outline-variant/30 rounded-lg overflow-hidden bg-[#1b1b24]">
                           <button 
                             onClick={() => setExpandedQuestions(prev => ({...prev, [i]: !prev[i]}))}
                             className="w-full p-sm flex items-start gap-sm hover:bg-surface-variant/30 transition-colors text-left"
                           >
                             <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">help</span>
                             <p className={`font-body-sm text-white flex-1 ${isExpanded ? '' : 'line-clamp-2'}`}>{q}</p>
                             <span className="material-symbols-outlined text-on-surface-variant text-[20px]" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                               expand_more
                             </span>
                           </button>
                           
                           {isExpanded && (
                             <div className="p-sm border-t border-outline-variant/30 bg-[#111118] flex flex-col gap-md">
                               {qResults.map((qr: any) => (
                                 <div key={qr.model} className="flex flex-col gap-xs">
                                   <div className="flex justify-between items-center">
                                     <span className="font-code-md text-xs text-primary">{qr.model}</span>
                                     <div className="flex gap-2">
                                       <span className={`font-code-md text-[10px] px-1.5 py-0.5 rounded border ${getBgScoreColor(qr.faithfulness)} ${getScoreColor(qr.faithfulness)}`} title="Faithfulness">F: {qr.faithfulness?.toFixed(2) || '0.00'}</span>
                                       <span className={`font-code-md text-[10px] px-1.5 py-0.5 rounded border ${getBgScoreColor(qr.answer_relevancy)} ${getScoreColor(qr.answer_relevancy)}`} title="Relevancy">R: {qr.answer_relevancy?.toFixed(2) || '0.00'}</span>
                                     </div>
                                   </div>
                                   <p className="font-body-sm text-xs text-on-surface-variant border-l-2 border-outline-variant/50 pl-sm whitespace-pre-wrap">
                                     {qr.answer}
                                   </p>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex-1 flex flex-col items-center justify-center text-on-surface-variant gap-md bg-[#111118] border border-outline-variant/30 border-dashed rounded-xl p-xl">
              <span className="material-symbols-outlined text-[64px] opacity-20 text-center">analytics</span>
              <p className="font-body-lg text-center w-full px-lg">
                Complete setup and run evaluation to see leaderboard, charts, and deep analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
