import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Search, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Film, 
  Heart, 
  MessageCircle, 
  UserCheck, 
  Sliders, 
  TrendingUp, 
  Clock, 
  Check, 
  AlertCircle,
  Tag,
  Hash,
  User,
  ShieldAlert,
  PlayCircle,
  PauseCircle,
  History,
  Filter,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { 
  MonitoredSource, 
  DiscoveredPost, 
  DiscoverySourceType, 
  DiscoverySearchMode, 
  DiscoveryMediaType,
  DiscoverySyncLog,
  DiscoveryRateLimits,
  Project 
} from '../types';
import { api } from '../services/api';

interface DiscoveryViewProps {
  onSelectProject: (projectId: string) => void;
  onOpenStudio: () => void;
  onOpenAutomation: () => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  onSelectProject,
  onOpenStudio,
  onOpenAutomation
}) => {
  const [sources, setSources] = useState<MonitoredSource[]>([]);
  const [posts, setPosts] = useState<DiscoveredPost[]>([]);
  const [syncLogs, setSyncLogs] = useState<DiscoverySyncLog[]>([]);
  const [rateLimits, setRateLimits] = useState<DiscoveryRateLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Search & New Source state
  const [searchType, setSearchType] = useState<DiscoverySourceType>('PROFILE');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<DiscoverySearchMode>('TOP');
  const [mediaType, setMediaType] = useState<DiscoveryMediaType>('ALL');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ profile?: any; posts: any[] } | null>(null);

  // Sync config options for new source
  const [limitPerSync, setLimitPerSync] = useState(20);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(60);
  const [minLikesFilter, setMinLikesFilter] = useState(50);
  const [autoQueue, setAutoQueue] = useState(false);
  const [fetchReplies, setFetchReplies] = useState(true);
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Feed filters
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mediaFilter, setMediaFilter] = useState<string>('all');
  const [minLikesFeed, setMinLikesFeed] = useState<number>(0);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [srcList, postList, logs, limits] = await Promise.all([
        api.getMonitoredSources(),
        api.getDiscoveredPosts(),
        api.getDiscoveryLogs(30),
        api.getDiscoveryRateLimits().catch(() => null)
      ]);
      setSources(srcList);
      setPosts(postList);
      setSyncLogs(logs);
      if (limits) setRateLimits(limits);
    } catch (err: any) {
      console.warn('Failed to load discovery data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      api.getMonitoredSources().then(setSources).catch(() => {});
      api.getDiscoveredPosts().then(setPosts).catch(() => {});
      api.getDiscoveryRateLimits().then(setRateLimits).catch(() => {});
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchResults(null);
      const res = await api.searchPublic({
        type: searchType,
        query: searchQuery.trim(),
        searchMode,
        mediaType,
        limit: limitPerSync
      });
      setSearchResults(res);
      api.getDiscoveryRateLimits().then(setRateLimits).catch(() => {});
    } catch (err: any) {
      alert('Không thể tìm kiếm: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSource = async () => {
    if (!searchQuery.trim()) return;
    try {
      setIsAddingSource(true);
      const added = await api.addMonitoredSource({
        sourceType: searchType,
        target: searchQuery.trim(),
        searchMode,
        mediaType,
        limitPerSync,
        syncIntervalMinutes,
        fetchReplies,
        minLikesFilter,
        autoQueueToAutomation: autoQueue
      });
      setSources(prev => [added, ...prev]);
      setSearchResults(null);
      setSearchQuery('');
      showToast(`Đã thêm ${searchType === 'PROFILE' ? '@' : ''}${added.target} vào nguồn theo dõi tự động!`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi thêm nguồn theo dõi: ' + err.message);
    } finally {
      setIsAddingSource(false);
    }
  };

  const handleSyncSource = async (id: string, target: string) => {
    try {
      showToast(`Đang quét bài viết mới nhất từ "${target}"...`);
      const res = await api.syncMonitoredSource(id);
      showToast(`Đồng bộ thành công! Tìm thấy ${res.discoveredCount} bài viết mới.`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi đồng bộ nguồn: ' + err.message);
    }
  };

  const handleToggleSource = async (id: string, currentStatus: boolean, target: string) => {
    try {
      const nextStatus = !currentStatus;
      await api.toggleMonitoredSource(id, nextStatus);
      setSources(prev => prev.map(s => s.id === id ? { ...s, isActive: nextStatus } : s));
      showToast(`${nextStatus ? 'Đã bật' : 'Đã tạm dừng'} theo dõi "${target}"`);
    } catch (err: any) {
      alert('Lỗi thay đổi trạng thái nguồn: ' + err.message);
    }
  };

  const handleDeleteSource = async (id: string, target: string) => {
    if (!confirm(`Bạn có chắc muốn ngừng theo dõi nguồn "${target}"?`)) return;
    try {
      await api.deleteMonitoredSource(id);
      setSources(prev => prev.filter(s => s.id !== id));
      showToast(`Đã xóa nguồn theo dõi "${target}"`);
    } catch (err: any) {
      alert('Lỗi khi xóa nguồn: ' + err.message);
    }
  };

  const handleConvertPostToProject = async (postId: string) => {
    try {
      showToast('Đang chuyển bài viết thành dự án Threads Studio...');
      const project = await api.convertDiscoveredPostToProject(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'imported_to_project', projectId: project.id } : p));
      onSelectProject(project.id);
      onOpenStudio();
    } catch (err: any) {
      alert('Lỗi tạo dự án từ bài viết: ' + err.message);
    }
  };

  const handleQueuePostToBatch = async (postId: string) => {
    try {
      showToast('Đang đưa bài viết vào hàng đợi Automation Engine...');
      const res = await api.queueDiscoveredPostToBatch(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'queued_to_batch', batchId: res.batchId } : p));
      showToast('Đã đưa bài viết vào Automation Engine thành công!');
    } catch (err: any) {
      alert('Lỗi đưa vào hàng đợi: ' + err.message);
    }
  };

  const filteredPosts = posts.filter(p => {
    if (selectedSourceId !== 'all' && p.sourceId !== selectedSourceId) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (mediaFilter !== 'all' && p.mediaType !== mediaFilter) return false;
    if (minLikesFeed > 0 && p.likesCount < minLikesFeed) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#070d19] p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-blue-400/40 animate-fade-in font-medium text-xs">
          <Sparkles size={15} className="animate-spin text-cyan-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner with Rate Limit Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1c38] via-[#0f1f3d] to-[#0a162b] p-6 rounded-2xl border border-[#1b3154] shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Compass size={22} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Public Threads Discovery & Advanced Sync (Phase 9)</h1>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/30 font-semibold">
              v0.9.0
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Tra cứu hồ sơ công khai, tìm kiếm từ khóa và topic tags, thiết lập chu kỳ tự động quét (15 phút đến 24 giờ), chống trùng lặp SHA-256 và tự động đẩy bài mới vào dây chuyền sản xuất video.
          </p>
        </div>

        {/* Rate Limits & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {rateLimits && (
            <div className="flex items-center gap-2 bg-[#081121] px-3 py-2 rounded-xl border border-[#192f52] text-[11px] font-mono">
              <div className="text-right">
                <span className="text-slate-400 block text-[9px] uppercase">Profile Lookup</span>
                <span className={rateLimits.profileLookups.remaining < 50 ? 'text-amber-400' : 'text-emerald-400'}>
                  {rateLimits.profileLookups.used24h}/{rateLimits.profileLookups.max24h}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <div className="text-right">
                <span className="text-slate-400 block text-[9px] uppercase">Keyword Search</span>
                <span className={rateLimits.keywordSearches.remaining < 100 ? 'text-amber-400' : 'text-cyan-400'}>
                  {rateLimits.keywordSearches.used24h}/{rateLimits.keywordSearches.max24h}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowLogsDrawer(!showLogsDrawer)}
            className="px-3 py-2 bg-[#14233e] hover:bg-[#1a2e52] text-slate-200 rounded-xl text-xs font-semibold border border-[#203a66] flex items-center gap-1.5 transition active:scale-95"
            title="Xem lịch sử đồng bộ"
          >
            <History size={14} className="text-purple-400" />
            <span>Lịch sử ({syncLogs.length})</span>
          </button>

          <button
            onClick={loadData}
            className="px-3 py-2 bg-[#14233e] hover:bg-[#1a2e52] text-slate-200 rounded-xl text-xs font-semibold border border-[#203a66] flex items-center gap-1.5 transition active:scale-95"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-blue-400' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Sync Logs Drawer (Collapsible) */}
      {showLogsDrawer && (
        <div className="bg-[#0a1324] rounded-2xl border border-purple-500/30 p-5 space-y-3 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <History size={14} />
              <span>Nhật ký đồng bộ tự động (Sync History Logs)</span>
            </h3>
            <button 
              onClick={() => setShowLogsDrawer(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Đóng
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 font-mono text-[11px]">
            {syncLogs.length === 0 ? (
              <p className="text-slate-500 py-3 text-center">Chưa có lượt quét nào được ghi nhận</p>
            ) : (
              syncLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0e1b33] border border-[#182f54]">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      log.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                    <span className="text-cyan-300">[{log.sourceType}]</span>
                    <span className="text-white font-semibold">{log.sourceTarget}</span>
                    <span className="text-slate-400">• {log.message}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[10px]">
                    <span className="text-emerald-400">+{log.newPostsSaved} mới</span>
                    {log.queuedToBatch > 0 && <span className="text-amber-400">⚡ {log.queuedToBatch} queue</span>}
                    <span>{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Discovery & Source Creation Panel */}
      <div className="bg-[#0b1528] rounded-2xl border border-[#192c4b] p-5 space-y-4 shadow-sm">
        {/* Source Type Selector Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#182b47]">
          <div className="flex items-center gap-2">
            {(['PROFILE', 'KEYWORD', 'TAG'] as DiscoverySourceType[]).map(t => (
              <button
                key={t}
                onClick={() => { setSearchType(t); setSearchResults(null); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  searchType === t
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#101e38] text-slate-400 hover:text-slate-200 border border-[#1f3760]'
                }`}
              >
                {t === 'PROFILE' && <User size={13} />}
                {t === 'KEYWORD' && <Search size={13} />}
                {t === 'TAG' && <Hash size={13} />}
                <span>
                  {t === 'PROFILE' && 'Hồ sơ (PROFILE)'}
                  {t === 'KEYWORD' && 'Từ khóa (KEYWORD)'}
                  {t === 'TAG' && 'Topic Tag (TAG)'}
                </span>
              </button>
            ))}
          </div>

          {/* Filters: TOP vs RECENT, Media Type */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#101e38] rounded-xl p-0.5 border border-[#1f3760]">
              <button
                type="button"
                onClick={() => setSearchMode('TOP')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                  searchMode === 'TOP' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                TOP
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('RECENT')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                  searchMode === 'RECENT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                RECENT
              </button>
            </div>

            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as DiscoveryMediaType)}
              className="bg-[#101e38] border border-[#1f3760] rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Mọi định dạng</option>
              <option value="TEXT">Chỉ chữ (Text)</option>
              <option value="IMAGE">Có hình ảnh</option>
              <option value="VIDEO">Có video</option>
            </select>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 font-mono text-xs">
              {searchType === 'PROFILE' ? '@' : searchType === 'TAG' ? '#' : '🔍'}
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchType === 'PROFILE' 
                  ? 'Nhập username Threads (ví dụ: mrbeast, cristiano, hoặc link Threads)...' 
                  : searchType === 'TAG'
                  ? 'Nhập topic tag (ví dụ: mmo, kinhdoanh, crypto, AI)...'
                  : 'Nhập từ khóa tìm kiếm (ví dụ: kiếm tiền online, bài học cuộc sống, làm giàu)...'
              }
              className="w-full bg-[#101e38] border border-[#1f3760] rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition active:scale-95 shrink-0"
          >
            {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            <span>Tìm kiếm & Khám phá</span>
          </button>
        </form>

        {/* Search Results Preview & Pre-Configuration */}
        {searchResults && (
          <div className="bg-[#10203e] rounded-xl border border-blue-500/30 p-4 space-y-4 animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {searchResults.profile ? (
                <div className="flex items-center gap-3">
                  <img
                    src={searchResults.profile.avatarUrl}
                    alt={searchResults.profile.username}
                    className="w-12 h-12 rounded-full border border-blue-400/40 object-cover bg-slate-800"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${searchResults.profile.username}`; }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white">{searchResults.profile.displayName}</h3>
                      {searchResults.profile.verified && <CheckCircle2 size={13} className="text-blue-400" />}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">@{searchResults.profile.username}</p>
                    <p className="text-[11px] text-slate-300 mt-1">{searchResults.profile.bio}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {searchType === 'TAG' ? <Hash size={14} className="text-purple-400" /> : <Search size={14} className="text-cyan-400" />}
                    <span>Kết quả tìm kiếm: "{searchQuery}"</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">Chế độ: {searchMode} · Lọc: {mediaType}</p>
                </div>
              )}

              {/* Source Monitoring Configuration Deck */}
              <div className="flex flex-wrap items-center gap-3 bg-[#0a1426] p-3 rounded-xl border border-[#1b3154]">
                {/* Chu kỳ quét */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">Chu kỳ quét:</span>
                  <select
                    value={syncIntervalMinutes}
                    onChange={(e) => setSyncIntervalMinutes(Number(e.target.value))}
                    className="bg-[#152542] border border-[#203a66] rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="15">15 phút</option>
                    <option value="30">30 phút</option>
                    <option value="60">1 giờ</option>
                    <option value="120">2 giờ</option>
                    <option value="360">6 giờ</option>
                    <option value="720">12 giờ</option>
                    <option value="1440">24 giờ</option>
                  </select>
                </div>

                {/* Giới hạn bài mỗi lượt */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">Số bài/lượt:</span>
                  <select
                    value={limitPerSync}
                    onChange={(e) => setLimitPerSync(Number(e.target.value))}
                    className="bg-[#152542] border border-[#203a66] rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="10">10 bài</option>
                    <option value="20">20 bài</option>
                    <option value="50">50 bài</option>
                    <option value="100">100 bài</option>
                  </select>
                </div>

                {/* Lọc tim tối thiểu */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">Min Likes: {minLikesFilter}</span>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={minLikesFilter}
                    onChange={(e) => setMinLikesFilter(Number(e.target.value))}
                    className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoQueue}
                      onChange={(e) => setAutoQueue(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-[#172744] border-[#253f68] text-blue-600 focus:ring-0"
                    />
                    <span>Tự động đẩy vào Automation</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fetchReplies}
                      onChange={(e) => setFetchReplies(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-[#172744] border-[#253f68] text-blue-600 focus:ring-0"
                    />
                    <span>Lấy cả Replies & Nested</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleAddSource}
                  disabled={isAddingSource}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
                >
                  <Plus size={14} />
                  <span>{isAddingSource ? 'Đang thêm...' : 'Theo dõi nguồn này'}</span>
                </button>
              </div>
            </div>

            {/* Recent Posts preview */}
            {searchResults.posts && searchResults.posts.length > 0 && (
              <div className="pt-3 border-t border-[#1b3154]/60 space-y-2">
                <p className="text-[11px] font-semibold text-slate-400">Các bài viết mới nhất vừa phát hiện:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {searchResults.posts.slice(0, 2).map((rp: any) => (
                    <div key={rp.id} className="bg-[#0c1830] p-3 rounded-lg border border-[#1c355c] space-y-1.5">
                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">{rp.text}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-rose-400"><Heart size={11} /> {rp.likes}</span>
                        <span className="flex items-center gap-1 text-blue-400"><MessageCircle size={11} /> {rp.repliesCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Monitored Sources Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <UserCheck size={14} className="text-emerald-400" />
            <span>Nguồn đang theo dõi ({sources.length})</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Scheduler kiểm tra mỗi 60s · Xử lý tối đa 5 nguồn/lượt</span>
        </div>

        {sources.length === 0 ? (
          <div className="bg-[#0b1528] rounded-2xl border border-dashed border-[#1f3760] p-8 text-center space-y-2 text-slate-400">
            <Compass size={32} className="mx-auto text-slate-500 opacity-60" />
            <p className="text-xs font-medium">Chưa có nguồn nào trong danh sách theo dõi</p>
            <p className="text-[11px] text-slate-500">Khám phá theo Profile, Từ khóa hoặc Topic Tag ở phía trên để bắt đầu đồng bộ tự động.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map(src => (
              <div 
                key={src.id} 
                className={`bg-[#0b1528] rounded-xl border p-4 space-y-3 transition group ${
                  src.isActive ? 'border-[#192c4b] hover:border-[#223d68]' : 'border-[#192c4b] opacity-65'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={src.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${src.target}`}
                      alt={src.target}
                      className="w-10 h-10 rounded-full border border-blue-500/20 object-cover bg-slate-800"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${src.target}`; }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                          src.sourceType === 'PROFILE' ? 'bg-blue-500/20 text-blue-300' :
                          src.sourceType === 'TAG' ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {src.sourceType}
                        </span>
                        <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition truncate max-w-[130px]">
                          {src.displayName || src.target}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {src.sourceType === 'PROFILE' ? `@${src.target}` : src.sourceType === 'TAG' ? `#${src.target}` : `"${src.target}"`}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Sync, Pause/Resume, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSyncSource(src.id, src.target)}
                      title="Quét bài viết ngay"
                      className="p-1.5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-lg transition"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleSource(src.id, src.isActive, src.target)}
                      title={src.isActive ? 'Tạm dừng theo dõi' : 'Bật lại theo dõi'}
                      className={`p-1.5 rounded-lg transition ${
                        src.isActive ? 'hover:bg-amber-600/20 text-slate-400 hover:text-amber-400' : 'hover:bg-emerald-600/20 text-emerald-400'
                      }`}
                    >
                      {src.isActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                    </button>
                    <button
                      onClick={() => handleDeleteSource(src.id, src.target)}
                      title="Xóa theo dõi"
                      className="p-1.5 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-[#0e1b33] p-2 rounded-lg border border-[#193259]">
                  <div>
                    <span className="text-slate-500 block">Chu kỳ:</span>
                    <span className="text-cyan-300 font-semibold">{src.syncIntervalMinutes}m</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Min Likes:</span>
                    <span className="text-rose-300 font-semibold">{src.minLikesFilter}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Đã quét:</span>
                    <span className="text-emerald-300 font-semibold">{src.totalPostsDiscovered} bài</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> Quét gần nhất: {src.lastScrapedAt ? new Date(src.lastScrapedAt).toLocaleTimeString('vi-VN') : 'Mới tạo'}
                  </span>
                  {src.sourceType === 'PROFILE' && (
                    <a
                      href={`https://www.threads.net/@${src.target}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-0.5"
                    >
                      Xem <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discovered Viral Posts Feed */}
      <div className="bg-[#0b1528] rounded-2xl border border-[#192c4b] p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#182b47]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <TrendingUp size={14} className="text-rose-400" />
              <span>Bảng tin bài viết viral phát hiện được ({filteredPosts.length})</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Bài viết thu thập tự động từ các nguồn theo dõi, đã lọc chống trùng lặp dữ liệu SHA-256</p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="bg-[#12213d] border border-[#203a66] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Tất cả nguồn</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>[{s.sourceType}] {s.target}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#12213d] border border-[#203a66] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="discovered">Mới phát hiện</option>
              <option value="queued_to_batch">Đã đưa vào Automation</option>
              <option value="imported_to_project">Đã làm video</option>
            </select>

            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value)}
              className="bg-[#12213d] border border-[#203a66] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Mọi loại media</option>
              <option value="TEXT">Văn bản (Text)</option>
              <option value="IMAGE">Hình ảnh</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>
        </div>

        {/* Posts List */}
        {filteredPosts.length === 0 ? (
          <div className="p-8 text-center space-y-2 text-slate-400">
            <Layers size={28} className="mx-auto text-slate-500 opacity-60" />
            <p className="text-xs">Chưa có bài viết nào phù hợp bộ lọc</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map(post => {
              const src = sources.find(s => s.id === post.sourceId);
              return (
                <div
                  key={post.id}
                  className="bg-[#0f1d36] hover:bg-[#122240] rounded-xl border border-[#1b3359] p-4 transition space-y-3 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-white">@{post.authorUsername}</span>
                      <span className="text-slate-500 text-[10px]">• {new Date(post.createdAt).toLocaleTimeString('vi-VN')}</span>
                      {src && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {src.sourceType}: {src.target}
                        </span>
                      )}
                      {post.status === 'queued_to_batch' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-mono border border-amber-500/20">
                          Đã xếp hàng Automation
                        </span>
                      )}
                      {post.status === 'imported_to_project' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/20">
                          Đã tạo Studio Project
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed max-w-3xl">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-rose-400">
                        <Heart size={12} className="fill-rose-500/20" /> {post.likesCount.toLocaleString()} tim
                      </span>
                      <span className="flex items-center gap-1 text-blue-400">
                        <MessageCircle size={12} /> {post.repliesCount} bình luận
                      </span>
                      {post.mediaUrl && (
                        <span className="flex items-center gap-1 text-purple-400">
                          <ImageIcon size={12} /> Có đính kèm
                        </span>
                      )}
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-blue-300 flex items-center gap-1 transition"
                      >
                        <ExternalLink size={11} /> Mở bài viết
                      </a>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleConvertPostToProject(post.id)}
                      className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Film size={13} />
                      <span>Tạo video ngay</span>
                    </button>
                    <button
                      onClick={() => handleQueuePostToBatch(post.id)}
                      disabled={post.status === 'queued_to_batch'}
                      className="px-3 py-2 bg-[#172c4e] hover:bg-[#203c6b] disabled:opacity-50 text-cyan-200 rounded-xl text-xs font-semibold border border-cyan-500/30 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Sparkles size={13} className="text-cyan-400" />
                      <span>{post.status === 'queued_to_batch' ? 'Đã xếp hàng' : 'Đưa vào Automation'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
