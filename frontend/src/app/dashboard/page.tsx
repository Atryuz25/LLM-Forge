"use client";

import { useAuth } from "@/components/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import Link from "next/link";
import { useRouter } from "next/navigation";

const COLORS = ['#6C63FF', '#00D4AA', '#F59E0B', '#EF4444', '#8781ff'];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [chartDays, setChartDays] = useState<7 | 30>(7);
  const [stats, setStats] = useState<any>({
    total_queries: 0,
    avg_latency: 0.0,
    daily_trend: [],
    model_breakdown: []
  });
  const [fullDailyTrend, setFullDailyTrend] = useState<any[]>([]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const pips = await api.listPipelines();
      const pipelineList = pips.pipelines || [];
      setPipelines(pipelineList);

      if (pipelineList.length > 0) {
        const dash = await api.getDashboard("all");
        
        const parsedDaily = Object.entries(dash.daily_trend || {}).map(([k, v]) => ({ date: k, queries: v }));
        const parsedModels = Object.entries(dash.model_breakdown || {}).map(([k, v]) => ({ model: k, queries: v }));
        
        setFullDailyTrend(parsedDaily);

        setStats({
          ...dash,
          daily_trend: parsedDaily.slice(-chartDays),
          model_breakdown: parsedModels
        });
      }
    } catch (err) {
      console.error("Dashboard fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (fullDailyTrend.length > 0) {
      setStats((prev: any) => ({
        ...prev,
        daily_trend: fullDailyTrend.slice(-chartDays)
      }));
    }
  }, [chartDays, fullDailyTrend]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111118] border border-outline-variant p-sm rounded shadow-lg text-white font-code-md text-sm">
          <p className="mb-1 text-on-surface-variant">{label}</p>
          <p className="text-primary">{`Queries: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 1) return "text-[#00D4AA]";
    if (latency <= 2) return "text-[#F59E0B]";
    return "text-[#EF4444]";
  };

  const getQueryTrend = () => {
    if (fullDailyTrend.length < 2) return null;
    const today = fullDailyTrend[fullDailyTrend.length - 1].queries;
    const yesterday = fullDailyTrend[fullDailyTrend.length - 2].queries;
    if (yesterday === 0) return { diff: today > 0 ? 100 : 0, isUp: today > 0 };
    const diff = Math.round(((today - yesterday) / yesterday) * 100);
    return { diff: Math.abs(diff), isUp: diff >= 0 };
  };

  const queryTrend = getQueryTrend();

  return (
    <div className="max-w-7xl mx-auto space-y-xl pb-xl animate-fade-in duration-300">
      <header className="mb-xl">
        <h1 className="font-headline-lg text-headline-lg text-white">Good morning, {user?.displayName?.split(" ")[0] || user?.email?.split('@')[0] || "Developer"} 👋</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-sm">Here&apos;s a summary of your LLM infrastructure today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        <div className="bg-[#111118] border border-[#1E1E2E] p-md rounded-lg card-glow h-[104px] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Total Queries</span>
            <span className="material-symbols-outlined text-outline-variant text-[18px]">data_usage</span>
          </div>
          <div className="flex items-end gap-sm">
            {loading ? (
              <div className="h-8 w-24 bg-surface-variant/50 animate-pulse rounded"></div>
            ) : (
              <>
                <span className="font-headline-md text-headline-md text-white">{stats.total_queries}</span>
                {queryTrend && (
                  <span className={`font-body-sm text-xs flex items-center mb-xs ${queryTrend.isUp ? 'text-[#00D4AA]' : 'text-[#EF4444]'}`}>
                    <span className="material-symbols-outlined text-[14px]">{queryTrend.isUp ? 'arrow_upward' : 'arrow_downward'}</span>
                    {queryTrend.diff}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-[#111118] border border-[#1E1E2E] p-md rounded-lg card-glow h-[104px] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Avg Latency</span>
            <span className="material-symbols-outlined text-outline-variant text-[18px]">timer</span>
          </div>
          <div className="flex items-end gap-sm">
            {loading ? (
              <div className="h-8 w-20 bg-surface-variant/50 animate-pulse rounded"></div>
            ) : (
              <span className={`font-headline-md text-headline-md ${getLatencyColor(stats.avg_latency)}`}>
                {stats.avg_latency.toFixed(2)}s
              </span>
            )}
          </div>
        </div>

        <div className="bg-[#111118] border border-[#1E1E2E] p-md rounded-lg card-glow h-[104px] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Active Pipelines</span>
            <span className="material-symbols-outlined text-outline-variant text-[18px]">route</span>
          </div>
          <div className="flex items-end gap-sm">
            {loading ? (
              <div className="h-8 w-12 bg-surface-variant/50 animate-pulse rounded"></div>
            ) : (
              <span className="font-headline-md text-headline-md text-white">{pipelines.length}</span>
            )}
          </div>
        </div>

        <div className="bg-[#111118] border border-[#1E1E2E] p-md rounded-lg card-glow h-[104px] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Evals Run</span>
            <span className="material-symbols-outlined text-outline-variant text-[18px]">fact_check</span>
          </div>
          <div className="flex items-end gap-sm">
            {loading ? (
              <div className="h-8 w-12 bg-surface-variant/50 animate-pulse rounded"></div>
            ) : (
              <span className="font-headline-md text-headline-md text-white">0</span>
            )}
            <span className="font-body-sm text-xs text-on-surface-variant mb-xs">last 24h</span>
          </div>
        </div>
      </div>

      <div className="bg-[#111118] border border-[#1E1E2E] p-lg rounded-lg card-glow relative overflow-hidden">
        <div className="flex justify-between items-center mb-lg">
          <h2 className="font-headline-md text-headline-md text-white">Query Volume</h2>
          <div className="flex bg-[#1b1b24] rounded border border-outline-variant/30 p-1">
            <button 
              onClick={() => setChartDays(7)}
              className={`px-3 py-1 text-xs font-label-caps rounded transition-colors ${chartDays === 7 ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-white'}`}
            >
              7 Days
            </button>
            <button 
              onClick={() => setChartDays(30)}
              className={`px-3 py-1 text-xs font-label-caps rounded transition-colors ${chartDays === 30 ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-white'}`}
            >
              30 Days
            </button>
          </div>
        </div>
        <div className="h-[300px] w-full">
          {loading ? (
            <div className="w-full h-full flex items-end gap-2 px-md pb-md">
              {[...Array(chartDays === 7 ? 7 : 30)].map((_, i) => (
                <div key={i} className="flex-1 bg-surface-variant/30 animate-pulse rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
              ))}
            </div>
          ) : stats.daily_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.daily_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#464555" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#464555" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6C63FF', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="queries" stroke="#6C63FF" strokeWidth={3} fillOpacity={1} fill="url(#colorQueries)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant gap-sm">
              <span className="material-symbols-outlined text-[32px] opacity-50">show_chart</span>
              <p className="font-body-md">No query data available</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div className="bg-[#111118] border border-[#1E1E2E] p-lg rounded-lg card-glow flex flex-col h-[350px]">
          <div className="flex justify-between items-center mb-md">
            <h2 className="font-headline-md text-headline-md text-white">Recent Pipelines</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-sm">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-surface-variant/30 animate-pulse rounded-lg"></div>
              ))
            ) : pipelines.length > 0 ? (
              pipelines.slice(0, 3).map((p, i) => {
                const pid = p.id || p;
                return (
                  <div key={i} className="flex items-center justify-between p-md border border-outline-variant/30 rounded-lg bg-[#1b1b24] hover:border-primary/50 transition-colors group">
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[20px]">database</span>
                      </div>
                      <div>
                        <div className="font-code-md text-code-md text-white">{pid}</div>
                        <div className="font-body-sm text-xs text-on-surface-variant flex items-center gap-2 mt-0.5">
                          <span>{p.chunks || 0} chunks</span>
                          <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                          <span>{p.queries || 0} queries</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => router.push(`/dashboard/pipelines`)} 
                      className="text-primary font-label-caps text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                    >
                      Query <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant gap-md">
                <span className="material-symbols-outlined text-[32px] opacity-50">route</span>
                <p className="font-body-sm text-center">No pipelines yet</p>
                <Link href="/dashboard/pipelines" className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded text-sm font-label-caps transition-colors">
                  Create your first one
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#111118] border border-[#1E1E2E] p-lg rounded-lg card-glow flex flex-col h-[350px]">
          <h2 className="font-headline-md text-headline-md text-white mb-md">Top Models</h2>
          <div className="flex-1 w-full h-full relative">
            {loading ? (
              <div className="w-full h-full flex flex-col gap-4 justify-center px-lg">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-20 h-4 bg-surface-variant/30 animate-pulse rounded"></div>
                    <div className="h-6 bg-surface-variant/30 animate-pulse rounded" style={{ width: `${Math.random() * 50 + 20}%` }}></div>
                  </div>
                ))}
              </div>
            ) : stats.model_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={stats.model_breakdown} 
                  margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                  barSize={24}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="model" type="category" axisLine={false} tickLine={false} stroke="#fff" fontSize={12} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#1b1b24' }} 
                    contentStyle={{ backgroundColor: '#111118', borderColor: '#1E1E2E', borderRadius: '4px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`${value} queries`, 'Usage']}
                  />
                  <Bar dataKey="queries" radius={[0, 4, 4, 0]}>
                    {stats.model_breakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant gap-sm">
                <span className="material-symbols-outlined text-[32px] opacity-50">bar_chart</span>
                <p className="font-body-md">No model usage yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
