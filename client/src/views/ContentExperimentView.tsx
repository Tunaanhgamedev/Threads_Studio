import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Plus,
  Play,
  Square,
  RefreshCw,
  Trophy,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Trash2,
  HelpCircle,
  BarChart3,
  Image,
  Type,
  Layers,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import {
  ContentExperiment,
  ExperimentVariant,
  CreateExperimentDto,
  ExperimentType,
  ExperimentMode,
  YouTubePublishItem
} from '../types';

interface ContentExperimentViewProps {
  onOpenVideoModal?: (url: string, title: string) => void;
  onOpenStudio?: () => void;
  onOpenPublishing?: () => void;
}

export const ContentExperimentView: React.FC<ContentExperimentViewProps> = ({
  onOpenVideoModal,
  onOpenStudio,
  onOpenPublishing
}) => {
  const [experiments, setExperiments] = useState<ContentExperiment[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Published YouTube videos for quick picking
  const [publishedVideos, setPublishedVideos] = useState<YouTubePublishItem[]>([]);

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createVideoId, setCreateVideoId] = useState('');
  const [createVideoTitle, setCreateVideoTitle] = useState('');
  const [createVideoThumbnail, setCreateVideoThumbnail] = useState('');
  const [createExpType, setCreateExpType] = useState<ExperimentType>('title');
  const [createTestMode, setCreateTestMode] = useState<ExperimentMode>('sequential');
  const [createHypothesis, setCreateHypothesis] = useState('');
  const [hasVariantC, setHasVariantC] = useState(false);

  // Variant form inputs
  const [varATitle, setVarATitle] = useState('');
  const [varAThumb, setVarAThumb] = useState('');
  const [varBTitle, setVarBTitle] = useState('');
  const [varBThumb, setVarBThumb] = useState('');
  const [varCTitle, setVarCTitle] = useState('');
  const [varCThumb, setVarCThumb] = useState('');

  // Native test input modal
  const [nativeShareA, setNativeShareA] = useState<number>(30);
  const [nativeShareB, setNativeShareB] = useState<number>(70);
  const [nativeShareC, setNativeShareC] = useState<number>(0);
  const [nativeCtrA, setNativeCtrA] = useState<number>(5.2);
  const [nativeCtrB, setNativeCtrB] = useState<number>(8.6);
  const [nativeCtrC, setNativeCtrC] = useState<number>(0);

  // Declare winner modal
  const [winnerModalExp, setWinnerModalExp] = useState<ContentExperiment | null>(null);
  const [selectedWinnerVariantId, setSelectedWinnerVariantId] = useState<string>('');
  const [winnerConclusion, setWinnerConclusion] = useState('');

  // Load experiments & published videos
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [exps, publishes] = await Promise.all([
        api.getExperiments({ status: statusFilter !== 'all' ? statusFilter : undefined }),
        api.getYouTubePublishes().catch(() => [])
      ]);
      setExperiments(exps);
      setPublishedVideos(publishes.filter(p => p.youtubeVideoId));
      if (!selectedExpId && exps.length > 0) {
        setSelectedExpId(exps[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load experiments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const activeExperiment = experiments.find(e => e.id === selectedExpId) || experiments[0] || null;

  // Auto-fill video details when a published video is selected
  const handleSelectPublishedVideo = (video: YouTubePublishItem) => {
    setCreateVideoId(video.youtubeVideoId || '');
    setCreateVideoTitle(video.title);
    setCreateVideoThumbnail(video.thumbnailUrl || '');
    setVarATitle(video.title);
    setVarAThumb(video.thumbnailUrl || '');
  };

  // Submit create experiment
  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !createVideoId.trim() || !createVideoTitle.trim()) {
      alert('Vui lòng nhập đầy đủ tên thử nghiệm, Video ID và tên video.');
      return;
    }

    const variants: Array<{ label: 'A' | 'B' | 'C'; name: string; title?: string; thumbnailUrl?: string }> = [
      {
        label: 'A',
        name: 'Biến thể A (Gốc / Control)',
        title: varATitle.trim() || createVideoTitle,
        thumbnailUrl: varAThumb.trim() || createVideoThumbnail
      },
      {
        label: 'B',
        name: 'Biến thể B (Thách thức / Challenger)',
        title: varBTitle.trim() || `${createVideoTitle} (B)`,
        thumbnailUrl: varBThumb.trim() || createVideoThumbnail
      }
    ];

    if (hasVariantC) {
      variants.push({
        label: 'C',
        name: 'Biến thể C (Thử nghiệm 3)',
        title: varCTitle.trim() || `${createVideoTitle} (C)`,
        thumbnailUrl: varCThumb.trim() || createVideoThumbnail
      });
    }

    const dto: CreateExperimentDto = {
      title: createTitle,
      videoId: createVideoId,
      videoTitle: createVideoTitle,
      videoThumbnailUrl: createVideoThumbnail || undefined,
      experimentType: createExpType,
      testMode: createTestMode,
      hypothesis: createHypothesis.trim() || undefined,
      variants
    };

    try {
      setActionLoading('create');
      const created = await api.createExperiment(dto);
      setExperiments(prev => [created, ...prev]);
      setSelectedExpId(created.id);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert('Không thể tạo thử nghiệm: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setCreateTitle('');
    setCreateVideoId('');
    setCreateVideoTitle('');
    setCreateVideoThumbnail('');
    setCreateHypothesis('');
    setVarATitle('');
    setVarAThumb('');
    setVarBTitle('');
    setVarBThumb('');
    setVarCTitle('');
    setVarCThumb('');
    setHasVariantC(false);
  };

  // Sequential variant start
  const handleStartVariant = async (expId: string, variantId: string) => {
    try {
      setActionLoading(`start_${variantId}`);
      const updated = await api.startSequentialVariant(expId, variantId);
      setExperiments(prev => prev.map(e => e.id === expId ? updated : e));
    } catch (err: any) {
      alert('Lỗi bắt đầu giai đoạn: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Sequential variant end & sync
  const handleEndVariant = async (expId: string, variantId: string) => {
    try {
      setActionLoading(`end_${variantId}`);
      const updated = await api.endSequentialVariant(expId, variantId);
      setExperiments(prev => prev.map(e => e.id === expId ? updated : e));
    } catch (err: any) {
      alert('Lỗi kết thúc giai đoạn: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Re-sync analytics for variant
  const handleSyncVariant = async (expId: string, variantId: string) => {
    try {
      setActionLoading(`sync_${variantId}`);
      const updated = await api.syncVariantAnalytics(expId, variantId);
      setExperiments(prev => prev.map(e => e.id === expId ? updated : e));
    } catch (err: any) {
      alert('Lỗi đồng bộ: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Save YouTube Native Test results
  const handleSaveNativeResults = async (exp: ContentExperiment) => {
    try {
      setActionLoading('native_save');
      const results: Array<{ variantId: string; watchTimeShare: number; impressionsCtr?: number }> = [
        { variantId: exp.variants[0]?.id, watchTimeShare: nativeShareA, impressionsCtr: nativeCtrA },
        { variantId: exp.variants[1]?.id, watchTimeShare: nativeShareB, impressionsCtr: nativeCtrB }
      ];
      if (exp.variants[2]) {
        results.push({ variantId: exp.variants[2]?.id, watchTimeShare: nativeShareC, impressionsCtr: nativeCtrC });
      }

      const updated = await api.recordNativeResult(exp.id, results);
      setExperiments(prev => prev.map(e => e.id === exp.id ? updated : e));
    } catch (err: any) {
      alert('Lỗi lưu kết quả Native Test: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Declare winner
  const handleConfirmWinner = async () => {
    if (!winnerModalExp || !selectedWinnerVariantId) return;
    try {
      setActionLoading('declare_winner');
      const updated = await api.declareWinner(winnerModalExp.id, selectedWinnerVariantId, winnerConclusion);
      setExperiments(prev => prev.map(e => e.id === winnerModalExp.id ? updated : e));
      setWinnerModalExp(null);
    } catch (err: any) {
      alert('Lỗi xác nhận chiến thắng: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete experiment
  const handleDeleteExperiment = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cuộc thử nghiệm này không?')) return;
    try {
      await api.deleteExperiment(id);
      setExperiments(prev => prev.filter(e => e.id !== id));
      if (selectedExpId === id) {
        setSelectedExpId(experiments.find(e => e.id !== id)?.id || null);
      }
    } catch (err: any) {
      alert('Lỗi xóa: ' + err.message);
    }
  };

  // Filter experiments
  const filteredExperiments = experiments.filter(e => {
    if (modeFilter !== 'all' && e.testMode !== modeFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#070d19] text-slate-100 font-['Be_Vietnam_Pro','Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner Header */}
      <header className="h-16 border-b border-[#1b3154] bg-[#0c1628] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <FlaskConical size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">Thử nghiệm nội dung & A/B Testing</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                Phase 13
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Thử nghiệm tuần tự (Sequential Comparison) & YouTube Studio Native Test (Test & Compare)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 cursor-pointer"
        >
          <Plus size={15} />
          <span>+ Tạo thử nghiệm mới</span>
        </button>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Experiment List & Filters */}
        <div className="w-80 border-r border-[#1b3154] bg-[#091222] flex flex-col shrink-0">
          {/* Filter Bar */}
          <div className="p-3 border-b border-[#172744] space-y-2">
            <div className="flex gap-1 bg-[#101c33] p-1 rounded-xl border border-[#1d355c]">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                  statusFilter === 'all' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tất cả ({experiments.length})
              </button>
              <button
                onClick={() => setStatusFilter('running')}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                  statusFilter === 'running' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Đang chạy ({experiments.filter(e => e.status === 'running').length})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                  statusFilter === 'completed' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Xong ({experiments.filter(e => e.status === 'completed').length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="w-full bg-[#101c33] border border-[#1d355c] rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">Mọi chế độ thử nghiệm</option>
                <option value="sequential">Sequential Comparison (Tuần tự)</option>
                <option value="youtube_native">YouTube Native (Đồng thời)</option>
              </select>
            </div>
          </div>

          {/* List of experiments */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {isLoading && (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-purple-400" />
                <span>Đang tải danh sách thử nghiệm...</span>
              </div>
            )}

            {!isLoading && filteredExperiments.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                <FlaskConical size={28} className="mx-auto text-slate-600" />
                <p>Chưa có cuộc thử nghiệm nào.</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg text-xs font-semibold transition"
                >
                  + Tạo thử nghiệm đầu tiên
                </button>
              </div>
            )}

            {filteredExperiments.map(exp => {
              const isSelected = exp.id === activeExperiment?.id;
              const hasWinner = Boolean(exp.winnerVariantId);

              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExpId(exp.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer text-left relative ${
                    isSelected
                      ? 'bg-purple-950/30 border-purple-500/70 shadow-md ring-1 ring-purple-500/40'
                      : 'bg-[#0f1b30] border-[#1b3154] hover:border-[#2a4d80] text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-white line-clamp-2 leading-snug">
                      {exp.title}
                    </span>
                    {exp.status === 'running' ? (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                        <Clock size={10} />
                        Đang chạy
                      </span>
                    ) : exp.status === 'completed' ? (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 size={10} />
                        Hoàn thành
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        Bản nháp
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mb-2">
                    {exp.videoTitle}
                  </p>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-[#172744]">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      {exp.experimentType === 'title' ? (
                        <span className="flex items-center gap-1 text-cyan-300">
                          <Type size={11} /> Tiêu đề
                        </span>
                      ) : exp.experimentType === 'thumbnail' ? (
                        <span className="flex items-center gap-1 text-pink-300">
                          <Image size={11} /> Thumbnail
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-purple-300">
                          <Layers size={11} /> Tiêu đề + Thumb
                        </span>
                      )}
                      <span>·</span>
                      <span className="text-slate-400">
                        {exp.testMode === 'sequential' ? 'Sequential' : 'YT Native'}
                      </span>
                    </div>

                    {hasWinner && exp.upliftPercent ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                        <TrendingUp size={11} />
                        +{exp.upliftPercent.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">
                        {exp.variants.length} biến thể
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Workspace: Selected Experiment Detail & Comparative Dashboard */}
        <div className="flex-1 overflow-y-auto bg-[#070d19] p-6">
          {activeExperiment ? (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Experiment Overview Header Card */}
              <div className="bg-[#0c1628] rounded-2xl border border-[#1b3154] p-5 shadow-lg relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#172744]">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h2 className="text-lg font-bold text-white">
                        {activeExperiment.title}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        activeExperiment.testMode === 'sequential'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {activeExperiment.testMode === 'sequential'
                          ? 'Chế độ A: Sequential Comparison (So sánh tuần tự)'
                          : 'Chế độ B: YouTube Native Test (Đồng thời)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Video: <strong className="text-slate-200">{activeExperiment.videoTitle}</strong></span>
                      <span>·</span>
                      <span className="font-mono text-slate-500">ID: {activeExperiment.videoId}</span>
                      <span>·</span>
                      <span>Kênh: <strong className="text-purple-300">{activeExperiment.channelTitle || 'YouTube Channel'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeExperiment.status !== 'completed' && (
                      <button
                        onClick={() => {
                          setWinnerModalExp(activeExperiment);
                          setSelectedWinnerVariantId(activeExperiment.variants[1]?.id || activeExperiment.variants[0]?.id || '');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <Trophy size={13} />
                        <span>Chọn Winner</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteExperiment(activeExperiment.id)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition cursor-pointer"
                      title="Xóa cuộc thử nghiệm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Hypothesis Callout */}
                {activeExperiment.hypothesis && (
                  <div className="mt-4 p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl flex items-start gap-2.5 text-xs">
                    <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-300 block mb-0.5">Giả thuyết thử nghiệm:</span>
                      <p className="text-slate-300 leading-relaxed">{activeExperiment.hypothesis}</p>
                    </div>
                  </div>
                )}

                {/* Winner Banner if concluded */}
                {activeExperiment.winnerVariantId && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Trophy size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                            Biến thể chiến thắng:
                          </span>
                          <span className="font-bold text-white text-sm">
                            {activeExperiment.variants.find(v => v.id === activeExperiment.winnerVariantId)?.name || 'Biến thể chiến thắng'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {activeExperiment.conclusion || 'Biến thể này mang lại hiệu suất vượt trội cao nhất và được chọn làm tiêu đề/thumbnail chính thức cho video.'}
                        </p>
                      </div>
                    </div>

                    {activeExperiment.upliftPercent ? (
                      <div className="text-right shrink-0 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-300 block">Mức tăng trưởng (Uplift)</span>
                        <span className="text-xl font-black text-emerald-400">
                          +{activeExperiment.upliftPercent.toFixed(1)}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Mode A: Sequential Comparison Workflow */}
              {activeExperiment.testMode === 'sequential' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock size={16} className="text-blue-400" />
                        <span>Tiến trình thử nghiệm tuần tự (Sequential Phases)</span>
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        – Áp dụng từng phương án trong YouTube Studio rồi bấm bắt đầu giai đoạn
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-[#0f1b30] px-3 py-1 rounded-lg border border-[#1b3154]">
                      <BarChart3 size={13} className="text-cyan-400" />
                      <span>Số liệu được <strong>chuẩn hóa theo ngày</strong></span>
                    </div>
                  </div>

                  {/* Variants Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeExperiment.variants.map((variant, index) => {
                      const isRunning = variant.status === 'running';
                      const isCompleted = variant.status === 'completed';
                      const isWinner = variant.isWinner || variant.id === activeExperiment.winnerVariantId;

                      return (
                        <div
                          key={variant.id}
                          className={`rounded-2xl border p-4 flex flex-col justify-between transition relative ${
                            isWinner
                              ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                              : isRunning
                              ? 'bg-blue-950/20 border-blue-500/60 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30'
                              : 'bg-[#0c1628] border-[#1b3154] text-slate-300'
                          }`}
                        >
                          {/* Header badge */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center ${
                                  variant.label === 'A'
                                    ? 'bg-slate-700 text-white'
                                    : variant.label === 'B'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-pink-600 text-white'
                                }`}>
                                  {variant.label}
                                </span>
                                <div>
                                  <span className="text-xs font-bold text-white block">
                                    {variant.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {index === 0 ? 'Bản gốc (Control)' : 'Bản thách thức (Challenger)'}
                                  </span>
                                </div>
                              </div>

                              {isWinner ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <Trophy size={11} /> WINNER
                                </span>
                              ) : isRunning ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 animate-pulse">
                                  <Clock size={11} /> ĐANG CHẠY
                                </span>
                              ) : isCompleted ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  ĐÃ KẾT THÚC
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-500 bg-slate-900 border border-slate-800">
                                  CHƯA CHẠY
                                </span>
                              )}
                            </div>

                            {/* Content preview: Title and/or Thumbnail */}
                            {variant.thumbnailUrl && (
                              <div className="relative mb-3 rounded-xl overflow-hidden border border-[#1b3154] aspect-video bg-black/50">
                                <img
                                  src={variant.thumbnailUrl}
                                  alt="Variant thumbnail"
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-mono text-cyan-300">
                                  Biến thể {variant.label}
                                </span>
                              </div>
                            )}

                            {variant.title && (
                              <div className="p-2.5 bg-[#0f1d35] rounded-xl border border-[#1b335c] text-xs font-medium text-slate-200 mb-3 leading-relaxed">
                                {variant.title}
                              </div>
                            )}

                            {/* Date period info */}
                            <div className="text-[11px] text-slate-400 mb-4 space-y-1 bg-[#091222] p-2 rounded-xl border border-[#152542]">
                              <div className="flex justify-between">
                                <span>Thời gian chạy:</span>
                                <span className="font-mono text-slate-200">
                                  {variant.daysActive > 0 ? `${variant.daysActive} ngày` : isRunning ? 'Đang đếm...' : '0 ngày'}
                                </span>
                              </div>
                              {variant.startDate && (
                                <div className="flex justify-between text-[10px] text-slate-500">
                                  <span>Bắt đầu:</span>
                                  <span>{new Date(variant.startDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                              )}
                              {variant.endDate && (
                                <div className="flex justify-between text-[10px] text-slate-500">
                                  <span>Kết thúc:</span>
                                  <span>{new Date(variant.endDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                              )}
                            </div>

                            {/* Metrics summary (Normalized per day) */}
                            {isCompleted && (
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="p-2 bg-[#101f38] rounded-xl border border-[#1d3864]">
                                  <span className="text-[10px] text-slate-400 block">Lượt xem / ngày</span>
                                  <span className="text-base font-bold text-cyan-300">
                                    {variant.viewsPerDay.toLocaleString()}
                                  </span>
                                  <span className="text-[9px] text-slate-500 block">Tổng: {variant.views.toLocaleString()}</span>
                                </div>
                                <div className="p-2 bg-[#101f38] rounded-xl border border-[#1d3864]">
                                  <span className="text-[10px] text-slate-400 block">Phút xem / ngày</span>
                                  <span className="text-base font-bold text-amber-300">
                                    {variant.watchTimeMinutesPerDay.toLocaleString()}m
                                  </span>
                                  <span className="text-[9px] text-slate-500 block">Giữ chân: {variant.averageViewPercentage}%</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Phase Action Buttons */}
                          <div className="pt-2 border-t border-[#172744] flex items-center justify-between gap-2">
                            {isRunning ? (
                              <button
                                onClick={() => handleEndVariant(activeExperiment.id, variant.id)}
                                disabled={actionLoading === `end_${variant.id}`}
                                className="w-full py-2 px-3 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                              >
                                {actionLoading === `end_${variant.id}` ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Square size={12} className="fill-white" />
                                )}
                                <span>Kết thúc & Đồng bộ Analytics</span>
                              </button>
                            ) : isCompleted ? (
                              <button
                                onClick={() => handleSyncVariant(activeExperiment.id, variant.id)}
                                disabled={actionLoading === `sync_${variant.id}`}
                                className="w-full py-1.5 px-3 bg-[#152542] hover:bg-[#1d355e] text-slate-300 hover:text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 border border-[#213b63] cursor-pointer"
                              >
                                <RefreshCw size={12} className={actionLoading === `sync_${variant.id}` ? 'animate-spin' : ''} />
                                <span>Đồng bộ lại Analytics</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartVariant(activeExperiment.id, variant.id)}
                                disabled={actionLoading === `start_${variant.id}`}
                                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                              >
                                <Play size={12} className="fill-white" />
                                <span>Bắt đầu giai đoạn này</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Comparative Performance Chart Table */}
                  <div className="bg-[#0c1628] rounded-2xl border border-[#1b3154] p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 size={15} className="text-purple-400" />
                        <span>Bảng so sánh hiệu suất chuẩn hóa theo ngày (Daily Normalized Comparison)</span>
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Căn cứ theo YouTube Analytics API
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#091222] text-slate-400 border-b border-[#172744]">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold">Biến thể</th>
                            <th className="py-2.5 px-3 font-semibold">Số ngày chạy</th>
                            <th className="py-2.5 px-3 font-semibold">Lượt xem / ngày</th>
                            <th className="py-2.5 px-3 font-semibold">Thời gian xem / ngày</th>
                            <th className="py-2.5 px-3 font-semibold">Tỷ lệ xem trung bình</th>
                            <th className="py-2.5 px-3 font-semibold">Tương tác</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Mức vượt trội</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#172744]">
                          {activeExperiment.variants.map((v) => {
                            const isWin = v.isWinner || v.id === activeExperiment.winnerVariantId;
                            const base = activeExperiment.variants[0];
                            const uplift = base && base.watchTimeMinutesPerDay > 0
                              ? Math.round(((v.watchTimeMinutesPerDay - base.watchTimeMinutesPerDay) / base.watchTimeMinutesPerDay) * 1000) / 10
                              : 0;

                            return (
                              <tr key={v.id} className={isWin ? 'bg-emerald-950/20' : ''}>
                                <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center ${
                                    v.label === 'A' ? 'bg-slate-700 text-white' : 'bg-purple-600 text-white'
                                  }`}>
                                    {v.label}
                                  </span>
                                  <span>{v.name}</span>
                                  {isWin && <Trophy size={13} className="text-emerald-400" />}
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-300">
                                  {v.daysActive > 0 ? `${v.daysActive} ngày` : '—'}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-cyan-300">
                                  {v.viewsPerDay > 0 ? v.viewsPerDay.toLocaleString() : '—'}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-amber-300">
                                  {v.watchTimeMinutesPerDay > 0 ? `${v.watchTimeMinutesPerDay.toLocaleString()}m` : '—'}
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-300">
                                  {v.averageViewPercentage > 0 ? `${v.averageViewPercentage}%` : '—'}
                                </td>
                                <td className="py-3 px-3 text-slate-400">
                                  ❤️ {v.likes} · 💬 {v.comments} · ↗ {v.shares}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold">
                                  {v.label === 'A' ? (
                                    <span className="text-slate-500">Gốc (Baseline)</span>
                                  ) : uplift > 0 ? (
                                    <span className="text-emerald-400">+{uplift.toFixed(1)}%</span>
                                  ) : uplift < 0 ? (
                                    <span className="text-red-400">{uplift.toFixed(1)}%</span>
                                  ) : (
                                    <span className="text-slate-500">0.0%</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-[#0a1426] rounded-xl border border-[#162744] flex items-start gap-2.5 text-[11px] text-slate-400">
                      <HelpCircle size={15} className="text-blue-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong>Lưu ý về phương pháp:</strong> Thử nghiệm tuần tự (Sequential Comparison) so sánh các giai đoạn thời gian nối tiếp nhau. Kết quả có thể bị ảnh hưởng một phần bởi thời điểm đăng và xu hướng tìm kiếm tự nhiên của thuật toán YouTube.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode B: YouTube Native Test (Test & Compare) */}
              {activeExperiment.testMode === 'youtube_native' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Trophy size={16} className="text-amber-400" />
                        <span>Thử nghiệm đồng thời YouTube Native (Test & Compare)</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        YouTube Studio hỗ trợ thử nghiệm đồng thời tối đa 3 thumbnail và đo lường tỷ lệ thời gian xem (Watch-time share).
                      </p>
                    </div>

                    <a
                      href={`https://studio.youtube.com/video/${activeExperiment.videoId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-[#172744] hover:bg-[#1f355c] text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-[#25406c] transition"
                    >
                      <ExternalLink size={12} />
                      <span>Mở YouTube Studio</span>
                    </a>
                  </div>

                  {/* Input form & Comparison Cards */}
                  <div className="bg-[#0c1628] rounded-2xl border border-[#1b3154] p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {activeExperiment.variants.map((v, i) => {
                        const isWin = v.isWinner || v.id === activeExperiment.winnerVariantId;
                        const currentShare = i === 0 ? nativeShareA : i === 1 ? nativeShareB : nativeShareC;
                        const currentCtr = i === 0 ? nativeCtrA : i === 1 ? nativeCtrB : nativeCtrC;

                        return (
                          <div
                            key={v.id}
                            className={`p-4 rounded-xl border space-y-3 ${
                              isWin
                                ? 'bg-emerald-950/20 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                                : 'bg-[#0f1d35] border-[#1b335c]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded bg-purple-600 text-white flex items-center justify-center text-[10px]">
                                  {v.label}
                                </span>
                                <span>{v.name}</span>
                              </span>
                              {isWin && (
                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  WINNER
                                </span>
                              )}
                            </div>

                            {v.thumbnailUrl && (
                              <img
                                src={v.thumbnailUrl}
                                alt="Thumb"
                                className="w-full aspect-video rounded-lg object-cover border border-[#1b3154]"
                              />
                            )}

                            {/* Inputs for Watch-time Share & CTR */}
                            <div className="space-y-2 pt-2 border-t border-[#172744]">
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">
                                  Tỷ lệ thời gian xem (Watch-Time Share %)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  value={currentShare}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (i === 0) setNativeShareA(val);
                                    else if (i === 1) setNativeShareB(val);
                                    else setNativeShareC(val);
                                  }}
                                  className="w-full bg-[#152542] border border-[#213b63] rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">
                                  CTR ước tính (Click-Through Rate %)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  value={currentCtr}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (i === 0) setNativeCtrA(val);
                                    else if (i === 1) setNativeCtrB(val);
                                    else setNativeCtrC(val);
                                  }}
                                  className="w-full bg-[#152542] border border-[#213b63] rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-3 border-t border-[#172744]">
                      <button
                        onClick={() => handleSaveNativeResults(activeExperiment)}
                        disabled={actionLoading === 'native_save'}
                        className="py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer"
                      >
                        {actionLoading === 'native_save' ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        <span>Lưu kết quả & Đánh giá Winner</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <FlaskConical size={36} className="text-slate-600" />
              <p className="text-sm">Hãy chọn hoặc tạo một cuộc thử nghiệm để bắt đầu phân tích A/B Testing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Tạo cuộc thử nghiệm mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1628] border border-[#1b3154] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#172744] flex items-center justify-between bg-[#0e1a30]">
              <div className="flex items-center gap-2">
                <FlaskConical size={18} className="text-purple-400" />
                <h3 className="font-bold text-sm text-white">Tạo cuộc thử nghiệm A/B mới</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExperiment} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Select from existing published video */}
              {publishedVideos.length > 0 && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Chọn nhanh từ video đã xuất bản lên YouTube
                  </label>
                  <select
                    onChange={(e) => {
                      const found = publishedVideos.find(p => p.youtubeVideoId === e.target.value);
                      if (found) handleSelectPublishedVideo(found);
                    }}
                    className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Chọn video YouTube đã đăng --</option>
                    {publishedVideos.map(p => (
                      <option key={p.id} value={p.youtubeVideoId || ''}>
                        {p.title} ({p.youtubeVideoId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Experiment Title */}
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  Tên cuộc thử nghiệm *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thử nghiệm Tiêu đề Tò mò vs Kịch tính"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              {/* Video ID & Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">YouTube Video ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: DQodErtCtpi"
                    value={createVideoId}
                    onChange={(e) => setCreateVideoId(e.target.value)}
                    className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tên video gốc *</label>
                  <input
                    type="text"
                    required
                    placeholder="Tên video hiện tại trên YouTube"
                    value={createVideoTitle}
                    onChange={(e) => setCreateVideoTitle(e.target.value)}
                    className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Experiment Type & Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Loại thử nghiệm</label>
                  <select
                    value={createExpType}
                    onChange={(e: any) => setCreateExpType(e.target.value)}
                    className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="title">Chỉ thử nghiệm Tiêu đề (Title)</option>
                    <option value="thumbnail">Chỉ thử nghiệm Thumbnail</option>
                    <option value="title_and_thumbnail">Kết hợp Tiêu đề + Thumbnail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Phương pháp thử nghiệm</label>
                  <select
                    value={createTestMode}
                    onChange={(e: any) => setCreateTestMode(e.target.value)}
                    className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="sequential">A. Sequential Comparison (Tuần tự theo giai đoạn)</option>
                    <option value="youtube_native">B. YouTube Native Test (Đồng thời qua YT Studio)</option>
                  </select>
                </div>
              </div>

              {/* Hypothesis */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Giả thuyết của bạn (Hypothesis)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Đặt tiêu đề dạng khoảng trống tò mò sẽ kích thích tỷ lệ click và tăng 20% lượt xem/ngày"
                  value={createHypothesis}
                  onChange={(e) => setCreateHypothesis(e.target.value)}
                  className="w-full bg-[#152542] border border-[#213b63] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none resize-none"
                />
              </div>

              {/* Variants Configuration */}
              <div className="space-y-3 pt-2 border-t border-[#172744]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs">Cấu hình các biến thể</span>
                  <button
                    type="button"
                    onClick={() => setHasVariantC(!hasVariantC)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 transition"
                  >
                    {hasVariantC ? '✕ Bỏ biến thể C' : '+ Thêm biến thể C (Tối đa 3)'}
                  </button>
                </div>

                {/* Variant A */}
                <div className="p-3 bg-[#111e36] rounded-xl border border-[#1b3154] space-y-2">
                  <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-slate-700 text-white flex items-center justify-center text-[9px]">A</span>
                    <span>Biến thể A (Gốc / Control)</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Tiêu đề biến thể A"
                      value={varATitle}
                      onChange={(e) => setVarATitle(e.target.value)}
                      className="bg-[#152542] border border-[#213b63] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="URL Thumbnail A"
                      value={varAThumb}
                      onChange={(e) => setVarAThumb(e.target.value)}
                      className="bg-[#152542] border border-[#213b63] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Variant B */}
                <div className="p-3 bg-[#111e36] rounded-xl border border-[#1b3154] space-y-2">
                  <span className="font-bold text-purple-300 text-[11px] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center text-[9px]">B</span>
                    <span>Biến thể B (Thách thức / Challenger)</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Tiêu đề biến thể B (Gợi cảm xúc / Tò mò)"
                      value={varBTitle}
                      onChange={(e) => setVarBTitle(e.target.value)}
                      className="bg-[#152542] border border-[#213b63] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="URL Thumbnail B"
                      value={varBThumb}
                      onChange={(e) => setVarBThumb(e.target.value)}
                      className="bg-[#152542] border border-[#213b63] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Variant C */}
                {hasVariantC && (
                  <div className="p-3 bg-[#111e36] rounded-xl border border-[#1b3154] space-y-2">
                    <span className="font-bold text-pink-300 text-[11px] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-pink-600 text-white flex items-center justify-center text-[9px]">C</span>
                      <span>Biến thể C (Tùy chọn)</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Tiêu đề biến thể C"
                        value={varCTitle}
                        onChange={(e) => setVarCTitle(e.target.value)}
                        className="bg-[#152542] border border-[#213b63] rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="URL Thumbnail C"
                        value={varCThumb}
                        onChange={(e) => setVarCThumb(e.target.value)}
                        className="bg-[#152542] border border-[#213b63] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#172744]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create'}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  {actionLoading === 'create' ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  <span>Tạo thử nghiệm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chọn biến thể chiến thắng */}
      {winnerModalExp && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1628] border border-[#1b3154] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Trophy size={18} />
              <span>Xác nhận Biến thể Chiến Thắng</span>
            </div>

            <p className="text-slate-300">
              Chọn biến thể có hiệu suất tốt nhất để kết thúc cuộc thử nghiệm và ghi nhận bài học:
            </p>

            <div className="space-y-2">
              {winnerModalExp.variants.map(v => (
                <label
                  key={v.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    selectedWinnerVariantId === v.id
                      ? 'bg-emerald-950/30 border-emerald-500/70 text-white'
                      : 'bg-[#101f38] border-[#1d355c] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="winnerVariant"
                      checked={selectedWinnerVariantId === v.id}
                      onChange={() => setSelectedWinnerVariantId(v.id)}
                      className="text-emerald-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold text-white block">{v.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {v.viewsPerDay > 0 ? `${v.viewsPerDay} views/ngày · ${v.watchTimeMinutesPerDay}m xem/ngày` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-sm text-emerald-400">{v.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Ghi chú kết luận & Bài học kinh nghiệm:
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Biến thể B với từ khóa giật gân giúp tăng 71.5% thời gian xem mỗi ngày..."
                value={winnerConclusion}
                onChange={(e) => setWinnerConclusion(e.target.value)}
                className="w-full bg-[#152542] border border-[#213b63] rounded-xl p-2.5 text-xs text-white resize-none focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#172744]">
              <button
                type="button"
                onClick={() => setWinnerModalExp(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmWinner}
                disabled={actionLoading === 'declare_winner'}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow"
              >
                {actionLoading === 'declare_winner' && <RefreshCw size={12} className="animate-spin" />}
                <span>Xác nhận</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
