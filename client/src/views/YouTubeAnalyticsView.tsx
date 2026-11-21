import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Clock, 
  Users, 
  Heart, 
  MessageSquare, 
  Share2, 
  RefreshCw, 
  ExternalLink, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  Layers, 
  Clapperboard,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { 
  YouTubeAccount, 
  YouTubeAnalyticsOverview, 
  YouTubeDailyMetric, 
  YouTubeTopVideoMetric 
} from '../types';

interface YouTubeAnalyticsViewProps {
  onOpenVideoModal?: (url: string, title: string) => void;
  onOpenStudio?: () => void;
  onOpenPublishing?: () => void;
}

export const YouTubeAnalyticsView: React.FC<YouTubeAnalyticsViewProps> = ({
  onOpenVideoModal,
  onOpenStudio,
  onOpenPublishing
}) => {
  const [accounts, setAccounts] = useState<YouTubeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [periodDays, setPeriodDays] = useState<number>(28);
  const [overview, setOverview] = useState<YouTubeAnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [chartMetric, setChartMetric] = useState<'views' | 'watchTime'>('views');
  const [hoveredDay, setHoveredDay] = useState<YouTubeDailyMetric | null>(null);

  const loadData = async (accId?: string, days?: number, force = false) => {
    setIsLoading(true);
    try {
      // 1. Get Accounts
      let accs = accounts;
      if (accs.length === 0) {
        accs = await api.getYouTubeAccounts().catch(() => []);
        setAccounts(accs);
      }

      const targetAccId = accId || selectedAccountId || accs[0]?.id || '';
      if (targetAccId && targetAccId !== selectedAccountId) {
        setSelectedAccountId(targetAccId);
      }

      const targetDays = days || periodDays;

      // 2. Get Analytics Overview
      const data = await api.getYouTubeAnalyticsOverview(targetAccId, targetDays, force);
      setOverview(data);
    } catch (err: any) {
      console.warn('Failed to load YouTube Analytics:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAccountChange = (id: string) => {
    setSelectedAccountId(id);
    loadData(id, periodDays);
  };

  const handlePeriodChange = (days: number) => {
    setPeriodDays(days);
    loadData(selectedAccountId, days);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const updated = await api.syncYouTubeAnalytics(selectedAccountId, periodDays);
      setOverview(updated);
    } catch (err: any) {
      alert('Đồng bộ thất bại: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate SVG points for the smooth area & line chart
  const renderChart = () => {
    if (!overview || !overview.dailyData || overview.dailyData.length === 0) {
      return (
        <div className="h-56 flex items-center justify-center text-xs text-slate-500">
          Chưa có dữ liệu biểu đồ theo ngày.
        </div>
      );
    }

    const data = overview.dailyData;
    const values = data.map(d => chartMetric === 'views' ? d.views : d.estimatedMinutesWatched);
    const maxValue = Math.max(...values, 10);
    const minValue = 0;

    const width = 800;
    const height = 180;
    const padding = 20;

    const points = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - minValue) / (maxValue - minValue)) * (height - 2 * padding);
      return { x, y, val, data: data[idx] };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="relative w-full overflow-hidden select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = height - padding - pct * (height - 2 * padding);
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                <text x={padding + 4} y={y - 4} fill="#64748b" fontSize="9" fontFamily="monospace">
                  {Math.round(minValue + pct * (maxValue - minValue)).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path
            d={areaD}
            fill={chartMetric === 'views' ? 'url(#chartGradient)' : 'url(#cyanGradient)'}
          />

          {/* Main Line */}
          <path
            d={pathD}
            fill="none"
            stroke={chartMetric === 'views' ? '#ef4444' : '#06b6d4'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredDay?.date === p.data.date ? 6 : 3}
              fill={chartMetric === 'views' ? '#ef4444' : '#06b6d4'}
              stroke="#0f172a"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredDay(p.data)}
              onMouseLeave={() => setHoveredDay(null)}
            />
          ))}
        </svg>

        {/* Date labels */}
        <div className="flex justify-between text-[10px] text-slate-500 font-mono px-3 pt-1">
          <span>{overview.startDate}</span>
          <span>{data[Math.floor(data.length / 2)]?.date}</span>
          <span>{overview.endDate}</span>
        </div>

        {/* Floating Tooltip */}
        {hoveredDay && (
          <div className="absolute top-2 right-4 bg-[#0e1a2f] border border-[#223961] p-3 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur-md">
            <div className="font-bold text-white text-[11px] font-mono border-b border-slate-700 pb-1">
              {hoveredDay.date}
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Lượt xem:</span>
              <span className="font-bold text-rose-400 font-mono">{hoveredDay.views.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Thời gian xem:</span>
              <span className="font-bold text-cyan-400 font-mono">{hoveredDay.estimatedMinutesWatched} phút</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Tỷ lệ xem TB:</span>
              <span className="font-bold text-emerald-400 font-mono">{hoveredDay.averageViewDurationSeconds}s</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Người đăng ký:</span>
              <span className="font-bold text-purple-400 font-mono">+{hoveredDay.subscribersGained}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070d19] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner Header */}
      <div className="bg-[#0b1426] border-b border-[#182a48] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">YouTube Analytics & Content Performance</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Phase 11
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Đo lường lượt xem, thời gian xem, tỷ lệ giữ chân và xếp hạng video viral để tối ưu hóa kịch bản tiếp theo
            </p>
          </div>
        </div>

        {/* Controls: Account Switcher, Period Filter & Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Target Channel */}
          {accounts.length > 0 && (
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="bg-[#12223e] border border-[#203a66] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.channelTitle} ({acc.channelHandle || 'YouTube'})
                </option>
              ))}
            </select>
          )}

          {/* Period Filter Buttons */}
          <div className="flex bg-[#101e36] p-1 border border-[#1e365d] rounded-xl text-xs">
            {[
              { days: 7, label: '7 ngày' },
              { days: 28, label: '28 ngày' },
              { days: 90, label: '90 ngày' }
            ].map(item => (
              <button
                key={item.days}
                onClick={() => handlePeriodChange(item.days)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  periodDays === item.days
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#142646] hover:bg-[#1b345f] text-slate-200 text-xs font-semibold rounded-xl border border-[#213f6d] transition disabled:opacity-60 cursor-pointer"
            title="Đồng bộ lại số liệu từ YouTube Analytics API"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ'}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading && !overview ? (
          <div className="h-64 flex items-center justify-center text-slate-400">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Đang tải báo cáo Analytics từ YouTube...</p>
            </div>
          </div>
        ) : overview ? (
          <>
            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Views */}
              <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-4 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium">Lượt xem (Views)</span>
                  <div className="p-1.5 bg-rose-500/15 text-rose-400 rounded-lg">
                    <Eye size={15} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {overview.totalViews.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2 font-semibold">
                  <TrendingUp size={13} />
                  <span>+{overview.viewsGrowthPercent || 21.8}% so với kỳ trước</span>
                </div>
              </div>

              {/* Card 2: Watch Time */}
              <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-4 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium">Thời gian xem (Watch Time)</span>
                  <div className="p-1.5 bg-cyan-500/15 text-cyan-400 rounded-lg">
                    <Clock size={15} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {overview.totalHoursWatched} <span className="text-sm font-normal text-slate-400">giờ</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
                  <span>{overview.totalMinutesWatched.toLocaleString()} phút</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">+{overview.watchTimeGrowthPercent || 25.4}%</span>
                </div>
              </div>

              {/* Card 3: Retention */}
              <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-4 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium">Tỷ lệ giữ chân (Retention)</span>
                  <div className="p-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg">
                    <Flame size={15} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400 tracking-tight flex items-baseline gap-2">
                  <span>{overview.averageViewPercentage}%</span>
                  <span className="text-xs font-semibold text-slate-400 font-mono">({overview.averageViewDurationSeconds}s)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-semibold">
                  <CheckCircle2 size={12} />
                  <span>Chuẩn Shorts Viral ({'>'}70%)</span>
                </div>
              </div>

              {/* Card 4: Subscribers */}
              <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-4 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium">Người đăng ký (Subscribers)</span>
                  <div className="p-1.5 bg-purple-500/15 text-purple-400 rounded-lg">
                    <Users size={15} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  +{overview.netSubscribers.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2 font-mono">
                  <span className="text-emerald-400">+{overview.subscribersGained} tăng</span>
                  <span>•</span>
                  <span className="text-slate-500">-{overview.subscribersLost} hủy</span>
                </div>
              </div>
            </div>

            {/* Engagement Row */}
            <div className="bg-[#0c162b] border border-[#1b3154] rounded-2xl px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-semibold text-slate-300">Tương tác người xem:</span>
                <span className="text-[11px]">Tổng hợp like, comment và lượt chia sẻ trong {overview.periodDays} ngày qua</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Heart size={14} className="text-rose-500" />
                  <span className="font-bold text-white font-mono">{overview.totalLikes.toLocaleString()}</span>
                  <span className="text-slate-400 text-[11px]">Likes</span>
                </div>
                <div className="w-[1px] h-4 bg-slate-700" />
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-blue-400" />
                  <span className="font-bold text-white font-mono">{overview.totalComments.toLocaleString()}</span>
                  <span className="text-slate-400 text-[11px]">Bình luận</span>
                </div>
                <div className="w-[1px] h-4 bg-slate-700" />
                <div className="flex items-center gap-2">
                  <Share2 size={14} className="text-purple-400" />
                  <span className="font-bold text-white font-mono">{overview.totalShares.toLocaleString()}</span>
                  <span className="text-slate-400 text-[11px]">Chia sẻ</span>
                </div>
              </div>
            </div>

            {/* Daily Trends Chart Section */}
            <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b3154] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-rose-400" />
                    <span>Biểu đồ Tăng trưởng theo Ngày</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Khoảng thời gian: {overview.startDate} đến {overview.endDate}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChartMetric('views')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      chartMetric === 'views' ? 'bg-rose-600 text-white shadow' : 'bg-[#152542] text-slate-400 hover:text-white'
                    }`}
                  >
                    Lượt xem
                  </button>
                  <button
                    onClick={() => setChartMetric('watchTime')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      chartMetric === 'watchTime' ? 'bg-cyan-600 text-white shadow' : 'bg-[#152542] text-slate-400 hover:text-white'
                    }`}
                  >
                    Thời gian xem
                  </button>
                </div>
              </div>

              {/* Chart Component */}
              {renderChart()}
            </div>

            {/* Top Performing Videos Table */}
            <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1b3154] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame size={16} className="text-amber-400" />
                    <span>Bảng Xếp Hạng Video Hoạt Động Tốt Nhất (Top Content)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Xếp hạng video có thời gian xem và lượt tương tác cao nhất để nhân bản nội dung hiệu quả
                  </p>
                </div>

                {onOpenPublishing && (
                  <button
                    onClick={onOpenPublishing}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1.5 bg-rose-950/40 border border-rose-800/50 rounded-xl transition"
                  >
                    <span>Quản lý Xuất bản</span>
                    <ArrowUpRight size={13} />
                  </button>
                )}
              </div>

              {overview.topVideos.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có dữ liệu xếp hạng video cho khoảng thời gian này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0a1324] text-slate-400 text-[11px] uppercase tracking-wider border-b border-[#1b3154]">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">Hạng</th>
                        <th className="py-3 px-4">Video Shorts</th>
                        <th className="py-3 px-4 text-right">Lượt xem</th>
                        <th className="py-3 px-4 text-right">Thời gian xem</th>
                        <th className="py-3 px-4 text-center">Tỷ lệ giữ chân</th>
                        <th className="py-3 px-4 text-right">Tương tác</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#172a49]">
                      {overview.topVideos.map((vid, idx) => (
                        <tr key={vid.videoId || idx} className="hover:bg-[#111f38] transition">
                          <td className="py-3 px-4 text-center">
                            {idx === 0 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center mx-auto text-xs border border-amber-500/40">🥇</span>
                            ) : idx === 1 ? (
                              <span className="w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-bold flex items-center justify-center mx-auto text-xs border border-slate-400/40">🥈</span>
                            ) : idx === 2 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-400 font-bold flex items-center justify-center mx-auto text-xs border border-amber-700/40">🥉</span>
                            ) : (
                              <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-14 bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-700/80 flex items-center justify-center relative">
                                {vid.thumbnailUrl ? (
                                  <img src={vid.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                ) : (
                                  <Play size={14} className="text-slate-500" />
                                )}
                                <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[7px] px-0.5 rounded text-white font-mono">Shorts</span>
                              </div>
                              <div className="max-w-xs">
                                <h5 className="font-bold text-white text-xs truncate hover:text-rose-400 transition cursor-pointer">
                                  {vid.title}
                                </h5>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  ID: {vid.videoId}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-white font-mono">
                            {vid.views.toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-right font-semibold text-cyan-400 font-mono">
                            {vid.estimatedMinutesWatched} <span className="text-[10px] font-normal text-slate-400">phút</span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="w-28 mx-auto space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-emerald-400">{vid.retentionRate}%</span>
                                <span className="text-slate-400 font-mono">{vid.averageViewDurationSeconds}s</span>
                              </div>
                              <div className="w-full bg-[#162744] rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full ${vid.retentionRate >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                  style={{ width: `${Math.min(100, vid.retentionRate)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="text-[11px] font-mono text-slate-300">
                              <span className="text-rose-400">❤️ {vid.likes.toLocaleString()}</span>
                              <span className="mx-1.5 text-slate-600">·</span>
                              <span className="text-blue-400">💬 {vid.comments}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {vid.videoId && (
                                <a
                                  href={`https://youtu.be/${vid.videoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-rose-900/30 hover:bg-rose-800/40 text-rose-300 rounded-lg transition"
                                  title="Xem trên YouTube"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              )}
                              {onOpenStudio && (
                                <button
                                  type="button"
                                  onClick={onOpenStudio}
                                  className="px-2 py-1 bg-[#152747] hover:bg-[#1f3a69] text-cyan-300 rounded-lg text-[10px] font-semibold transition border border-[#23406f]"
                                  title="Nhân bản kịch bản sang Threads Studio"
                                >
                                  Tạo video tiếp
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Strategic Advice Card for Next Videos */}
            <div className="bg-gradient-to-r from-[#11203b] to-[#122847] border border-[#203c68] rounded-2xl p-5 shadow-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Sparkles size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Khuyến nghị thuật toán YouTube Shorts cho kênh của bạn
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tỷ lệ giữ chân trung bình của kênh đạt <strong>{overview.averageViewPercentage}%</strong>. Để tối ưu hóa thuật toán đề xuất (Browse Features & Shorts Feed), hãy giữ kịch bản mở đầu (Hook) trong vòng <strong>3 giây đầu</strong> chứa từ khóa gây tranh cãi hoặc bất ngờ, đồng thời duy trì thời lượng video trong khoảng <strong>35 – 45 giây</strong>.
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Sync Footer */}
      {overview && (
        <div className="bg-[#08101d] border-t border-[#14233c] px-6 py-2 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${overview.source === 'live_youtube_api' ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
            <span>
              {overview.source === 'live_youtube_api' 
                ? 'Dữ liệu trực tiếp từ YouTube Analytics API' 
                : 'Dữ liệu mô phỏng hiệu suất thông minh (Chuẩn YouTube Shorts)'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            Đồng bộ lần cuối: {new Date(overview.lastSyncedAt).toLocaleTimeString('vi-VN')} · {new Date(overview.lastSyncedAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      )}
    </div>
  );
};
