"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#6C63FF', '#00D4AA', '#F59E0B', '#EF4444', '#8781ff'];

export default function MonitorPage() {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchPipelines();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedPipeline) return;
    
    fetchDashboard(selectedPipeline);
    setCountdown(30);
  }, [selectedPipeline]);

  useEffect(() => {
    if (!autoRefresh || !selectedPipeline) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboard(selectedPipeline, true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, selectedPipeline]);

  const fetchPipelines = async () => {
    try {
      const res = await api.listPipelines();
      setPipelines(res.pipelines);
      if (res.pipelines.length > 0) {
        setSelectedPipeline(res.pipelines[0].id || res.pipelines[0]);
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchDashboard = async (pipelineId: string, background = false) => {
    if (!background) setLoading(true);
    try {
      const res = await api.getDashboard(pipelineId);
      setDashboardData(res);
    } catch (e) {
      console.error(e);
      if (!background) toast.error("❌ Failed to fetch dashboard data.");
    } finally {
      if (!background) setLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto animate-fade-in space-y-lg">
        <header className="flex justify-between items-end mb-xl">
          <div>
            <h2 className="font-headline-lg text-white">Monitor Telemetry</h2>
            <p className="font-body-sm text-on-surface-variant mt-sm">Live observability and usage analytics.</p>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
          {[1,2,3,4].map(i => <div key={i} className="h-[120px] bg-surface-variant/20 animate-pulse rounded-xl" />)}
        </div>
        <div className="h-[400px] bg-surface-variant/20 animate-pulse rounded-xl mt-lg" />
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-[50vh] text-center">
        <span className="material-symbols-outlined text-[64px] text-primary/50 mb-md">monitoring</span>
        <h2 className="font-headline-md text-white mb-sm">No Active Pipelines</h2>
        <p className="font-body-sm text-on-surface-variant">Create a RAG pipeline first to start monitoring telemetry.</p>
      </div>
    );
  }

  // Format daily trend data for Recharts
  const trendData = dashboardData?.daily_trend 
    ? Object.keys(dashboardData.daily_trend).map(date => ({
        date,
        queries: dashboardData.daily_trend[date].queries || 0,
        avg_latency: dashboardData.daily_trend[date].avg_latency || 0,
      })).sort((a,b) => a.date.localeCompare(b.date))
    : [];

  // Format model usage data for Recharts PieChart
  const modelUsageData = dashboardData?.model_breakdown
    ? Object.keys(dashboardData.model_breakdown).map(model => ({
        name: model,
        value: dashboardData.model_breakdown[model]
      }))
    : [];

  const avgScorePct = (dashboardData?.avg_score || 0) * 100;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#00D4AA]";
    if (score >= 60) return "text-[#F59E0B]";
    return "text-[#EF4444]";
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 1) return "text-[#00D4AA]";
    if (latency <= 2) return "text-[#F59E0B]";
    return "text-[#EF4444]";
  };

  const overallAvgLatency = trendData.length > 0 
    ? trendData.reduce((acc, curr) => acc + curr.avg_latency, 0) / trendData.length 
    : 0;
  const latencyLineColor = overallAvgLatency < 1 ? '#00D4AA' : '#F59E0B';

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-lg pb-xl">
      <header className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-lg text-white">Monitor Telemetry</h2>
          <p className="font-body-sm text-on-surface-variant mt-sm">Live observability and usage analytics.</p>
        </div>
        
        <div className="flex items-center gap-xl bg-[#111118] p-sm rounded-lg border border-outline-variant/30">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">target</span>
            <select 
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="bg-transparent text-white font-code-md text-sm outline-none cursor-pointer"
            >
              {pipelines.map((p: any) => {
                const id = typeof p === 'string' ? p : (p.id || p.name || String(p));
                return (
                  <option key={id} value={id}>{p.name || id}</option>
                );
              })}<option value="all" className="bg-[#111118]">Global (All Pipelines)</option>
            </select>
          </div>
          
          <div className="w-px h-6 bg-outline-variant/30" />

          <div className="flex items-center gap-sm">
            <button 
              onClick={() => {
                setAutoRefresh(!autoRefresh);
                if (!autoRefresh) setCountdown(30);
              }}
              className={`material-symbols-outlined text-[18px] transition-colors ${autoRefresh ? 'text-primary animate-pulse' : 'text-on-surface-variant'}`}
            >
              {autoRefresh ? 'sync' : 'sync_disabled'}
            </button>
            <span className="font-code-md text-[10px] text-on-surface-variant">
              {autoRefresh ? `Last updated: ${30 - countdown}s ago` : 'Auto-refresh paused'}
            </span>
          </div>
        </div>
      </header>

      {/* Top Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-md relative overflow-hidden">
          <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mb-xs">Total Queries</p>
          <div className="flex items-end gap-sm">
            <h3 className="font-headline-lg text-3xl text-white">{dashboardData?.total_queries || 0}</h3>
            {dashboardData?.total_queries > 0 && <span className="font-label-caps text-[10px] text-[#00D4AA] mb-1">↑ 12% vs last week</span>}
          </div>
        </div>

        <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-md relative overflow-hidden">
          <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mb-xs">Avg Latency</p>
          <div className="flex items-end gap-sm">
            <h3 className={`font-headline-lg text-3xl ${getLatencyColor(dashboardData?.avg_latency || 0)}`}>
              {(dashboardData?.avg_latency || 0).toFixed(2)}s
            </h3>
          </div>
        </div>

        <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-md relative overflow-hidden">
          <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mb-xs">Avg Score</p>
          <div className="flex items-end gap-sm">
            <h3 className={`font-headline-lg text-3xl ${getScoreColor(avgScorePct)}`}>
              {avgScorePct.toFixed(1)}%
            </h3>
          </div>
        </div>

        <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-md relative overflow-hidden">
          <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mb-xs">Total API Cost (Est.)</p>
          <div className="flex items-end gap-sm">
            <h3 className="font-headline-lg text-3xl text-white">${(dashboardData?.total_cost_usd || 0).toFixed(4)}</h3>
            <span className="font-label-caps text-[10px] text-on-surface-variant mb-1">(free tier)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Daily Trend Area Chart */}
        <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-lg flex flex-col h-[300px]">
          <h3 className="font-headline-md text-white mb-md">Query Volume (Last 7 Days)</h3>
          <div className="flex-1">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#464555" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis stroke="#464555" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1b1b24', border: '1px solid #2e2e38', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#6C63FF' }}
                    labelFormatter={(label) => `${label}`}
                    formatter={(val: any) => [`${val} queries`, 'Volume']}
                  />
                  <Area type="monotone" dataKey="queries" stroke="#6C63FF" strokeWidth={3} fillOpacity={1} fill="url(#colorQueries)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center font-body-sm text-on-surface-variant">No query data</div>
            )}
          </div>
        </div>

        {/* Latency Trend Line Chart */}
        <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-lg flex flex-col h-[300px]">
          <h3 className="font-headline-md text-white mb-md">Avg Latency (Last 7 Days)</h3>
          <div className="flex-1">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="date" stroke="#464555" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis stroke="#464555" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1b1b24', border: '1px solid #2e2e38', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                    labelFormatter={(label) => `${label}`}
                    formatter={(val: any) => [`${val}s`, 'Latency']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg_latency" 
                    stroke={latencyLineColor} 
                    strokeWidth={3} 
                    dot={{r: 3, fill: latencyLineColor}} 
                    activeDot={{r: 5}} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center font-body-sm text-on-surface-variant">No latency data</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Model Usage Donut Chart */}
        <div className="bg-[#111118] border border-outline-variant/30 rounded-xl p-lg flex flex-col items-center">
          <h3 className="font-headline-md text-white w-full text-left mb-md">Model Usage Distribution</h3>
          <div className="w-full h-[250px] relative">
            {modelUsageData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelUsageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {modelUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1b1b24', border: '1px solid #2e2e3d', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val: any, name: any) => [`${val} queries`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-headline-lg text-white">{dashboardData?.total_queries}</span>
                  <span className="font-label-caps text-[10px] text-on-surface-variant">Queries</span>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center font-body-sm text-on-surface-variant">No usage data</div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-sm">
            {modelUsageData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1 font-code-md text-[10px] text-on-surface-variant">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length]}}></span>
                {entry.name}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Queries Table */}
        <div className="lg:col-span-2 bg-[#111118] border border-outline-variant/30 rounded-xl overflow-hidden flex flex-col">
          <div className="p-md border-b border-outline-variant/30 bg-[#1b1b24]">
            <h3 className="font-headline-md text-white">Recent Queries</h3>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left font-code-md text-sm border-collapse">
              <thead>
                <tr className="bg-[#1f1f28] border-b border-outline-variant/30 font-label-caps text-[10px] uppercase text-on-surface-variant">
                  <th className="px-md py-sm">Question</th>
                  <th className="px-md py-sm">Model</th>
                  <th className="px-md py-sm">Latency</th>
                  <th className="px-md py-sm">Score</th>
                  <th className="px-md py-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.recent_logs && dashboardData.recent_logs.length > 0 ? (
                  dashboardData.recent_logs.map((log: any) => {
                    const isExpanded = expandedLogId === log.id;
                    const isSuccess = log.answer && log.answer.length > 0 && !log.answer.includes("Failed to");
                    
                    const timeAgo = Math.floor((Date.now() - new Date(log.created_at).getTime()) / 60000);
                    const timeStr = timeAgo < 60 ? `${timeAgo} mins ago` : `${Math.floor(timeAgo/60)} hours ago`;
                    
                    const scorePct = log.score ? log.score * 100 : null;

                    return (
                      <React.Fragment key={log.id}>
                        <tr 
                          className={`border-b border-outline-variant/10 hover:bg-surface-variant/10 cursor-pointer transition-colors ${isExpanded ? 'bg-surface-variant/20' : ''}`}
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        >
                          <td className="px-md py-sm font-body-sm text-sm text-white max-w-[200px] truncate" title={log.question}>
                            <span className="mr-2 align-middle">
                              {isSuccess ? <span className="text-[#00D4AA]">✅</span> : <span className="text-error">❌</span>}
                            </span>
                            {log.question.length > 60 ? log.question.substring(0, 60) + '...' : log.question}
                          </td>
                          <td className="px-md py-sm text-primary text-[10px] bg-primary/10 rounded inline-block mt-2 mb-2 ml-md px-1.5 py-0.5">
                            {log.model}
                          </td>
                          <td className={`px-md py-sm ${getLatencyColor(log.latency)}`}>
                            {log.latency.toFixed(2)}s
                          </td>
                          <td className="px-md py-sm">
                            {scorePct !== null ? (
                              <span className={getScoreColor(scorePct)}>{scorePct.toFixed(0)}%</span>
                            ) : (
                              <span className="text-on-surface-variant">-</span>
                            )}
                          </td>
                          <td className="px-md py-sm text-on-surface-variant text-[10px]">
                            {timeStr}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[#111118]">
                            <td colSpan={5} className="p-md border-b border-outline-variant/30">
                              <div className="flex flex-col gap-sm">
                                <div>
                                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase mb-1 block">Full Prompt</span>
                                  <p className="font-body-sm text-sm text-white bg-[#1b1b24] p-sm rounded border border-outline-variant/20 whitespace-pre-wrap">
                                    {log.question}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase mb-1 block">LLM Answer</span>
                                  <p className="font-body-sm text-sm text-white bg-[#1b1b24] p-sm rounded border border-outline-variant/20 whitespace-pre-wrap border-l-2 border-l-primary">
                                    {log.answer}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-xl text-center font-body-sm text-on-surface-variant">
                      No queries executed yet. Run a query in the Pipelines tab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
