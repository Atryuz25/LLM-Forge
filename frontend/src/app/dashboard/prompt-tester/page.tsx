"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

const MODELS: Record<string, { label: string, maxTokens: number }> = {
  "groq-llama": { label: "Llama 3.3 70B (Fast)", maxTokens: 8000 },
  "groq-mixtral": { label: "Mixtral 8x7B", maxTokens: 32768 },
  "groq-gemma": { label: "Gemma 2 9B", maxTokens: 8192 },
  "gemini-flash": { label: "Gemini 1.5 Flash", maxTokens: 1000000 },
  "gemini-pro": { label: "Gemini 1.5 Pro", maxTokens: 1000000 }
};

export default function PromptTesterPage() {
  const [model, setModel] = useState("groq-llama");
  
  const [promptA, setPromptA] = useState("");
  const [promptB, setPromptB] = useState("");
  
  const [testCases, setTestCases] = useState<string[]>(["", "", ""]);
  
  const [isTesting, setIsTesting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  
  const [resultA, setResultA] = useState<any>(null);
  const [resultB, setResultB] = useState<any>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [expandedQs, setExpandedQs] = useState<Record<number, boolean>>({});

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchHistory();
    });
    return () => unsubscribe();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.getPromptHistory();
      if (res && res.history) setHistory(res.history);
    } catch (e) {
      console.error(e);
    }
  };

  const countTokens = (text: string) => Math.ceil(text.length / 4);

  const handleAddTestCase = () => {
    if (testCases.length < 10) {
      setTestCases([...testCases, ""]);
    }
  };

  const handleUpdateTestCase = (index: number, value: string) => {
    const newCases = [...testCases];
    newCases[index] = value;
    setTestCases(newCases);
  };

  const handleDeleteTestCase = (index: number) => {
    if (testCases.length > 1) {
      const newCases = [...testCases];
      newCases.splice(index, 1);
      setTestCases(newCases);
    }
  };

  const handleTest = async () => {
    if (!promptA.trim() || !promptB.trim()) return;

    setIsTesting(true);
    setResultA(null);
    setResultB(null);
    setWinner(null);
    setExpandedQs({});

    setProgressMsg(`Testing Version A... (0/${testCases.length} questions)`);

    // Simulate progress messages since backend does it all in one request
    let simIdx = 0;
    const simInterval = setInterval(() => {
      simIdx++;
      if (simIdx <= testCases.length) {
        setProgressMsg(`Testing Version A... (${simIdx}/${testCases.length} questions)`);
      } else if (simIdx <= testCases.length * 2) {
        setProgressMsg(`Testing Version B... (${simIdx - testCases.length}/${testCases.length} questions)`);
      }
    }, 800);

    try {
      const formattedCases = testCases.map(q => ({ question: q }));
      const res = await api.runABTest(promptA, promptB, formattedCases, model);
      
      clearInterval(simInterval);
      setResultA(res.version_a);
      setResultB(res.version_b);
      setWinner(res.winner);
      fetchHistory();
      toast.success("✅ A/B test complete");
    } catch (e) {
      clearInterval(simInterval);
      toast.error("❌ Failed to run A/B test. Check API limits.");
    } finally {
      setIsTesting(false);
      setProgressMsg("");
    }
  };

  const getPercentageColor = (tokens: number, max: number) => {
    const pct = tokens / max;
    if (pct > 0.9) return "text-[#EF4444]";
    if (pct > 0.7) return "text-[#F59E0B]";
    return "text-primary";
  };

  const tokensA = countTokens(promptA);
  const tokensB = countTokens(promptB);
  const maxTokens = MODELS[model]?.maxTokens || 8000;

  // Comparison Metrics
  const questionsWonA = resultA?.results ? resultA.results.filter((r: any, i: number) => r.latency < (resultB?.results[i]?.latency || 999)).length : 0;
  const questionsWonB = resultB?.results ? resultB.results.filter((r: any, i: number) => r.latency < (resultA?.results[i]?.latency || 999)).length : 0;
  
  const fasterPct = resultA && resultB ? Math.abs(1 - (resultB.avg_latency / resultA.avg_latency)) * 100 : 0;
  const concisePct = resultA && resultB ? Math.abs(1 - (resultB.avg_length / resultA.avg_length)) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto flex flex-col animate-fade-in relative overflow-hidden pb-xl">
      <header className="flex justify-between items-end mb-lg border-b border-outline-variant/30 pb-md">
        <div>
          <h2 className="font-headline-lg text-white">Prompt Tester</h2>
          <p className="font-body-sm text-on-surface-variant mt-sm">A/B test prompt variations side-by-side.</p>
        </div>
        <button 
          onClick={() => setIsHistoryOpen(true)}
          className="bg-surface-variant/30 hover:bg-surface-variant text-white font-label-caps text-xs px-md py-sm rounded border border-outline-variant transition-colors flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          View History
        </button>
      </header>

      <div className="flex justify-between items-center bg-[#111118] border border-outline-variant/30 p-sm rounded-lg mb-lg">
        <div className="flex items-center gap-md">
          <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-sm">Model</label>
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isTesting}
            className="bg-[#1f1f28] border border-[#1E1E2E] focus:border-primary rounded-md px-3 py-2 text-white outline-none font-code-md text-sm cursor-pointer disabled:opacity-50"
          >
            {Object.entries(MODELS).map(([id, info]) => (
              <option key={id} value={id}>{info.label}</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={handleTest}
          disabled={isTesting || !promptA.trim() || !promptB.trim()}
          className="bg-primary hover:bg-[#5B54E6] disabled:opacity-50 text-white font-label-caps text-sm px-xl py-2 rounded transition-colors shadow-[0_0_15px_rgba(108,99,255,0.3)] flex items-center gap-sm mr-sm"
        >
          {isTesting ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
              {progressMsg || "Running..."}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
              Run A/B Test
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
        {/* Version A Panel */}
        <div className="flex flex-col gap-sm bg-[#111118] border border-outline-variant/30 rounded-xl overflow-hidden h-[300px]">
          <div className="p-md flex justify-between items-center border-b border-outline-variant/30 bg-[#1b1b24]">
            <span className="font-label-caps text-sm text-white">Version A</span>
            <span className={`font-code-md text-[10px] ${getPercentageColor(tokensA, maxTokens)}`}>
              Tokens: ~{tokensA.toLocaleString()} {tokensA > 500 && "⚠️"}
            </span>
          </div>
          <textarea 
            value={promptA}
            onChange={(e) => setPromptA(e.target.value)}
            placeholder="Write your first prompt here. Use {question} where the question should be injected."
            className="flex-1 w-full bg-transparent border-0 p-md font-body-sm text-white placeholder:text-zinc-600 outline-none resize-none custom-scrollbar"
            disabled={isTesting}
          />
        </div>

        {/* Version B Panel */}
        <div className="flex flex-col gap-sm bg-[#111118] border border-outline-variant/30 rounded-xl overflow-hidden h-[300px]">
          <div className="p-md flex justify-between items-center border-b border-outline-variant/30 bg-[#1b1b24]">
            <span className="font-label-caps text-sm text-white">Version B</span>
            <span className={`font-code-md text-[10px] ${getPercentageColor(tokensB, maxTokens)}`}>
              Tokens: ~{tokensB.toLocaleString()} {tokensB > 500 && "⚠️"}
            </span>
          </div>
          <textarea 
            value={promptB}
            onChange={(e) => setPromptB(e.target.value)}
            placeholder="Write your first prompt here. Use {question} where the question should be injected."
            className="flex-1 w-full bg-transparent border-0 p-md font-body-sm text-white placeholder:text-zinc-600 outline-none resize-none custom-scrollbar"
            disabled={isTesting}
          />
        </div>
      </div>

      {/* Test Cases */}
      <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-md mb-xl">
        <div className="flex justify-between items-center mb-md border-b border-outline-variant/30 pb-sm">
          <h3 className="font-headline-md text-white">Test Cases</h3>
          <span className="font-code-md text-xs text-primary">{testCases.length}/10</span>
        </div>
        
        <div className="flex flex-col gap-sm">
          {testCases.map((tc, idx) => (
            <div key={idx} className="flex items-center gap-sm group">
              <span className="font-code-md text-xs text-on-surface-variant w-4">{idx + 1}.</span>
              <input 
                type="text"
                value={tc}
                onChange={(e) => handleUpdateTestCase(idx, e.target.value)}
                disabled={isTesting}
                placeholder="Enter a test question..."
                className="flex-1 bg-[#1b1b24] border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded p-sm font-body-sm text-white outline-none disabled:opacity-50"
              />
              <button 
                onClick={() => handleDeleteTestCase(idx)}
                disabled={isTesting || testCases.length === 1}
                title={testCases.length === 1 ? "Minimum 1 test case required" : "Delete test case"}
                className="text-outline-variant hover:text-error disabled:opacity-20 transition-colors p-1"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          ))}
        </div>
        
        <button 
          onClick={handleAddTestCase}
          disabled={isTesting || testCases.length >= 10}
          title={testCases.length >= 10 ? "Max 10 test cases" : "Add test case"}
          className="mt-md flex items-center gap-1 text-primary hover:text-white font-label-caps text-xs disabled:opacity-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span> Add Test Case
        </button>
      </div>

      {/* Results Section */}
      {resultA && resultB && (
        <div className="animate-slide-up flex flex-col gap-lg">
          <div className="bg-primary/20 border border-primary rounded-xl p-lg flex items-center gap-lg">
            <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_0_20px_rgba(108,99,255,0.5)]">
              <span className="material-symbols-outlined text-[32px]">emoji_events</span>
            </div>
            <div>
              <h2 className="font-headline-lg text-white">🏆 {winner} wins</h2>
              <p className="font-body-md text-primary mt-1">
                {fasterPct > 0 ? `${fasterPct.toFixed(0)}% faster · ` : ''}
                {concisePct > 0 ? `${concisePct.toFixed(0)}% more concise · ` : ''}
                same accuracy
              </p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-[#111118] border border-outline-variant/30 rounded-xl overflow-hidden">
            <table className="w-full text-left font-code-md text-sm">
              <thead className="bg-[#1b1b24] text-on-surface-variant text-[10px] uppercase font-label-caps border-b border-outline-variant/30">
                <tr>
                  <th className="p-md w-1/3">Metric</th>
                  <th className="p-md w-1/3 text-white">Version A</th>
                  <th className="p-md w-1/3 text-white">Version B</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant/20 bg-[#111118]">
                  <td className="p-md text-on-surface-variant">Avg Latency</td>
                  <td className={`p-md ${resultA.avg_latency <= resultB.avg_latency ? 'text-[#00D4AA]' : 'text-white'}`}>
                    {resultA.avg_latency.toFixed(2)}s {resultA.avg_latency <= resultB.avg_latency && '✅'}
                  </td>
                  <td className={`p-md ${resultB.avg_latency <= resultA.avg_latency ? 'text-[#00D4AA]' : 'text-white'}`}>
                    {resultB.avg_latency.toFixed(2)}s {resultB.avg_latency <= resultA.avg_latency && '✅'}
                  </td>
                </tr>
                <tr className="border-b border-outline-variant/20 bg-[#111118]">
                  <td className="p-md text-on-surface-variant">Avg Length</td>
                  <td className={`p-md ${resultA.avg_length <= resultB.avg_length ? 'text-[#00D4AA]' : 'text-white'}`}>
                    {resultA.avg_length} chars {resultA.avg_length <= resultB.avg_length && '✅'}
                  </td>
                  <td className={`p-md ${resultB.avg_length <= resultA.avg_length ? 'text-[#00D4AA]' : 'text-white'}`}>
                    {resultB.avg_length} chars {resultB.avg_length <= resultA.avg_length && '✅'}
                  </td>
                </tr>
                <tr className="bg-[#111118]">
                  <td className="p-md text-on-surface-variant">Questions Won</td>
                  <td className={`p-md ${questionsWonA >= questionsWonB ? 'text-[#00D4AA]' : 'text-white'}`}>
                    {questionsWonA}/{testCases.length} {questionsWonA >= questionsWonB && '✅'}
                  </td>
                  <td className={`p-md ${questionsWonB >= questionsWonA ? 'text-[#00D4AA]' : 'text-white'}`}>
                    {questionsWonB}/{testCases.length} {questionsWonB >= questionsWonA && '✅'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Per Question Breakdown */}
          <h3 className="font-headline-md text-white mt-md">Per Question Breakdown</h3>
          <div className="flex flex-col gap-md">
            {testCases.map((tc, i) => {
              const ansA = resultA.results[i];
              const ansB = resultB.results[i];
              const isExpanded = expandedQs[i];
              
              return (
                <div key={i} className="border border-outline-variant/30 rounded-xl overflow-hidden bg-[#1b1b24]">
                  <button 
                    onClick={() => setExpandedQs({...expandedQs, [i]: !isExpanded})}
                    className="w-full p-md flex items-start gap-sm hover:bg-surface-variant/30 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">help</span>
                    <p className={`font-body-sm text-white flex-1 ${isExpanded ? '' : 'line-clamp-1'}`}>{tc || "Empty prompt"}</p>
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      expand_more
                    </span>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-md border-t border-outline-variant/30 bg-[#111118] grid grid-cols-2 gap-lg">
                      <div className="flex flex-col gap-sm">
                        <span className="font-label-caps text-[10px] text-on-surface-variant">Version A</span>
                        <div className="font-body-sm text-sm text-white bg-[#1b1b24] p-sm rounded border border-outline-variant/20 whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar">
                          {ansA?.answer}
                        </div>
                        <div className="flex gap-2">
                          <span className="font-code-md text-[10px] bg-surface-variant/30 px-2 py-1 rounded text-on-surface-variant">{ansA?.latency.toFixed(2)}s</span>
                          <span className="font-code-md text-[10px] bg-surface-variant/30 px-2 py-1 rounded text-on-surface-variant">{ansA?.answer.length} chars</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-sm">
                        <span className="font-label-caps text-[10px] text-on-surface-variant">Version B</span>
                        <div className="font-body-sm text-sm text-white bg-[#1b1b24] p-sm rounded border border-outline-variant/20 whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar">
                          {ansB?.answer}
                        </div>
                        <div className="flex gap-2">
                          <span className="font-code-md text-[10px] bg-surface-variant/30 px-2 py-1 rounded text-on-surface-variant">{ansB?.latency.toFixed(2)}s</span>
                          <span className="font-code-md text-[10px] bg-surface-variant/30 px-2 py-1 rounded text-on-surface-variant">{ansB?.answer.length} chars</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History Drawer */}
      <div className={`fixed inset-y-0 right-0 w-[400px] max-w-full bg-[#111118] border-l border-outline-variant/50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-lg border-b border-outline-variant/30 flex justify-between items-center bg-[#1b1b24]">
          <h3 className="font-headline-md text-white">Test History</h3>
          <button onClick={() => setIsHistoryOpen(false)} className="text-on-surface-variant hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-md flex flex-col gap-md custom-scrollbar">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant gap-sm">
              <span className="material-symbols-outlined opacity-50 text-[32px]">history_toggle_off</span>
              <p className="font-body-sm text-xs">No history found</p>
            </div>
          ) : (
            history.map((run, i) => (
              <div key={run.run_id || i} className="bg-[#1f1f28] border border-outline-variant/20 rounded-lg p-sm hover:border-primary/50 cursor-pointer" onClick={() => toast.info(`Run ID: ${run.run_id}`)}>
                <div className="flex justify-between items-center mb-xs">
                  <span className="font-label-caps text-[10px] text-primary">{run.model || "Unknown Model"}</span>
                  <span className="font-code-md text-[10px] text-on-surface-variant">{new Date(Number(run.start_time)).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center mt-sm pt-sm border-t border-outline-variant/10">
                  <span className="font-code-md text-xs text-white">Winner: {run.winner || "N/A"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {isHistoryOpen && <div className="fixed inset-0 bg-[#0e0d16]/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsHistoryOpen(false)} />}
    </div>
  );
}
