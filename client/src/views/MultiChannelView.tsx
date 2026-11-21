import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Layers, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Globe, 
  Settings, 
  Sliders, 
  Trash2, 
  Star, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Search, 
  Filter, 
  Gauge, 
  ShieldCheck, 
  HelpCircle, 
  Radio, 
  FolderGit2, 
  ChevronRight, 
  TrendingUp, 
  Video 
} from 'lucide-react';
import { 
  YouTubeAccount, 
  ProjectChannelMappingItem, 
  MultiChannelScheduleItem, 
  YouTubeQuotaStats, 
  MultiChannelDashboardSummary 
} from '../types';
import { api } from '../services/api';

interface MultiChannelViewProps {
  onOpenStudio?: () => void;
  onOpenPublishing?: () => void;
  onOpenAnalytics?: () => void;
}

export const MultiChannelView: React.FC<MultiChannelViewProps> = ({
  onOpenStudio,
  onOpenPublishing,
  onOpenAnalytics
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'projects' | 'schedule' | 'quota'>('channels');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Core data states
  const [channels, setChannels] = useState<YouTubeAccount[]>([]);
  const [summary, setSummary] = useState<MultiChannelDashboardSummary | null>(null);
  const [projectMappings, setProjectMappings] = useState<ProjectChannelMappingItem[]>([]);
  const [scheduleItems, setScheduleItems] = useState<MultiChannelScheduleItem[]>([]);
  const [quotaStats, setQuotaStats] = useState<YouTubeQuotaStats | null>(null);

  // Filters
  const [scheduleChannelFilter, setScheduleChannelFilter] = useState<string>('all');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<string>('all');
  const [projectSearch, setProjectSearch] = useState('');

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<YouTubeAccount | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualHandle, setManualHandle] = useState('');
  const [manualInternalName, setManualInternalName] = useState('');
  const [manualTimezone, setManualTimezone] = useState('Asia/Ho_Chi_Minh');

  // Edit form state
  const [editInternalName, setEditInternalName] = useState('');
  const [editTimezone, setEditTimezone] = useState('Asia/Ho_Chi_Minh');
  const [editDailyLimit, setEditDailyLimit] = useState(10);
  const [editIsDefault, setEditIsDefault] = useState(false);

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [chans, summ, maps, sched, quota] = await Promise.all([
        api.getChannels().catch(() => []),
        api.getMultiDashboardSummary().catch(() => null),
        api.getProjectMappings().catch(() => []),
        api.getMultiChannelSchedule({ accountId: scheduleChannelFilter, status: scheduleStatusFilter }).catch(() => []),
        api.getQuotaStats().catch(() => null)
      ]);

      setChannels(chans);
      setSummary(summ);
      setProjectMappings(maps);
      setScheduleItems(sched);
      setQuotaStats(quota);
    } catch (err: any) {
      showToast('Lỗi khi tải dữ liệu đa kênh: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'schedule') {
      api.getMultiChannelSchedule({ accountId: scheduleChannelFilter, status: scheduleStatusFilter })
        .then(setScheduleItems)
        .catch(console.error);
    }
  }, [scheduleChannelFilter, scheduleStatusFilter, activeTab]);

  // Handle Set Default Channel
  const handleSetDefault = async (channelId: string, name: string) => {
    setActionLoading(`def_${channelId}`);
    try {
      await api.setDefaultChannel(channelId);
      showToast(`Đã đặt "${name}" làm kênh mặc định cho Workspace!`);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Open Edit Channel Modal
  const openEditModal = (ch: YouTubeAccount) => {
    setEditingChannel(ch);
    setEditInternalName(ch.internalName || '');
    setEditTimezone(ch.timezone || 'Asia/Ho_Chi_Minh');
    setEditDailyLimit(ch.dailyUploadLimit ?? 10);
    setEditIsDefault(Boolean(ch.isDefault));
  };

  // Save Channel Updates
  const handleSaveChannelSettings = async () => {
    if (!editingChannel) return;
    setActionLoading('save_ch');
    try {
      await api.updateChannel(editingChannel.id, {
        internalName: editInternalName,
        timezone: editTimezone,
        dailyUploadLimit: editDailyLimit,
        isDefault: editIsDefault
      });
      showToast('Đã lưu cấu hình kênh thành công!');
      setEditingChannel(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Disconnect Channel
  const handleDisconnectChannel = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn ngắt kết nối kênh "${name}" khỏi workspace?`)) return;
    setActionLoading(`del_${id}`);
    try {
      await api.deleteYouTubeAccount(id);
      showToast(`Đã ngắt kết nối kênh "${name}"`);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Assign Project to Channel
  const handleAssignProject = async (projectId: string, accountId: string | null) => {
    try {
      await api.assignProjectChannel(projectId, accountId);
      setProjectMappings(prev => prev.map(m => m.projectId === projectId ? {
        ...m,
        accountId: accountId || undefined,
        channelTitle: channels.find(c => c.id === accountId)?.channelTitle,
        internalName: channels.find(c => c.id === accountId)?.internalName
      } : m));
      showToast('Đã cập nhật kênh mặc định cho dự án!');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Add Manual Demo Channel
  const handleAddManualChannel = async () => {
    if (!manualTitle.trim()) {
      alert('Vui lòng nhập tên kênh');
      return;
    }
    setActionLoading('add_manual');
    try {
      const created = await api.addManualYouTubeAccount({
        channelTitle: manualTitle.trim(),
        channelHandle: manualHandle.trim() || undefined
      });
      if (manualInternalName.trim() || manualTimezone !== 'Asia/Ho_Chi_Minh') {
        await api.updateChannel(created.id, {
          internalName: manualInternalName.trim() || undefined,
          timezone: manualTimezone
        });
      }
      showToast(`Đã kết nối kênh "${manualTitle}" thành công!`);
      setIsConnectModalOpen(false);
      setManualTitle('');
      setManualHandle('');
      setManualInternalName('');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Connect via Official OAuth
  const handleConnectOAuth = async () => {
    try {
      const auth = await api.getYouTubeAuthUrl();
      if (!auth.clientIdSet) {
        alert('Chưa cấu hình Google OAuth Client ID trong server/.env.\nBạn có thể dùng nút "Thêm kênh thử nghiệm" bên dưới để trải nghiệm ngay!');
        return;
      }
      window.open(auth.url, '_blank', 'width=600,height=700');
    } catch (err: any) {
      alert('Lỗi OAuth: ' + err.message);
    }
  };

  const filteredProjects = projectMappings.filter(p => 
    p.projectTitle.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.threadsUrl.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070d19] overflow-hidden text-slate-100 font-sans">
      
      {/* ================= HEADER ================= */}
      <div className="border-b border-[#182b4a] bg-[#091222]/90 backdrop-blur px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/25">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Quản lý nhiều kênh (Multi-Channel)</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Phase 14 · v0.14.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Vận hành nhiều kênh YouTube trong một workspace: OAuth độc lập, gán dự án, lịch đăng tập trung & kiểm soát Quota.
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#122038] hover:bg-[#1a2e50] border border-[#203960] text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
            title="Làm mới toàn bộ dữ liệu"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-blue-400' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={14} />
            <span>+ Kết nối kênh mới</span>
          </button>
        </div>
      </div>

      {/* ================= TOAST NOTIFICATION ================= */}
      {feedback && (
        <div className={`mx-6 mt-3 px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={15} className="text-emerald-400" /> : <AlertCircle size={15} className="text-rose-400" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* 1. TOP METRIC OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Channels */}
          <div className="bg-[#0f1b30] border border-[#1d3356] rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Kênh kết nối</span>
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Tv size={13} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{channels.length}</span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                ✓ {channels.filter(c => c.isActive).length} hoạt động
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 truncate">OAuth độc lập từng kênh</p>
          </div>

          {/* Card 2: Workspace Default Channel */}
          <div className="bg-[#0f1b30] border border-[#1d3356] rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Kênh mặc định</span>
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Star size={13} />
              </div>
            </div>
            <div className="truncate">
              <span className="text-sm font-bold text-amber-300 truncate block">
                {channels.find(c => c.isDefault)?.internalName || channels.find(c => c.isDefault)?.channelTitle || 'Chưa đặt'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {channels.find(c => c.isDefault)?.channelHandle || '@default'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Ưu tiên đề xuất khi xuất bản</p>
          </div>

          {/* Card 3: Total Audience Reach */}
          <div className="bg-[#0f1b30] border border-[#1d3356] rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Tổng khán giả</span>
              <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <TrendingUp size={13} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">
                {(channels.reduce((sum, c) => sum + (c.subscriberCount || 0), 0)).toLocaleString()}
              </span>
              <span className="text-[11px] text-purple-300 font-medium">subs</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {channels.reduce((sum, c) => sum + (c.videoCount || 0), 0)} video đã tải lên
            </p>
          </div>

          {/* Card 4: Uploads Today */}
          <div className="bg-[#0f1b30] border border-[#1d3356] rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Đăng hôm nay</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={13} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {summary?.uploadsTodayTotal || 0}
              </span>
              <span className="text-[11px] text-slate-400">
                / {channels.reduce((sum, c) => sum + (c.dailyUploadLimit ?? 10), 0)} max
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {summary?.scheduledCount || 0} video chờ xuất bản
            </p>
          </div>

          {/* Card 5: Quota Status */}
          <div className="bg-[#0f1b30] border border-[#1d3356] rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">API Quota Google</span>
              <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Gauge size={13} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-cyan-300">
                {100 - (quotaStats?.percentUsed || 0)}%
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ~{quotaStats?.estimatedUploadsRemaining || 6} lượt
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#172744] rounded-full overflow-hidden mt-1.5">
              <div 
                className={`h-full transition-all duration-500 ${
                  (quotaStats?.percentUsed || 0) > 85 ? 'bg-red-500' :
                  (quotaStats?.percentUsed || 0) > 60 ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${quotaStats?.percentUsed || 15}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. TAB NAVIGATION */}
        <div className="flex items-center justify-between border-b border-[#1c3254] pb-1">
          <div className="flex items-center gap-2">
            {[
              { id: 'channels', label: 'Các kênh đã kết nối', count: channels.length, icon: Tv },
              { id: 'projects', label: 'Gán dự án cho kênh', count: projectMappings.length, icon: FolderGit2 },
              { id: 'schedule', label: 'Lịch đăng tập trung', count: scheduleItems.length, icon: Calendar },
              { id: 'quota', label: 'Theo dõi Quota & Giới hạn', icon: Gauge }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#112038]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#152542] text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Context Notice */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Mỗi kênh có OAuth Token riêng biệt, tuân thủ YouTube Data API v3</span>
          </div>
        </div>

        {/* ================= TAB 1: CHANNELS ================= */}
        {activeTab === 'channels' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Danh sách kênh hoạt động</span>
                  <span className="text-[11px] text-slate-400 font-normal">({channels.length} kênh trong workspace)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Định cấu hình tên hiển thị nội bộ, múi giờ và hạn mức đăng cho từng kênh riêng biệt.
                </p>
              </div>
            </div>

            {/* Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map(ch => (
                <div 
                  key={ch.id} 
                  className={`bg-[#0f1b30] rounded-2xl border transition shadow-sm p-4.5 space-y-3.5 relative overflow-hidden ${
                    ch.isDefault 
                      ? 'border-amber-500/50 ring-1 ring-amber-500/30' 
                      : 'border-[#1b3154] hover:border-[#274779]'
                  }`}
                >
                  {/* Top Bar: Avatar, Names & Default Star */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={ch.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'} 
                          alt={ch.channelTitle}
                          className="w-12 h-12 rounded-2xl object-cover border border-[#213b63] shadow-md ring-2 ring-slate-800"
                        />
                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0f1b30] ${
                          ch.isActive ? 'bg-emerald-500' : 'bg-slate-600'
                        }`} />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-white truncate max-w-[170px]" title={ch.channelTitle}>
                            {ch.channelTitle}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {ch.channelHandle || '@youtube_channel'}
                        </p>
                      </div>
                    </div>

                    {/* Default Channel Badge */}
                    {ch.isDefault ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span>Mặc định</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(ch.id, ch.channelTitle)}
                        disabled={actionLoading === `def_${ch.id}`}
                        className="text-[10px] text-slate-400 hover:text-amber-300 px-2 py-0.5 rounded-lg border border-[#213b63] hover:border-amber-500/40 transition shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Đặt kênh này làm mặc định workspace"
                      >
                        <Star size={11} />
                        <span>Đặt mặc định</span>
                      </button>
                    )}
                  </div>

                  {/* Internal Display Name Badge */}
                  <div className="p-2.5 bg-[#14233e] rounded-xl border border-[#20375c] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Tên nội bộ</span>
                      <span className="font-bold text-cyan-300 text-xs">
                        {ch.internalName || 'Chưa đặt (dùng tên kênh)'}
                      </span>
                    </div>
                    <button
                      onClick={() => openEditModal(ch)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1d355c] transition cursor-pointer"
                      title="Sửa tên nội bộ và cấu hình"
                    >
                      <Settings size={13} />
                    </button>
                  </div>

                  {/* Channel Meta Specs */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-[#0b1424] rounded-xl border border-[#172740]">
                      <span className="text-[10px] text-slate-400 block">Khán giả</span>
                      <span className="font-bold text-white text-xs">{(ch.subscriberCount || 0).toLocaleString()}</span>
                    </div>
                    <div className="p-2 bg-[#0b1424] rounded-xl border border-[#172740]">
                      <span className="text-[10px] text-slate-400 block">Múi giờ</span>
                      <span className="font-mono text-cyan-300 text-[10px] truncate block" title={ch.timezone || 'Asia/Ho_Chi_Minh'}>
                        {ch.timezone ? ch.timezone.split('/').pop()?.replace('_', ' ') : 'VN (+7)'}
                      </span>
                    </div>
                    <div className="p-2 bg-[#0b1424] rounded-xl border border-[#172740]">
                      <span className="text-[10px] text-slate-400 block">Hạn mức/ngày</span>
                      <span className="font-bold text-amber-300 text-xs">
                        {ch.todayUploadCount || 0}/{ch.dailyUploadLimit ?? 10}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-[#162742] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">
                      ID: {ch.channelId.slice(0, 10)}...
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(ch)}
                        className="px-2.5 py-1 rounded-lg bg-[#14233e] hover:bg-[#1d355c] text-slate-200 text-xs font-semibold border border-[#233d69] transition cursor-pointer"
                      >
                        Cài đặt
                      </button>
                      <button
                        onClick={() => handleDisconnectChannel(ch.id, ch.channelTitle)}
                        disabled={actionLoading === `del_${ch.id}`}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                        title="Ngắt kết nối kênh"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: PROJECTS MAPPINGS ================= */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Gán kênh mặc định cho từng dự án</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ví dụ: Dự án "Threads Meme" ➔ Kênh A, "Threads Story" ➔ Kênh B. Khi tạo bản đăng, mục Publishing sẽ tự chọn kênh này.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Tìm kiếm dự án..."
                  className="w-full bg-[#0f1b30] border border-[#1e3458] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Mappings Table */}
            <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b1424] border-b border-[#1b3154] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Dự án Threads</th>
                      <th className="py-3 px-4">Link nguồn</th>
                      <th className="py-3 px-4">Kênh YouTube được gán</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#162742]">
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          Chưa có dự án nào phù hợp với tìm kiếm.
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map(proj => (
                        <tr key={proj.projectId} className="hover:bg-[#12213a]/50 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block truncate max-w-xs">{proj.projectTitle}</span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {proj.projectId}</span>
                          </td>
                          <td className="py-3 px-4">
                            <a 
                              href={proj.threadsUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-blue-400 hover:underline text-[11px] font-mono truncate max-w-[200px] block"
                            >
                              {proj.threadsUrl || 'threads.net/post/...'}
                            </a>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {proj.avatarUrl && (
                                <img src={proj.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-[#213b63]" />
                              )}
                              <select
                                value={proj.accountId || ''}
                                onChange={(e) => handleAssignProject(proj.projectId, e.target.value || null)}
                                className="bg-[#14233e] border border-[#243e69] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                              >
                                <option value="">-- Mặc định workspace ({channels.find(c => c.isDefault)?.channelTitle || 'Kênh chính'}) --</option>
                                {channels.map(ch => (
                                  <option key={ch.id} value={ch.id}>
                                    {ch.internalName ? `${ch.internalName} (${ch.channelTitle})` : ch.channelTitle}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                if (onOpenPublishing) onOpenPublishing();
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Xuất bản ngay</span>
                              <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: SCHEDULE ================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Lịch đăng tập trung đa kênh</span>
                  <span className="text-[11px] text-slate-400 font-normal">({scheduleItems.length} video trong lịch)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Theo dõi thời gian xuất bản theo múi giờ riêng của từng kênh để tối ưu khung giờ vàng của khán giả mục tiêu.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={scheduleChannelFilter}
                  onChange={(e) => setScheduleChannelFilter(e.target.value)}
                  className="bg-[#0f1b30] border border-[#1e3458] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả các kênh</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      {ch.internalName || ch.channelTitle}
                    </option>
                  ))}
                </select>

                <select
                  value={scheduleStatusFilter}
                  onChange={(e) => setScheduleStatusFilter(e.target.value)}
                  className="bg-[#0f1b30] border border-[#1e3458] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="published">Đã xuất bản (Published)</option>
                  <option value="queued">Đang chờ (Queued / Scheduled)</option>
                  <option value="draft">Bản nháp (Draft)</option>
                </select>
              </div>
            </div>

            {/* Schedule List */}
            <div className="space-y-2.5">
              {scheduleItems.length === 0 ? (
                <div className="p-8 text-center bg-[#0f1b30] rounded-2xl border border-[#1b3154] text-slate-500">
                  <Calendar size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Chưa có video nào trong lịch đăng.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Hãy vào mục Đăng YouTube (Publishing) và chọn ngày giờ để lên lịch đăng tự động!
                  </p>
                </div>
              ) : (
                scheduleItems.map(item => (
                  <div 
                    key={item.id}
                    className="p-3.5 bg-[#0f1b30] rounded-2xl border border-[#1b3154] hover:border-[#274779] transition flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Video Thumbnail */}
                      <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-900 border border-[#213b63] shrink-0 relative">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Video size={16} />
                          </div>
                        )}
                      </div>

                      {/* Title & Channel */}
                      <div>
                        <h4 className="text-xs font-bold text-white truncate max-w-md" title={item.title}>
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-2 py-0.2 rounded-md bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                            {item.internalName || item.channelTitle}
                          </span>
                          <span className="text-[10px] text-slate-500">·</span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            Chế độ: {item.privacyStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Status Badge */}
                    <div className="flex items-center gap-3 md:text-right">
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono text-cyan-300 font-bold block flex items-center gap-1 md:justify-end">
                          <Clock size={12} className="text-cyan-400" />
                          <span>{item.publishAtLocal}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Múi giờ kênh: {item.channelTimezone}
                        </span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        item.status === 'published' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        item.status === 'uploading' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse' :
                        item.status === 'queued' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-slate-700/40 text-slate-400 border border-slate-600/40'
                      }`}>
                        {item.status === 'published' ? 'Đã đăng' :
                         item.status === 'uploading' ? 'Đang tải lên' :
                         item.status === 'queued' ? 'Đã lên lịch' : 'Bản nháp'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: QUOTA & LIMITS ================= */}
        {activeTab === 'quota' && quotaStats && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Kiểm soát hạn mức YouTube Data API v3</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Google cấp mặc định 10,000 units quota/ngày cho mỗi Google Cloud Project. Ứng dụng tự động theo dõi và cảnh báo trước khi hết quota.
              </p>
            </div>

            {/* Quota Progress Bar Card */}
            <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Tiến độ tiêu thụ Quota hôm nay</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-white">{quotaStats.usedToday.toLocaleString()}</span>
                    <span className="text-xs text-slate-400">/ {quotaStats.totalDailyQuota.toLocaleString()} units</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Thời gian làm mới (Reset)</span>
                  <span className="text-sm font-mono font-bold text-cyan-300 flex items-center gap-1 justify-end">
                    <Clock size={13} />
                    <span>Còn {quotaStats.resetCountdown}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block">Reset vào 00:00 PST (15:00 giờ VN)</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-[#0a1222] rounded-full overflow-hidden p-0.5 border border-[#182b4a]">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    quotaStats.percentUsed > 85 ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                    quotaStats.percentUsed > 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                    'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                  style={{ width: `${Math.max(4, quotaStats.percentUsed)}%` }}
                />
              </div>

              {/* Quota Cost Breakdown Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-[#13213a] rounded-xl border border-[#1f365d] text-xs">
                  <span className="font-semibold text-rose-300 block mb-0.5">📤 1 Video Upload (insert)</span>
                  <p className="text-[11px] text-slate-300 font-mono">1,600 units / lượt</p>
                  <p className="text-[10px] text-slate-400 mt-1">Mỗi ngày upload an toàn tối đa ~6 video nếu dùng chung 1 Google Project.</p>
                </div>
                <div className="p-3 bg-[#13213a] rounded-xl border border-[#1f365d] text-xs">
                  <span className="font-semibold text-amber-300 block mb-0.5">🖼️ Đặt Thumbnail (set)</span>
                  <p className="text-[11px] text-slate-300 font-mono">50 units / lượt</p>
                  <p className="text-[10px] text-slate-400 mt-1">Chi phí thấp, không ảnh hưởng đáng kể đến hạn mức hàng ngày.</p>
                </div>
                <div className="p-3 bg-[#13213a] rounded-xl border border-[#1f365d] text-xs">
                  <span className="font-semibold text-emerald-300 block mb-0.5">🔍 Đồng bộ Analytics & Kênh</span>
                  <p className="text-[11px] text-slate-300 font-mono">1 – 5 units / lượt</p>
                  <p className="text-[10px] text-slate-400 mt-1">Sử dụng hạn mức riêng biệt (YouTube Analytics API), không cạn kiệt Data API.</p>
                </div>
              </div>
            </div>

            {/* Per-Channel Usage Breakdown */}
            <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[#1b3154] bg-[#0b1424] flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Hạn mức upload từng kênh hôm nay</span>
                <span className="text-[11px] text-slate-400">Kiểm soát chống spam YouTube</span>
              </div>
              <div className="divide-y divide-[#162742]">
                {quotaStats.accountsQuota.map(acc => (
                  <div key={acc.accountId} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#12213a]/50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs text-white border border-[#213b63]">
                        {acc.channelTitle.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{acc.channelTitle}</span>
                        <span className="text-[10px] text-cyan-300 font-semibold">{acc.internalName || 'Kênh chính'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Upload hôm nay</span>
                        <span className="font-bold text-white font-mono">{acc.uploadsToday} / {acc.dailyLimit} video</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Quota tiêu thụ</span>
                        <span className="font-bold text-cyan-300 font-mono">~{acc.quotaUsedUnits} units</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        acc.uploadsToday >= acc.dailyLimit ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {acc.uploadsToday >= acc.dailyLimit ? 'Đạt giới hạn' : 'Sẵn sàng'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: CONNECT NEW CHANNEL ================= */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1b30] border border-[#233d69] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b3154]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center">
                  <Tv size={15} />
                </div>
                <h3 className="font-bold text-sm text-white">Kết nối Kênh YouTube mới</h3>
              </div>
              <button onClick={() => setIsConnectModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Method 1: Google OAuth Official */}
            <div className="p-3.5 bg-[#14233e] rounded-xl border border-[#203960] space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Globe size={13} className="text-blue-400" />
                <span>Phương thức 1: Đăng nhập Google OAuth (Chính thức)</span>
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Đăng nhập vào tài khoản Google sở hữu kênh YouTube của bạn để cấp quyền upload MP4 và đọc dữ liệu Analytics.
              </p>
              <button
                type="button"
                onClick={handleConnectOAuth}
                className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Mở màn hình xác thực Google OAuth</span>
              </button>
            </div>

            {/* Method 2: Manual / Demo Channel (Zero-Auth / Offline Testing) */}
            <div className="p-3.5 bg-[#14233e] rounded-xl border border-[#203960] space-y-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                <span>Phương thức 2: Thêm kênh thử nghiệm (Offline / Demo)</span>
              </span>
              <p className="text-[10px] text-slate-400">
                Cho phép tạo kênh nội bộ để kiểm tra quy trình gán dự án và lịch đăng ngay mà không cần cấu hình Google Cloud Console.
              </p>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Tên kênh YouTube</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="VD: Threads Daily Clips"
                    className="w-full bg-[#0a1222] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Tên nội bộ (Ví dụ: Kênh D)</label>
                    <input
                      type="text"
                      value={manualInternalName}
                      onChange={(e) => setManualInternalName(e.target.value)}
                      placeholder="VD: Kênh Tin Tức"
                      className="w-full bg-[#0a1222] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Múi giờ</label>
                    <select
                      value={manualTimezone}
                      onChange={(e) => setManualTimezone(e.target.value)}
                      className="w-full bg-[#0a1222] border border-[#213b63] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="Asia/Ho_Chi_Minh">Việt Nam (+7)</option>
                      <option value="America/New_York">New York (-5)</option>
                      <option value="Europe/London">London (+0)</option>
                      <option value="Asia/Tokyo">Tokyo (+9)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddManualChannel}
                  disabled={actionLoading === 'add_manual' || !manualTitle.trim()}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer active:scale-95"
                >
                  {actionLoading === 'add_manual' ? 'Đang thêm...' : '+ Tạo kênh vào Workspace'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT CHANNEL SETTINGS ================= */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1b30] border border-[#233d69] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b3154]">
              <div className="flex items-center gap-2">
                <Settings size={15} className="text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Cài đặt kênh: {editingChannel.channelTitle}</h3>
              </div>
              <button onClick={() => setEditingChannel(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Tên hiển thị nội bộ (Internal Name)</label>
                <input
                  type="text"
                  value={editInternalName}
                  onChange={(e) => setEditInternalName(e.target.value)}
                  placeholder="VD: Kênh Meme Shorts (Kênh A)"
                  className="w-full bg-[#0a1222] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Tên này giúp bạn nhận biết nhanh kênh trong danh sách dự án.</span>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Múi giờ phát sóng (Timezone)</label>
                <select
                  value={editTimezone}
                  onChange={(e) => setEditTimezone(e.target.value)}
                  className="w-full bg-[#0a1222] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="Asia/Ho_Chi_Minh">Việt Nam / Bangkok (GMT+7)</option>
                  <option value="America/New_York">Mỹ - Miền Đông / New York (EST/EDT)</option>
                  <option value="America/Los_Angeles">Mỹ - Miền Tây / Los Angeles (PST/PDT)</option>
                  <option value="Europe/London">Anh / London (GMT/BST)</option>
                  <option value="Asia/Tokyo">Nhật Bản / Tokyo (GMT+9)</option>
                  <option value="Asia/Singapore">Singapore / Kuala Lumpur (GMT+8)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Lịch đăng tập trung sẽ tính toán giờ đăng theo múi giờ này.</span>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Giới hạn upload mỗi ngày (Daily Limit)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={editDailyLimit}
                  onChange={(e) => setEditDailyLimit(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#0a1222] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Cảnh báo nếu số video vượt quá giới hạn ngày của kênh để tránh bị phạt spam.</span>
              </div>

              <div className="p-3 bg-[#13223c] rounded-xl border border-[#223961] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Đặt làm kênh mặc định Workspace</span>
                  <span className="text-[10px] text-slate-400">Tự động chọn kênh này cho các dự án chưa được gán.</span>
                </div>
                <input
                  type="checkbox"
                  checked={editIsDefault}
                  onChange={(e) => setEditIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#172744] border-[#253f68] text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1b3154]">
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveChannelSettings}
                  disabled={actionLoading === 'save_ch'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer active:scale-95"
                >
                  {actionLoading === 'save_ch' ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
