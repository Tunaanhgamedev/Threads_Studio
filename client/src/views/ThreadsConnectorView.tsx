import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  MessageSquare, 
  Heart, 
  Zap, 
  Film, 
  Clock, 
  ShieldCheck, 
  Radio, 
  Sparkles,
  Info,
  ChevronRight,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ThreadsAccount, ThreadsSyncedPost } from '../types';
import { api } from '../services/api';

interface ThreadsConnectorViewProps {
  onSelectProject?: (projectId: string) => void;
  onOpenStudio?: () => void;
  onOpenAutomation?: () => void;
}

export const ThreadsConnectorView: React.FC<ThreadsConnectorViewProps> = ({
  onSelectProject,
  onOpenStudio,
  onOpenAutomation
}) => {
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [posts, setPosts] = useState<ThreadsSyncedPost[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);

  // Modal Add Account
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [autoSyncInput, setAutoSyncInput] = useState(true);
  const [syncIntervalInput, setSyncIntervalInput] = useState(60);
  const [isAdding, setIsAdding] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Toast / feedback notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load accounts and synced posts
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [accs, pts] = await Promise.all([
        api.getThreadsAccounts(),
        api.getSyncedThreadsPosts()
      ]);
      setAccounts(accs);
      setPosts(pts);
    } catch (err: any) {
      console.warn('Failed to load Threads Connector data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput && !usernameInput) {
      setModalError('Vui lòng nhập Access Token hoặc Username');
      return;
    }

    setIsAdding(true);
    setModalError(null);

    try {
      await api.addThreadsAccount({
        accessToken: tokenInput.trim(),
        username: usernameInput.trim(),
        displayName: displayNameInput.trim() || undefined,
        autoSync: autoSyncInput,
        syncIntervalMins: syncIntervalInput
      });

      setIsAddModalOpen(false);
      setTokenInput('');
      setUsernameInput('');
      setDisplayNameInput('');
      showToast('Đã kết nối tài khoản Threads thành công!');
      confetti({ particleCount: 50, spread: 60 });
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Không thể kết nối tài khoản Threads');
    } finally {
      setIsAdding(false);
    }
  };

  // Sync single account
  const handleSyncAccount = async (accountId: string) => {
    setActiveSyncId(accountId);
    try {
      const res = await api.syncThreadsAccount(accountId);
      showToast(`Đã đồng bộ xong! ${res.syncedCount} bài viết mới được nạp vào kho.`);
      loadData();
    } catch (err: any) {
      showToast(`Lỗi đồng bộ: ${err.message}`, 'error');
    } finally {
      setActiveSyncId(null);
    }
  };

  // Sync all accounts
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const res = await api.syncAllThreadsAccounts();
      showToast(`Đồng bộ toàn bộ hoàn tất! Tổng cộng +${res.totalSynced} bài viết.`);
      confetti({ particleCount: 40, spread: 50 });
      loadData();
    } catch (err: any) {
      showToast(`Lỗi đồng bộ toàn bộ: ${err.message}`, 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async (id: string, user: string) => {
    if (!confirm(`Bạn có chắc chắn muốn ngắt kết nối tài khoản @${user}?`)) return;
    try {
      await api.deleteThreadsAccount(id);
      showToast(`Đã ngắt kết nối tài khoản @${user}`);
      loadData();
    } catch (err: any) {
      showToast(`Lỗi xóa tài khoản: ${err.message}`, 'error');
    }
  };

  // Convert post to Studio Project
  const handleConvertToProject = async (syncedPostId: string) => {
    try {
      const project = await api.convertPostToProject(syncedPostId);
      showToast(`Đã tạo dự án video thành công! Chuyển tới Studio...`);
      confetti({ particleCount: 70, spread: 70 });
      loadData();
      if (onSelectProject) onSelectProject(project.id);
      if (onOpenStudio) onOpenStudio();
    } catch (err: any) {
      showToast(`Lỗi tạo dự án: ${err.message}`, 'error');
    }
  };

  // Queue post to Batch Automation
  const handleQueueToBatch = async (syncedPostId: string) => {
    try {
      await api.queuePostToBatch(syncedPostId);
      showToast(`Đã đưa bài viết vào hàng đợi Automation Engine!`);
      loadData();
    } catch (err: any) {
      showToast(`Lỗi xếp hàng: ${err.message}`, 'error');
    }
  };

  // Filter posts
  const filteredPosts = posts.filter(p => {
    if (selectedAccountId !== 'all' && p.accountId !== selectedAccountId) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070d19] overflow-y-auto p-5 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold border ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-red-950/90 border-red-500/50 text-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-red-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1c38] via-[#0f244a] to-[#0d1c38] rounded-2xl border border-[#1e3863] p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Radio size={18} className="animate-pulse" />
            </div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Threads API Connector & Real Data Sync</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                Phase 8 Pro
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Kết nối trực tiếp tài khoản Threads qua <strong>Meta Graph API</strong> hoặc <strong>Public Live Extractor</strong>. 
            Đồng bộ bài viết và bình luận <strong>thật 100%</strong> từ mạng về kho, tự động chuyển hóa thành kịch bản video và đưa vào dây chuyền sản xuất tự động.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll || accounts.length === 0}
            className="px-3.5 py-2 bg-[#172d52] hover:bg-[#1f3c6e] disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold border border-[#23457d] transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Đồng bộ tất cả bài viết mới từ mọi tài khoản đã kết nối"
          >
            <RefreshCw size={13} className={isSyncingAll ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
            <span>{isSyncingAll ? 'Đang đồng bộ...' : 'Đồng bộ tất cả'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={14} />
            <span>Kết nối tài khoản</span>
          </button>
        </div>
      </div>

      {/* Connected Accounts Bar */}
      <div className="bg-[#0b1526] rounded-2xl border border-[#192f54] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Tài khoản Threads đã kết nối ({accounts.length})</span>
          </h2>
          <span className="text-[11px] text-slate-400">
            {accounts.some(a => a.autoSync) ? '● Auto-Sync đang bật định kỳ' : '○ Chưa bật Auto-Sync'}
          </span>
        </div>

        {accounts.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-[#1a3359] rounded-xl bg-[#091222]">
            <Globe size={28} className="text-slate-500 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-medium text-slate-300">Chưa có tài khoản Threads nào được kết nối</p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
              Kết nối tài khoản Meta Threads API của bạn để tự động kéo bài viết và bình luận thật về Studio.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition"
            >
              <Plus size={13} />
              <span>Kết nối ngay</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {accounts.map(acc => (
              <div 
                key={acc.id}
                className="bg-[#0f1d36] rounded-xl border border-[#203a66] p-3 shadow-sm hover:border-emerald-500/40 transition flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <img 
                    src={acc.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.username}`} 
                    alt={acc.username}
                    className="w-10 h-10 rounded-full bg-slate-800 border border-[#2a4d85] object-cover shrink-0" 
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-100 truncate">{acc.displayName || acc.username}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Hoạt động" />
                    </div>
                    <p className="text-[11px] text-emerald-400 font-mono truncate">@{acc.username}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span>Sync: {acc.autoSync ? `${acc.syncIntervalMins}m` : 'Thủ công'}</span>
                      <span>·</span>
                      <span className="truncate">{acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleTimeString() : 'Chưa sync'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#182d50]">
                  <button
                    onClick={() => handleSyncAccount(acc.id)}
                    disabled={activeSyncId === acc.id}
                    className="px-2.5 py-1 bg-[#1a335c] hover:bg-[#23457d] text-cyan-300 rounded-lg text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} className={activeSyncId === acc.id ? 'animate-spin' : ''} />
                    <span>{activeSyncId === acc.id ? 'Đang sync...' : 'Đồng bộ'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <a
                      href={`https://www.threads.net/@${acc.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-[#1a335c] text-slate-400 hover:text-slate-200 rounded transition"
                      title="Xem trang cá nhân Threads"
                    >
                      <ExternalLink size={13} />
                    </a>
                    <button
                      onClick={() => handleDeleteAccount(acc.id, acc.username)}
                      className="p-1 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded transition cursor-pointer"
                      title="Xóa tài khoản"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Synced Posts Section */}
      <div className="bg-[#0b1526] rounded-2xl border border-[#192f54] p-4 space-y-4">
        {/* Filters Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#182d50]">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={14} className="text-blue-400" />
              <span>Kho bài viết & bình luận thật ({filteredPosts.length})</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by Account */}
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-[#101e36] text-slate-200 text-xs px-2.5 py-1.5 rounded-xl border border-[#1f3760] focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả tài khoản</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>@{a.username}</option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#101e36] text-slate-200 text-xs px-2.5 py-1.5 rounded-xl border border-[#1f3760] focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="synced">Mới đồng bộ</option>
              <option value="imported_to_project">Đã tạo video</option>
              <option value="queued_to_batch">Đang trong Automation</option>
            </select>
          </div>
        </div>

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50 text-slate-500" />
            <p className="text-xs font-semibold text-slate-300">Chưa có bài viết nào trong kho dữ liệu thật</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hãy nhấn nút <strong>"Đồng bộ"</strong> ở trên để nạp các bài viết mới nhất từ Threads.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPosts.map(post => {
              let parsedRepliesCount = post.repliesCount || 0;
              let sampleReplies: any[] = [];
              try {
                if (post.rawReplies) sampleReplies = JSON.parse(post.rawReplies);
              } catch {}

              return (
                <div 
                  key={post.id}
                  className="bg-[#0e1b33] rounded-xl border border-[#1e3863] p-4 shadow-sm hover:border-blue-500/50 transition flex flex-col justify-between space-y-3"
                >
                  <div>
                    {/* Author & Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={post.authorAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.authorUsername}`} 
                          alt={post.authorUsername}
                          className="w-7 h-7 rounded-full bg-slate-800 border border-[#244579] object-cover" 
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-200 leading-tight">
                            {post.authorName || post.authorUsername}
                          </p>
                          <p className="text-[10px] text-blue-400 font-mono">@{post.authorUsername}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        post.status === 'imported_to_project' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        post.status === 'queued_to_batch' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {post.status === 'imported_to_project' ? '✓ Đã tạo video' :
                         post.status === 'queued_to_batch' ? '⚡ Trong Automation' : '● Mới đồng bộ'}
                      </span>
                    </div>

                    {/* Content Snippet */}
                    <p className="text-xs text-slate-100 font-medium leading-relaxed line-clamp-3 mb-2.5">
                      {post.text}
                    </p>

                    {/* Media thumbnail if present */}
                    {post.mediaUrl && (
                      <div className="w-full h-28 rounded-lg overflow-hidden mb-2.5 bg-black/40 border border-[#1c355c]">
                        <img src={post.mediaUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Metrics Bar */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Heart size={12} className="text-red-400" />
                        <span>{post.likesCount}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} className="text-blue-400" />
                        <span>{parsedRepliesCount} bình luận thật</span>
                      </span>
                      <a 
                        href={post.permalink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="ml-auto text-slate-500 hover:text-slate-300"
                        title="Xem bài gốc trên Threads"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    {/* Sample Real Comments Snippet */}
                    {sampleReplies.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#182d50] space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Bình luận thật trích xuất ({sampleReplies.length}):
                        </span>
                        {sampleReplies.slice(0, 2).map((r, i) => (
                          <div key={i} className="text-[11px] bg-[#091322] p-1.5 rounded-lg border border-[#182d50] text-slate-300 truncate">
                            <span className="font-semibold text-blue-300 mr-1.5">@{r.username}:</span>
                            <span>{r.content || r.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#182d50]">
                    <button
                      onClick={() => handleConvertToProject(post.id)}
                      className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      title="Chuyển bài viết này thành một Project mới trong Studio"
                    >
                      <Film size={12} />
                      <span>Tạo video ngay</span>
                    </button>

                    <button
                      onClick={() => handleQueueToBatch(post.id)}
                      className="px-2.5 py-1.5 bg-[#172c4e] hover:bg-[#203c6b] text-cyan-300 rounded-lg text-xs font-semibold border border-[#23457a] transition flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Đưa bài viết này vào hàng đợi Automation Engine để render hàng loạt"
                    >
                      <Zap size={12} />
                      <span>Xếp hàng</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b162a] border border-[#234579] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#1b3660] flex items-center justify-between bg-[#0e1d38]">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">Kết nối tài khoản Meta Threads API</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Threads User Access Token (Meta Graph API)
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="THQW..."
                  className="w-full bg-[#13233f] border border-[#223f6d] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Lấy từ Meta for Developers (App type: Threads, Quyền: threads_basic, threads_read_replies).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username tài khoản Threads (tùy chọn nếu đã có Token)
                </label>
                <div className="flex items-center bg-[#13233f] border border-[#223f6d] rounded-xl px-3 py-2">
                  <span className="text-slate-400 text-xs mr-1 font-mono">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="my_channel_threads"
                    className="w-full bg-transparent text-xs text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nếu không có token nhà phát triển, bạn có thể nhập Username công khai để hệ thống quét dữ liệu thật trực tiếp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tên hiển thị gợi nhớ (Nickname)
                </label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Kênh Tin Tức Threads Số 1"
                  className="w-full bg-[#13233f] border border-[#223f6d] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-[#182d50] flex items-center justify-between">
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSyncInput}
                      onChange={(e) => setAutoSyncInput(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#13233f] border-[#223f6d] text-emerald-500 focus:ring-0"
                    />
                    <span>Tự động đồng bộ bài viết ngầm</span>
                  </label>
                  <p className="text-[10px] text-slate-400 pl-6">Hệ thống sẽ tự động quét bài mới theo định kỳ</p>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span>Mỗi:</span>
                  <select
                    value={syncIntervalInput}
                    onChange={(e) => setSyncIntervalInput(parseInt(e.target.value))}
                    className="bg-[#13233f] text-slate-200 border border-[#223f6d] rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value={15}>15 phút</option>
                    <option value={30}>30 phút</option>
                    <option value={60}>1 giờ</option>
                    <option value={360}>6 giờ</option>
                    <option value={1440}>24 giờ</option>
                  </select>
                </div>
              </div>

              {/* Developer helper tip */}
              <div className="bg-[#091322] border border-[#1b345b] rounded-xl p-3 flex items-start gap-2 text-[11px] text-slate-400">
                <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Mẹo MMO:</strong> Bạn có thể kết nối nhiều tài khoản Threads khác nhau cùng lúc để thu thập nội dung đa dạng chủ đề (kinh doanh, tâm sự, hài hước, tin tức công nghệ).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#172b4b] hover:bg-[#1f3a66] text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/25 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isAdding ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>{isAdding ? 'Đang xác thực...' : 'Lưu tài khoản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
