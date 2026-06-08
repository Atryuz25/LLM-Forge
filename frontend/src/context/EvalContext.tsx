"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

interface EvalContextType {
  isEvaluating: boolean;
  evalProgress: number;
  evalResults: any;
  runEvaluation: (pipelineId: string, file: File, models: string[]) => Promise<void>;
  resetEval: () => void;
}

const EvalContext = createContext<EvalContextType | undefined>(undefined);

export function EvalProvider({ children }: { children: ReactNode }) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalResults, setEvalResults] = useState<any>(null);

  const runEvaluation = async (pipelineId: string, file: File, models: string[]) => {
    if (isEvaluating) return;
    
    setIsEvaluating(true);
    setEvalResults(null);
    setEvalProgress(0);

    const interval = setInterval(() => {
      setEvalProgress((p) => {
        if (p > 90) return p;
        return p + Math.random() * 15;
      });
    }, 1500);

    try {
      const res = await api.runEval(pipelineId, file, models);
      clearInterval(interval);
      setEvalProgress(100);
      setEvalResults(res);
      toast.success("Evaluation complete!");
      // Don't turn isEvaluating off so the progress bar stays at 100% until they explicitly reset or we handle it
      setTimeout(() => setIsEvaluating(false), 1000); 
    } catch (e) {
      clearInterval(interval);
      toast.error("Eval failed. Check rate limits or reduce model count.");
      setIsEvaluating(false);
      setEvalProgress(0);
    }
  };

  const resetEval = () => {
    setIsEvaluating(false);
    setEvalResults(null);
    setEvalProgress(0);
  };

  return (
    <EvalContext.Provider value={{ isEvaluating, evalProgress, evalResults, runEvaluation, resetEval }}>
      {children}
    </EvalContext.Provider>
  );
}

export function useEval() {
  const context = useContext(EvalContext);
  if (context === undefined) {
    throw new Error("useEval must be used within an EvalProvider");
  }
  return context;
}
