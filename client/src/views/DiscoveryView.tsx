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
  AlertCircle 
} from 'lucide-react';
import { MonitoredSource, DiscoveredPost, Project } from '../types';
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedProfile, setSearchedProfile] = useState<any>(null);

  // New source configuration modal/inline
  const [minLikesFilter, setMinLikesFilter] = useState(50);
  const [autoQueue, setAutoQueue] = useState(false);
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Filters for discovered posts
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minLikesFeed, setMinLikesFeed] = useState<number>(0);

  // Notification / logs
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [srcList, postList] = await Promise.all([
        api.getMonitoredSources(),
        api.getDiscoveredPosts()
      ]);
      setSources(srcList);
      setPosts(postList);
    } catch (err: any) {
      console.warn('Failed to load discovery data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchUsername.trim()) return;

    try {
      setIsSearching(true);
      setSearchedProfile(null);
      const data = await api.previewProfile(searchUsername.trim());
      setSearchedProfile(data);
    } catch (err: any) {
      alert('Không thể khám phá kênh: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMonitoredSource = async () => {
    if (!searchedProfile?.profile?.username) return;
    try {
      setIsAddingSource(true);
      const added = await api.addMonitoredSource({
        username: searchedProfile.profile.username,
        minLikesFilter,
        autoQueueToAutomation: autoQueue
      });
      setSources(prev => [added, ...prev]);
      setSearchedProfile(null);
      setSearchUsername('');
      showToast(`Đã thêm @${added.username} vào danh sách theo dõi tự động!`);
      // Reload posts in background
      api.getDiscoveredPosts().then(setPosts).catch(() => {});
    } catch (err: any) {
      alert('Lỗi thêm kênh theo dõi: ' + err.message);
    } finally {
      setIsAddingSource(false);
    }
  };

  const handleSyncSource = async (id: string, username: string) => {
    try {
      showToast(`Đang quét bài viết mới nhất từ @${username}...`);
      const res = await api.syncMonitoredSource(id);
      showToast(`Đồng bộ thành công! Tìm thấy ${res.discoveredCount} bài viết mới.`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi đồng bộ kênh: ' + err.message);
    }
  };

  const handleDeleteSource = async (id: string, username: string) => {
    if (!confirm(`Bạn có chắc muốn ngừng theo dõi kênh @${username}?`)) return;
    try {
      await api.deleteMonitoredSource(id);
      setSources(prev => prev.filter(s => s.id !== id));
      showToast(`Đã ngừng theo dõi @${username}`);
    } catch (err: any) {
      alert('Lỗi khi xóa kênh: ' + err.message);
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

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1c38] via-[#0f1f3d] to-[#0a162b] p-6 rounded-2xl border border-[#1b3154] shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Compass size={22} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Khám phá & Theo dõi Threads (Phase 9)</h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] border border-blue-500/30 font-semibold">
              Public Discovery
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Tự động theo dõi các nhà sáng tạo nội dung Threads nổi bật, lọc bài viết viral theo lượt tương tác, chống trùng lặp dữ liệu và 1-click đưa thẳng vào dây chuyền sản xuất video tự động.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 bg-[#14233e] hover:bg-[#1a2e52] text-slate-200 rounded-xl text-xs font-semibold border border-[#203a66] flex items-center gap-1.5 transition active:scale-95"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-blue-400' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Search & Channel Discovery Box */}
      <div className="bg-[#0b1528] rounded-2xl border border-[#192c4b] p-5 space-y-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Search size={14} className="text-blue-400" />
          <span>Khám phá kênh Threads công khai</span>
        </h2>

        <form onSubmit={handleSearchProfile} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 font-mono text-xs">@</span>
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              placeholder="Nhập username (ví dụ: mrbeast, cristiano, hoặc link Threads)..."
              className="w-full bg-[#101e38] border border-[#1f3760] rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchUsername.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition active:scale-95 shrink-0"
          >
            {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            <span>Khám phá ngay</span>
          </button>
        </form>

        {/* Profile Live Discovery Preview */}
        {searchedProfile && searchedProfile.profile && (
          <div className="bg-[#10203e] rounded-xl border border-blue-500/30 p-4 space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={searchedProfile.profile.avatarUrl}
                  alt={searchedProfile.profile.username}
                  className="w-12 h-12 rounded-full border border-blue-400/40 object-cover bg-slate-800"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${searchedProfile.profile.username}`; }}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">{searchedProfile.profile.displayName}</h3>
                    {searchedProfile.profile.verified && <CheckCircle2 size={13} className="text-blue-400" />}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">@{searchedProfile.profile.username}</p>
                  <p className="text-[11px] text-slate-300 mt-1">{searchedProfile.profile.bio}</p>
                </div>
              </div>

              {/* Source configuration options before adding */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#0a1426] p-3 rounded-xl border border-[#1b3154]">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
                    <span>Lọc tối thiểu tim:</span>
                    <span className="font-mono text-cyan-300 font-semibold">{minLikesFilter} likes</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={minLikesFilter}
                    onChange={(e) => setMinLikesFilter(Number(e.target.value))}
                    className="w-28 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoQueue}
                    onChange={(e) => setAutoQueue(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-[#172744] border-[#253f68] text-blue-600 focus:ring-0"
                  />
                  <span>Tự động đẩy vào Automation</span>
                </label>

                <button
                  type="button"
                  onClick={handleAddMonitoredSource}
                  disabled={isAddingSource}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Plus size={14} />
                  <span>{isAddingSource ? 'Đang thêm...' : 'Theo dõi kênh'}</span>
                </button>
              </div>
            </div>

            {/* Recent Posts preview */}
            {searchedProfile.recentPosts && searchedProfile.recentPosts.length > 0 && (
              <div className="pt-3 border-t border-[#1b3154]/60 space-y-2">
                <p className="text-[11px] font-semibold text-slate-400">Bài viết gần đây được phát hiện:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {searchedProfile.recentPosts.slice(0, 2).map((rp: any) => (
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

      {/* Monitored Channels Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <UserCheck size={14} className="text-emerald-400" />
            <span>Kênh đang theo dõi ({sources.length})</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Tự động quét định kỳ mỗi 30 phút</span>
        </div>

        {sources.length === 0 ? (
          <div className="bg-[#0b1528] rounded-2xl border border-dashed border-[#1f3760] p-8 text-center space-y-2 text-slate-400">
            <Compass size={32} className="mx-auto text-slate-500 opacity-60" />
            <p className="text-xs font-medium">Chưa có kênh nào được theo dõi</p>
            <p className="text-[11px] text-slate-500">Nhập username ở khung tìm kiếm phía trên để bắt đầu theo dõi các nhà sáng tạo Threads tiềm năng.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map(src => (
              <div key={src.id} className="bg-[#0b1528] rounded-xl border border-[#192c4b] hover:border-[#223d68] p-4 space-y-3 transition group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={src.avatarUrl}
                      alt={src.username}
                      className="w-10 h-10 rounded-full border border-blue-500/20 object-cover bg-slate-800"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${src.username}`; }}
                    />
                    <div>
                      <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition truncate max-w-[140px]">
                        {src.displayName || src.username}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">@{src.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSyncSource(src.id, src.username)}
                      title="Quét bài viết ngay"
                      className="p-1.5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-lg transition"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteSource(src.id, src.username)}
                      title="Xóa theo dõi"
                      className="p-1.5 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#0e1b33] p-2 rounded-lg border border-[#193259]">
                  <div>
                    <span className="text-slate-500 block">Lọc tối thiểu:</span>
                    <span className="text-cyan-300 font-semibold">{src.minLikesFilter} likes</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Đã phát hiện:</span>
                    <span className="text-emerald-300 font-semibold">{src.totalPostsDiscovered} bài</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> Quét: {src.lastScrapedAt ? new Date(src.lastScrapedAt).toLocaleTimeString('vi-VN') : 'Mới tạo'}
                  </span>
                  <a
                    href={`https://www.threads.net/@${src.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    Xem <ExternalLink size={10} />
                  </a>
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
            <p className="text-[11px] text-slate-400 mt-0.5">Bài viết thu thập tự động từ các kênh được theo dõi, đã lọc chống trùng lặp dữ liệu</p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="bg-[#12213d] border border-[#203a66] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Tất cả kênh</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>@{s.username}</option>
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
