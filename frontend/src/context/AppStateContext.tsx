"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Pipeline {
  id: string;
  name: string;
  status?: string;
  chunks?: number;
  files?: string[];
  queries?: number;
  updated?: string;
}

interface EvalState {
  pipelineId: string;
  selectedModels: string[];
  selectedFile: File | null;
  csvPreview: any[];
  evalResults: any;
  isEvaluating: boolean;
  evalProgress: number;
}

interface PromptTesterState {
  model: string;
  promptA: string;
  promptB: string;
  testCases: string[];
  resultA: any;
  resultB: any;
  winner: string | null;
  isTesting: boolean;
  progressMsg: string;
}

interface AppStateType {
  // ── Pipelines ──────────────────────────────────────────────────────────────
  pipelines: Pipeline[];
  pipelinesLoaded: boolean;
  pipelinesLoading: boolean;
  fetchPipelines: () => Promise<void>;

  // ── Evaluations ────────────────────────────────────────────────────────────
  evalState: EvalState;
  setEvalState: React.Dispatch<React.SetStateAction<EvalState>>;

  // ── Prompt Tester ──────────────────────────────────────────────────────────
  promptState: PromptTesterState;
  setPromptState: React.Dispatch<React.SetStateAction<PromptTesterState>>;
}

const DEFAULT_EVAL_STATE: EvalState = {
  pipelineId: "",
  selectedModels: [],
  selectedFile: null,
  csvPreview: [],
  evalResults: null,
  isEvaluating: false,
  evalProgress: 0,
};

const DEFAULT_PROMPT_STATE: PromptTesterState = {
  model: "groq-llama",
  promptA: "",
  promptB: "",
  testCases: [],   // empty = direct comparison mode (no test questions)
  resultA: null,
  resultB: null,
  winner: null,
  isTesting: false,
  progressMsg: "",
};

const AppStateContext = createContext<AppStateType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  // ── Pipelines ──────────────────────────────────────────────────────────────
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelinesLoaded, setPipelinesLoaded] = useState(false);
  const [pipelinesLoading, setPipelinesLoading] = useState(false);

  const fetchPipelines = useCallback(async () => {
    setPipelinesLoading(true);
    try {
      const data = await api.listPipelines();
      if (data?.pipelines) {
        setPipelines(data.pipelines);
        setPipelinesLoaded(true);
      }
    } catch (e) {
      console.error("Failed to fetch pipelines", e);
    } finally {
      setPipelinesLoading(false);
    }
  }, []);

  // ── Evaluations ────────────────────────────────────────────────────────────
  const [evalState, setEvalState] = useState<EvalState>(DEFAULT_EVAL_STATE);

  // ── Prompt Tester ──────────────────────────────────────────────────────────
  const [promptState, setPromptState] = useState<PromptTesterState>(DEFAULT_PROMPT_STATE);

  return (
    <AppStateContext.Provider
      value={{
        pipelines,
        pipelinesLoaded,
        pipelinesLoading,
        fetchPipelines,
        evalState,
        setEvalState,
        promptState,
        setPromptState,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
