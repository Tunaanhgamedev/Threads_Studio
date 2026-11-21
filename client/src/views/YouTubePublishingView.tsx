import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  Plus, 
  Film, 
  Tag, 
  Eye, 
  Lock, 
  Globe, 
  Layers, 
  Calendar, 
  Check, 
  Play,
  BarChart3
} from 'lucide-react';

const Youtube: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);
import { api } from '../services/api';
import { 
  YouTubeAccount, 
  YouTubePublishItem, 
  AvailableRenderedVideo, 
  YouTubePrivacyStatus 
} from '../types';

interface YouTubePublishingViewProps {
  onOpenVideoModal?: (url: string, title: string) => void;
  onOpenStudio?: () => void;
  onOpenAnalytics?: () => void;
}

export const YouTubePublishingView: React.FC<YouTubePublishingViewProps> = ({
  onOpenVideoModal,
  onOpenStudio,
  onOpenAnalytics
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'publish' | 'history' | 'channels'>('publish');
  const [accounts, setAccounts] = useState<YouTubeAccount[]>([]);
  const [availableVideos, setAvailableVideos] = useState<AvailableRenderedVideo[]>([]);
  const [publishes, setPublishes] = useState<YouTubePublishItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  // Form states for creating/editing a publish item
  const [selectedVideo, setSelectedVideo] = useState<AvailableRenderedVideo | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('shorts, threads, story, reddit, tiktok, viral');
  const [categoryId, setCategoryId] = useState('22');
  const [privacyStatus, setPrivacyStatus] = useState<YouTubePrivacyStatus>('public');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [thumbnailPath, setThumbnailPath] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  // OAuth info
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 40)]);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Load accounts
      const accs = await api.getYouTubeAccounts().catch(() => []);
      setAccounts(accs);
      if (accs.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accs[0].id);
      }

      // 2. Load available rendered videos
      const vids = await api.getAvailableVideosForYouTube().catch(() => []);
      setAvailableVideos(vids);
      if (vids.length > 0 && !selectedVideo) {
        handleSelectVideo(vids[0]);
      }

      // 3. Load publishes history
      const pubs = await api.getYouTubePublishes().catch(() => []);
      setPublishes(pubs);

      // 4. Check OAuth URL status
      const auth = await api.getYouTubeAuthUrl().catch(() => ({ url: '', clientIdSet: false }));
      setOauthConfigured(auth.clientIdSet);
      setOauthUrl(auth.url);
    } catch (err: any) {
      console.warn('Failed to load YouTube view data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for OAuth success message from popup window
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'YOUTUBE_CONNECTED') {
        addLog('Đã kết nối thành công kênh YouTube mới!');
        loadData();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSelectVideo = async (video: AvailableRenderedVideo) => {
    setSelectedVideo(video);
    setThumbnailUrl(video.thumbnailUrl || '');

    // Auto-generate metadata from video/project
    try {
      const meta = await api.generateYouTubeMetadata(video.projectId, video.projectTitle);
      setVideoTitle(meta.title);
      setVideoDescription(meta.description);
      setTagsInput(meta.tags.join(', '));
      setCategoryId(meta.categoryId);
      setPrivacyStatus(meta.privacyStatus);
      addLog(`Đã tạo tự động tiêu đề và mô tả SEO cho: "${video.projectTitle}"`);
    } catch {
      setVideoTitle(`${video.projectTitle.slice(0, 80)} #Shorts`);
    }
  };

  const handleConnectOAuth = () => {
    if (!oauthConfigured || !oauthUrl) {
      const proceed = confirm(
        'Chưa phát hiện YOUTUBE_CLIENT_ID trong server/.env.\n\nBạn có muốn tạo nhanh một "Kênh Demo Thử Nghiệm" để test tính năng xuất bản và giao diện trước không?'
      );
      if (proceed) {
        handleCreateDemoChannel();
      }
      return;
    }

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(oauthUrl, 'ConnectYouTube', `width=${width},height=${height},top=${top},left=${left}`);
  };

  const handleCreateDemoChannel = async () => {
    try {
      const title = prompt('Nhập tên Kênh YouTube của bạn:', 'Threads Studio Creator') || 'Threads Studio Creator';
      const acc = await api.addManualYouTubeAccount({
        channelTitle: title,
        channelHandle: `@${title.toLowerCase().replace(/[^a-z0-9]/g, '') || 'studio'}`,
        avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'
      });
      setAccounts(prev => [acc, ...prev]);
      setSelectedAccountId(acc.id);
      addLog(`Đã kích hoạt kênh YouTube: ${acc.channelTitle}`);
      alert(`Đã thêm thành công kênh "${acc.channelTitle}"! Bạn có thể bắt đầu đăng video ngay.`);
    } catch (err: any) {
      alert('Không thể tạo kênh: ' + err.message);
    }
  };

  const handleDisconnectAccount = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn hủy kết nối kênh "${name}" không?`)) return;
    try {
      await api.deleteYouTubeAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
      if (selectedAccountId === id) {
        setSelectedAccountId(accounts[0]?.id || '');
      }
      addLog(`Đã hủy kết nối kênh: ${name}`);
    } catch (err: any) {
      alert('Lỗi khi hủy kết nối: ' + err.message);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedVideo) {
      alert('Vui lòng chọn một video đã xuất để đăng.');
      return;
    }
    if (!videoTitle.trim()) {
      alert('Vui lòng nhập tiêu đề video.');
      return;
    }

    const tags = tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    try {
      const item = await api.createYouTubePublish({
        accountId: selectedAccountId || undefined,
        projectId: selectedVideo.projectId,
        projectTitle: selectedVideo.projectTitle,
        videoPath: selectedVideo.videoPath,
        videoUrl: selectedVideo.videoUrl,
        title: videoTitle.trim(),
        description: videoDescription,
        tags,
        categoryId,
        privacyStatus: isScheduled ? 'private' : privacyStatus,
        publishAt: isScheduled && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : undefined,
        thumbnailPath: thumbnailPath || undefined,
        thumbnailUrl: thumbnailUrl || undefined
      });

      setPublishes(prev => [item, ...prev]);
      addLog(`Đã lưu bản nháp xuất bản cho video: "${videoTitle}"`);
      alert('Đã lưu bản nháp xuất bản thành công! Bạn có thể xem trong tab "Lịch sử & Tiến trình".');
    } catch (err: any) {
      alert('Lỗi lưu bản nháp: ' + err.message);
    }
  };

  const handleUploadNow = async (draftId?: string) => {
    let targetPublishId = draftId;

    if (!targetPublishId) {
      if (!selectedVideo) {
        alert('Vui lòng chọn một video đã xuất để đăng.');
        return;
      }
      if (!videoTitle.trim()) {
        alert('Vui lòng nhập tiêu đề video.');
        return;
      }

      const tags = tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
      try {
        const item = await api.createYouTubePublish({
          accountId: selectedAccountId || undefined,
          projectId: selectedVideo.projectId,
          projectTitle: selectedVideo.projectTitle,
          videoPath: selectedVideo.videoPath,
          videoUrl: selectedVideo.videoUrl,
          title: videoTitle.trim(),
          description: videoDescription,
          tags,
          categoryId,
          privacyStatus: isScheduled ? 'private' : privacyStatus,
          publishAt: isScheduled && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : undefined,
          thumbnailPath: thumbnailPath || undefined,
          thumbnailUrl: thumbnailUrl || undefined
        });
        targetPublishId = item.id;
        setPublishes(prev => [item, ...prev]);
      } catch (err: any) {
        alert('Lỗi khởi tạo tác vụ: ' + err.message);
        return;
      }
    }

    setIsUploading(true);
    setActiveUploadId(targetPublishId);
    addLog(`Đang tiến hành truyền tải video lên YouTube...`);

    try {
      const res = await api.uploadToYouTube(targetPublishId);
      if (res.success) {
        addLog(`🎉 Đăng video thành công lên YouTube! ID: ${res.videoId}`);
        // Refresh publishes list
        const pubs = await api.getYouTubePublishes();
        setPublishes(pubs);
        setActiveSubTab('history');
      } else {
        addLog(`❌ Đăng video thất bại: ${res.error}`);
        alert(`Đăng thất bại: ${res.error}`);
      }
    } catch (err: any) {
      addLog(`❌ Lỗi upload: ${err.message}`);
      alert(`Lỗi upload: ${err.message}`);
    } finally {
      setIsUploading(false);
      setActiveUploadId(null);
    }
  };

  const handleDeletePublish = async (id: string, title: string) => {
    if (!confirm(`Xóa tác vụ "${title}" khỏi lịch sử?`)) return;
    try {
      await api.deleteYouTubePublish(id);
      setPublishes(prev => prev.filter(p => p.id !== id));
      addLog(`Đã xóa mục xuất bản: ${title}`);
    } catch (err: any) {
      alert('Lỗi xóa: ' + err.message);
    }
  };

  const addTagPill = (tag: string) => {
    const clean = tag.replace(/^#/, '').trim();
    const current = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (!current.includes(clean)) {
      setTagsInput([...current, clean].join(', '));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070d19] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner Header */}
      <div className="bg-[#0b1426] border-b border-[#182a48] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
            <Youtube size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">YouTube Publishing & Social Media</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Phase 10
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Xuất bản video MP4 trực tiếp lên YouTube Data API v3, quản lý lịch đăng, tối ưu SEO và theo dõi trạng thái
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-[#0f1d35] px-3.5 py-1.5 rounded-xl border border-[#1e365d] text-xs">
            <div className="text-center">
              <span className="block text-[10px] text-slate-400">Kênh kết nối</span>
              <span className="font-bold text-white">{accounts.length}</span>
            </div>
            <div className="w-[1px] h-6 bg-slate-700/60" />
            <div className="text-center">
              <span className="block text-[10px] text-slate-400">Đã xuất bản</span>
              <span className="font-bold text-emerald-400">{publishes.filter(p => p.status === 'published').length}</span>
            </div>
            <div className="w-[1px] h-6 bg-slate-700/60" />
            <div className="text-center">
              <span className="block text-[10px] text-slate-400">Bản nháp / Lịch</span>
              <span className="font-bold text-cyan-400">{publishes.filter(p => p.status === 'draft' || p.publishAt).length}</span>
            </div>
          </div>

          <button
            onClick={loadData}
            title="Làm mới dữ liệu"
            className="p-2 bg-[#12223e] hover:bg-[#1a3159] text-slate-300 rounded-xl border border-[#203a66] transition cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Sub navigation bar */}
      <div className="bg-[#091122] border-b border-[#152540] px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('publish')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'publish'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#12213d]'
            }`}
          >
            <Upload size={14} />
            <span>Soạn thảo & Đăng video</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'history'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#12213d]'
            }`}
          >
            <Clock size={14} />
            <span>Lịch sử & Tiến trình ({publishes.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('channels')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'channels'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#12213d]'
            }`}
          >
            <Layers size={14} />
            <span>Quản lý Kênh YouTube ({accounts.length})</span>
          </button>

          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-800/40 transition ml-2 cursor-pointer"
            >
              <BarChart3 size={14} />
              <span>Xem Analytics</span>
            </button>
          )}
        </div>

        {/* Selected target channel pill */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px]">Kênh đăng:</span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-[#12223e] border border-[#203a66] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.channelTitle} ({acc.channelHandle || 'YouTube'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ================= TAB 1: SOẠN THẢO VÀ ĐĂNG VIDEO ================= */}
        {activeSubTab === 'publish' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Select Video & Preview */}
            <div className="lg:col-span-5 space-y-4">
              {/* Select rendered video card */}
              <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <Film size={15} className="text-rose-400" />
                    <span>Chọn Video MP4 đã xuất</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{availableVideos.length} video sẵn sàng</span>
                </div>

                {availableVideos.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[#233f6b] rounded-xl space-y-2">
                    <p className="text-xs text-slate-400">Chưa có video MP4 nào được render hoàn chỉnh.</p>
                    {onOpenStudio && (
                      <button
                        onClick={onOpenStudio}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Đến Threads Studio tạo video ngay
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {availableVideos.map((vid) => {
                      const isSelected = selectedVideo?.videoPath === vid.videoPath;
                      return (
                        <div
                          key={vid.videoPath}
                          onClick={() => handleSelectVideo(vid)}
                          className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-[#1b2d4f] border-rose-500 shadow-md ring-1 ring-rose-500/40' 
                              : 'bg-[#101e36] border-[#1d355b] hover:bg-[#152747]'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-12 h-16 bg-slate-900 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-700/60">
                              {vid.thumbnailUrl ? (
                                <img src={vid.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                              ) : (
                                <Play size={16} className="text-slate-400" />
                              )}
                              <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] px-1 rounded text-white font-mono">9:16</span>
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="text-xs font-bold text-white truncate">{vid.projectTitle}</h4>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {vid.authorUsername ? `@${vid.authorUsername} · ` : ''}
                                {new Date(vid.createdAt).toLocaleDateString('vi-VN')}
                              </p>
                              {vid.postContent && (
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">{vid.postContent}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onOpenVideoModal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenVideoModal(vid.videoUrl, vid.projectTitle);
                                }}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                title="Xem trước video"
                              >
                                <Eye size={13} />
                              </button>
                            )}
                            {isSelected && <Check size={16} className="text-rose-400 font-bold" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Live Preview Box */}
              {selectedVideo && (
                <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-4 shadow-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>Mô phỏng hiển thị trên YouTube</span>
                    <span className="text-[10px] px-2 py-0.5 bg-red-600/20 text-red-300 rounded-md">Shorts Format</span>
                  </div>

                  {/* YouTube Card Mockup */}
                  <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 space-y-2.5">
                    <div className="aspect-[9/16] max-h-72 w-auto mx-auto bg-black rounded-lg overflow-hidden flex items-center justify-center relative border border-slate-800 shadow-inner">
                      <video
                        src={selectedVideo.videoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white line-clamp-2">
                        {videoTitle || 'Tiêu đề video sẽ hiển thị ở đây...'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>{accounts.find(a => a.id === selectedAccountId)?.channelTitle || 'Kênh của bạn'}</span>
                        <span>•</span>
                        <span>{isScheduled ? '⏰ Đã lên lịch' : privacyStatus === 'public' ? '🌐 Công khai' : '🔒 Riêng tư'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 7 Cols: Video Metadata & Publishing Configuration */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#1b3154] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Cấu hình Xuất bản YouTube</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Tiêu đề, mô tả chuẩn SEO, tags và chế độ hiển thị</p>
                  </div>
                  <button
                    onClick={() => selectedVideo && handleSelectVideo(selectedVideo)}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-2.5 py-1 bg-cyan-950/40 border border-cyan-800/50 rounded-lg transition"
                  >
                    <Sparkles size={13} />
                    <span>Tự động tối ưu SEO</span>
                  </button>
                </div>

                {/* Video Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Tiêu đề Video (Tối đa 100 ký tự)</label>
                    <span className={`text-[10px] font-mono ${videoTitle.length > 100 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {videoTitle.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="VD: Bí mật giấu kín suốt 5 năm của bạn thân #Shorts"
                    className="w-full bg-[#12213d] border border-[#213b63] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => !videoTitle.includes('#Shorts') && setVideoTitle(prev => `${prev} #Shorts`.trim())}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#172b4f] hover:bg-[#203a6b] text-slate-300 transition"
                    >
                      + Thêm #Shorts
                    </button>
                    <button
                      type="button"
                      onClick={() => !videoTitle.includes('#Threads') && setVideoTitle(prev => `${prev} #Threads`.trim())}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#172b4f] hover:bg-[#203a6b] text-slate-300 transition"
                    >
                      + Thêm #Threads
                    </button>
                  </div>
                </div>

                {/* Video Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mô tả Video & Nguồn nội dung</label>
                  <textarea
                    rows={6}
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Nhập mô tả video, ghi chú nguồn câu chuyện Threads, credit tác giả..."
                    className="w-full bg-[#12213d] border border-[#213b63] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 leading-relaxed font-normal"
                  />
                </div>

                {/* Tags and Quick Pills */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Tag size={13} className="text-slate-400" />
                      <span>Thẻ từ khóa (Tags, phân cách bằng dấu phẩy)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="shorts, threads, story, viral..."
                    className="w-full bg-[#12213d] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                  {/* Suggested tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                    <span className="text-[10px] text-slate-400">Gợi ý nhanh:</span>
                    {['#Shorts', '#Threads', '#Story', '#Reddit', '#TamTrang', '#Podcast', '#Viral', '#CuocSong'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTagPill(tag)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[#16294a] hover:bg-rose-900/40 hover:text-rose-300 text-slate-300 border border-[#223d6a] transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category & Privacy Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Danh mục YouTube</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-[#12213d] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="22">Mọi người & Blog (People & Blogs)</option>
                      <option value="24">Giải trí (Entertainment)</option>
                      <option value="23">Hài kịch (Comedy)</option>
                      <option value="20">Trò chơi (Gaming)</option>
                      <option value="27">Giáo dục (Education)</option>
                      <option value="25">Tin tức & Chính trị (News)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Quyền riêng tư</label>
                    <div className="grid grid-cols-3 gap-1 bg-[#12213d] p-1 border border-[#213b63] rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => { setPrivacyStatus('public'); setIsScheduled(false); }}
                        className={`py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
                          privacyStatus === 'public' && !isScheduled ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Globe size={12} />
                        <span>Công khai</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPrivacyStatus('unlisted'); setIsScheduled(false); }}
                        className={`py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
                          privacyStatus === 'unlisted' && !isScheduled ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Eye size={12} />
                        <span>Không CK</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrivacyStatus('private')}
                        className={`py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
                          privacyStatus === 'private' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Lock size={12} />
                        <span>Riêng tư</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scheduling Section */}
                <div className="bg-[#101c33] border border-[#1f365c] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isScheduled}
                        onChange={(e) => {
                          setIsScheduled(e.target.checked);
                          if (e.target.checked) setPrivacyStatus('private');
                        }}
                        className="w-4 h-4 rounded accent-rose-600"
                      />
                      <span>⏰ Lên lịch xuất bản tự động (PublishAt)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">YouTube yêu cầu video ở chế độ Private khi đặt lịch</span>
                  </div>

                  {isScheduled && (
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={(e) => setScheduledDateTime(e.target.value)}
                        className="bg-[#152747] border border-[#23406f] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400">Thời gian công khai video trong tương lai</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-[#1b3154]">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isUploading}
                    className="px-4 py-2.5 bg-[#172a4c] hover:bg-[#203a68] text-slate-200 font-semibold rounded-xl text-xs transition border border-[#233f6b]"
                  >
                    💾 Lưu bản nháp
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUploadNow()}
                    disabled={isUploading}
                    className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-600/30 flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Đang tải lên YouTube...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>{isScheduled ? 'Lên lịch xuất bản ngay' : 'Đăng lên YouTube ngay'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: LỊCH SỬ VÀ TIẾN TRÌNH ================= */}
        {activeSubTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Lịch sử xuất bản & Hàng đợi tải lên</h3>
                <p className="text-xs text-slate-400">Theo dõi tiến độ, kiểm tra trạng thái xử lý YouTube và xem video</p>
              </div>
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#12223e] hover:bg-[#1a3159] px-3 py-1.5 rounded-xl border border-[#203a66] transition"
              >
                <RefreshCw size={12} />
                <span>Cập nhật danh sách</span>
              </button>
            </div>

            {publishes.length === 0 ? (
              <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-12 text-center text-slate-400 space-y-3">
                <Youtube size={36} className="mx-auto text-slate-600" />
                <h4 className="text-sm font-bold text-white">Chưa có tác vụ xuất bản nào</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Hãy quay lại tab "Soạn thảo & Đăng video" để chọn một video MP4 và xuất bản lên YouTube.
                </p>
                <button
                  onClick={() => setActiveSubTab('publish')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  Tạo bản đăng mới
                </button>
              </div>
            ) : (
              <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0a1324] text-slate-400 text-[11px] uppercase tracking-wider border-b border-[#1b3154]">
                    <tr>
                      <th className="py-3 px-4">Video / Tiêu đề</th>
                      <th className="py-3 px-4">Kênh</th>
                      <th className="py-3 px-4">Chế độ</th>
                      <th className="py-3 px-4">Tiến trình & Trạng thái</th>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#172a49]">
                    {publishes.map((pub) => {
                      const isPubActive = isUploading && activeUploadId === pub.id;
                      return (
                        <tr key={pub.id} className="hover:bg-[#111f38] transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-14 bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-700/80 flex items-center justify-center">
                                {pub.thumbnailUrl ? (
                                  <img src={pub.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                ) : (
                                  <Film size={14} className="text-slate-500" />
                                )}
                              </div>
                              <div className="max-w-xs">
                                <h5 className="font-bold text-white truncate text-xs">{pub.title}</h5>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{pub.projectTitle || 'Threads Video'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200">
                              {pub.channelTitle || 'Mặc định'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {pub.publishAt ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                <Calendar size={10} />
                                <span>Lên lịch</span>
                              </span>
                            ) : pub.privacyStatus === 'public' ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                                Công khai
                              </span>
                            ) : pub.privacyStatus === 'unlisted' ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                                Không công khai
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-600/30 text-slate-300 border border-slate-600/40 text-[10px] font-semibold">
                                Riêng tư
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1.5 w-44">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold">
                                  {pub.status === 'published' && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Đã xuất bản</span>}
                                  {pub.status === 'uploading' && <span className="text-rose-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Đang tải lên</span>}
                                  {pub.status === 'draft' && <span className="text-slate-400">Bản nháp</span>}
                                  {pub.status === 'failed' && <span className="text-red-400 flex items-center gap-1"><AlertCircle size={12} /> Thất bại</span>}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">{pub.uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-[#162744] rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    pub.status === 'published' ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${pub.uploadProgress}%` }}
                                />
                              </div>
                              {pub.errorMessage && (
                                <p className="text-[10px] text-red-400 truncate" title={pub.errorMessage}>
                                  {pub.errorMessage}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[11px] text-slate-400">
                            {pub.publishAt ? (
                              <div title="Thời gian xuất bản">
                                <div>{new Date(pub.publishAt).toLocaleDateString('vi-VN')}</div>
                                <div className="text-[10px] text-purple-400">{new Date(pub.publishAt).toLocaleTimeString('vi-VN')}</div>
                              </div>
                            ) : (
                              <div>{new Date(pub.createdAt).toLocaleDateString('vi-VN')}</div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {pub.youtubeVideoId && (
                                <a
                                  href={`https://youtu.be/${pub.youtubeVideoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-rose-900/30 hover:bg-rose-800/40 text-rose-300 rounded-lg transition"
                                  title="Mở xem trên YouTube"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              )}

                              {pub.status === 'draft' && (
                                <button
                                  type="button"
                                  onClick={() => handleUploadNow(pub.id)}
                                  disabled={isPubActive}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold transition"
                                >
                                  Đăng ngay
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeletePublish(pub.id, pub.title)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition"
                                title="Xóa tác vụ"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: QUẢN LÝ KÊNH YOUTUBE ================= */}
        {activeSubTab === 'channels' && (
          <div className="space-y-6 max-w-4xl">
            {/* Header / Connect Banner */}
            <div className="bg-gradient-to-r from-[#172545] to-[#1a1c36] border border-[#213963] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Youtube className="text-rose-500" size={20} />
                    <span>Kết nối Kênh YouTube thông qua Google OAuth 2.0</span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                    Đăng nhập tài khoản Google và cấp quyền truy cập YouTube Data API v3 để ứng dụng có thể tải video, cập nhật thumbnail và quản lý lịch xuất bản trực tiếp.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleConnectOAuth}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    <Youtube size={15} />
                    <span>Kết nối YouTube</span>
                  </button>

                  <button
                    onClick={handleCreateDemoChannel}
                    className="px-3.5 py-2.5 bg-[#1b2f52] hover:bg-[#254273] text-slate-200 font-semibold rounded-xl text-xs transition border border-[#2a497d]"
                  >
                    + Kênh Demo
                  </button>
                </div>
              </div>

              {/* OAuth Status Tip */}
              <div className="bg-[#0d1627]/80 border border-[#1b2b48] rounded-xl p-3.5 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-300">
                  <span className={oauthConfigured ? 'text-emerald-400' : 'text-amber-400'}>
                    {oauthConfigured ? '✓ Đã cấu hình Google Client ID' : '⚠️ Chưa phát hiện Google Client ID'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Để xuất bản lên tài khoản YouTube thật, hãy vào <strong>Google Cloud Console</strong> $\rightarrow$ bật <strong>YouTube Data API v3</strong> $\rightarrow$ tạo OAuth Client ID loại Web và điền Redirect URI: <code className="text-rose-300 bg-rose-950/40 px-1 py-0.5 rounded">http://localhost:4000/api/youtube/oauth/callback</code> (hoặc cổng 3210). Điền thông tin vào file <code className="text-slate-300">server/.env</code>.
                </p>
              </div>
            </div>

            {/* List of Connected Accounts */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Danh sách Kênh đã kết nối ({accounts.length})
              </h4>

              {accounts.length === 0 ? (
                <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-8 text-center text-slate-400 space-y-2">
                  <p className="text-xs">Chưa có kênh YouTube nào được kết nối.</p>
                  <p className="text-[11px] text-slate-500">
                    Bấm "Kết nối YouTube" ở trên hoặc "+ Kênh Demo" để bắt đầu trải nghiệm.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accounts.map(acc => (
                    <div
                      key={acc.id}
                      className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 overflow-hidden">
                        <img
                          src={acc.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                          alt={acc.channelTitle}
                          className="w-12 h-12 rounded-full border border-slate-700 object-cover shrink-0"
                        />
                        <div className="overflow-hidden">
                          <h5 className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                            <span>{acc.channelTitle}</span>
                            <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] font-bold">✓</span>
                          </h5>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                            {acc.channelHandle || `@channel_${acc.channelId.slice(0, 8)}`}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                            <span>{(acc.subscriberCount || 0).toLocaleString()} người đăng ký</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">Sẵn sàng xuất bản</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDisconnectAccount(acc.id, acc.channelTitle)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition"
                        title="Hủy kết nối kênh"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Status / Activity Log Footer */}
      {logs.length > 0 && (
        <div className="bg-[#08101d] border-t border-[#14233c] px-6 py-2 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-slate-300 font-mono">{logs[0]}</span>
          </div>
          <span className="text-[10px] text-slate-500 shrink-0">Threads Content Studio v0.10.0</span>
        </div>
      )}
    </div>
  );
};
