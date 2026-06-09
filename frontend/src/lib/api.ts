import axios from "axios";
import { auth } from "./firebase";

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
});

axiosInstance.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

const api = {
  listPipelines: async () => {
    try {
      const res = await axiosInstance.get("/pipeline/list");
      return res.data;
    } catch (e) {
      console.warn("listPipelines failed, returning empty", e);
      return { pipelines: [] };
    }
  },
  createPipeline: async (name: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axiosInstance.post(`/pipeline/ingest/${name}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  queryPipeline: async (id: string, question: string, model: string) => {
    const res = await axiosInstance.post(`/pipeline/query/${id}`, { question, model });
    return res.data;
  },
  getDashboard: async (id: string) => {
    const res = await axiosInstance.get(`/monitor/dashboard/${id}`);
    return res.data;
  },
  getLogs: async (id: string) => {
    const res = await axiosInstance.get(`/monitor/logs/${id}`);
    return res.data;
  },
  runEval: async (id: string, file: File, models: string[]) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axiosInstance.post(`/eval/run/${id}?models=${models.join(",")}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },
  listModels: async () => {
    const res = await axiosInstance.get("/eval/models");
    return res.data;
  },
  runABTest: async (promptA: string, promptB: string, testCases: any[], model: string) => {
    const res = await axiosInstance.post(`/prompt/ab-test`, {
      prompt_a: promptA,
      prompt_b: promptB,
      test_cases: testCases,
      model: model
    });
    return res.data;
  },
  getPromptHistory: async () => {
    const res = await axiosInstance.get(`/prompt/history`);
    return res.data;
  },

  deletePipeline: async (pipelineId: string) => {
    const res = await axiosInstance.delete(`/pipeline/delete/${pipelineId}`);
    return res.data;
  },

  deleteFileFromPipeline: async (pipelineId: string, fileName: string) => {
    const res = await axiosInstance.delete(`/pipeline/delete/${pipelineId}/file`, {
      data: { file_name: fileName }
    });
    return res.data;
  },
};

export default api;
