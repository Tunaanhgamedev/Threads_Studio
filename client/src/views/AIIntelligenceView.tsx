import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  Lightbulb, 
  Flame, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  RefreshCw, 
  ArrowRight, 
  SlidersHorizontal, 
  Layers, 
  FileText, 
  Eye, 
  Target, 
  Tag, 
  Clapperboard,
  Zap,
  Wand2
} from 'lucide-react';
import { api } from '../services/api';
import { 
  YouTubeAccount, 
  AIIntelligenceReport, 
  AIContentIdea, 
  AITitleVariation 
} from '../types';

interface AIIntelligenceViewProps {
  onOpenStudio?: () => void;
  onOpenPublishing?: () => void;
}

export const AIIntelligenceView: React.FC<AIIntelligenceViewProps> = ({
  onOpenStudio,
  onOpenPublishing
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'ideas' | 'titles' | 'thumbnails' | 'report'>('insights');
  const [accounts, setAccounts] = useState<YouTubeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [periodDays, setPeriodDays] = useState<number>(28);
  const [report, setReport] = useState<AIIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Live Title Optimizer State
  const [testTitle, setTestTitle] = useState<string>('Bí mật của bạn thân 7 năm');
  const [optimizedTitles, setOptimizedTitles] = useState<AITitleVariation[]>([]);
  const [isOptimizingTitle, setIsOptimizingTitle] = useState<boolean>(false);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const accs = await api.getYouTubeAccounts().catch(() => []);
      setAccounts(accs);
      const accId = accs[0]?.id || '';
      setSelectedAccountId(accId);

      // Fetch saved reports or generate initial one
      const reports = await api.getAIIntelligenceReports(accId).catch(() => []);
      if (reports.length > 0) {
        setReport(reports[0]);
      } else {
        const generated = await api.generateAIIntelligenceReport(accId, periodDays);
        setReport(generated);
      }
    } catch (err: any) {
      console.warn('Failed to load AI Intelligence data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await api.generateAIIntelligenceReport(selectedAccountId, periodDays);
      setReport(res);
    } catch (err: any) {
      alert('Lỗi tạo báo cáo AI: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimizeCustomTitle = async () => {
    if (!testTitle.trim()) return;
    setIsOptimizingTitle(true);
    try {
      const res = await api.optimizeTitleWithAI(testTitle.trim());
      setOptimizedTitles(res);
    } catch (err: any) {
      alert('Lỗi tối ưu tiêu đề: ' + err.message);
    } finally {
      setIsOptimizingTitle(false);
    }
  };

  const handleIdeaStatusToggle = async (ideaId: string, currentStatus: string) => {
    if (!report) return;
    const nextStatus = currentStatus === 'accepted' ? 'pending' : 'accepted';
    try {
      await api.updateAIIdeaStatus(report.id, ideaId, nextStatus);
      setReport(prev => {
        if (!prev) return null;
        return {
          ...prev,
          contentIdeas: prev.contentIdeas.map(i => i.id === ideaId ? { ...i, status: nextStatus } : i)
        };
      });
    } catch (err: any) {
      console.warn('Failed to update idea status:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report.markdownReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Report_${report.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070d19] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner Header */}
      <div className="bg-[#0b1426] border-b border-[#182a48] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
            <BrainCircuit size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">AI Content Intelligence</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Phase 12
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Phân tích dữ liệu hiệu suất YouTube để tự động đề xuất chủ đề viral, tối ưu tiêu đề và concept thumbnail
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Target Channel */}
          {accounts.length > 0 && (
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                handleGenerateReport();
              }}
              className="bg-[#12223e] border border-[#203a66] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.channelTitle} ({acc.channelHandle || 'YouTube'})
                </option>
              ))}
            </select>
          )}

          {/* Period Filter */}
          <div className="flex bg-[#101e36] p-1 border border-[#1e365d] rounded-xl text-xs">
            {[28, 90].map(days => (
              <button
                key={days}
                onClick={() => setPeriodDays(days)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  periodDays === days
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {days} ngày
              </button>
            ))}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-600/30 transition disabled:opacity-60 cursor-pointer"
          >
            <Sparkles size={13} className={isGenerating ? 'animate-spin' : ''} />
            <span>{isGenerating ? 'Đang phân tích AI...' : 'Phân tích AI mới'}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="bg-[#091122] border-b border-[#152540] px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'insights', label: 'Phân tích hiệu suất', icon: TrendingUp },
            { id: 'ideas', label: 'Gợi ý nội dung', icon: Lightbulb, count: report?.contentIdeas.length },
            { id: 'titles', label: 'Tối ưu tiêu đề', icon: Wand2 },
            { id: 'thumbnails', label: 'Ý tưởng Thumbnail', icon: Layers },
            { id: 'report', label: 'Báo cáo Tuần (Markdown)', icon: FileText }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#12213d]'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span className={`text-[10px] px-1.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-800 text-slate-300'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {report && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="font-mono text-slate-300 truncate max-w-xs">{report.aiModelUsed}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading && !report ? (
          <div className="h-64 flex items-center justify-center text-slate-400">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Đang nạp bộ não AI Content Intelligence...</p>
            </div>
          </div>
        ) : report ? (
          <>
            {/* ================= TAB 1: PERFORMANCE INSIGHTS ================= */}
            {activeTab === 'insights' && (
              <div className="space-y-6">
                {/* AI Executive Summary Narrative */}
                <div className="bg-gradient-to-r from-[#121c38] to-[#161a3d] border border-[#243564] rounded-2xl p-6 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-violet-300 uppercase tracking-wider">
                      <Sparkles size={16} />
                      <span>Đánh Giá Chiến Lược Nội Dung Từ AI</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-normal">
                    {report.summaryNarrative}
                  </p>
                </div>

                {/* Performance Insight Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {report.performanceInsights.map((ins, i) => (
                    <div
                      key={i}
                      className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-4 shadow-xl space-y-2 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">{ins.metric}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ins.evaluation === 'positive' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : ins.evaluation === 'warning'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {ins.value}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed pt-1">
                        {ins.insightText}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Action Plan */}
                <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1b3154] pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Kế Hoạch Hành Động Tuần Tới (Action Plan)</span>
                    </h3>
                    <span className="text-xs text-slate-400">Các bước tối ưu kịch bản ưu tiên</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.actionPlan.map((action, i) => (
                      <div
                        key={i}
                        className="bg-[#101e36] border border-[#1d375e] p-3.5 rounded-xl flex items-start gap-3"
                      >
                        <div className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 2: CONTENT IDEAS ================= */}
            {activeTab === 'ideas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">4 Ý Tưởng Video Được Đề Xuất Bởi AI</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Dựa trên các chủ đề giữ chân người xem tốt nhất trên Threads</p>
                  </div>
                  {onOpenStudio && (
                    <button
                      onClick={onOpenStudio}
                      className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-3 py-1.5 bg-cyan-950/40 border border-cyan-800/50 rounded-xl transition cursor-pointer"
                    >
                      <Clapperboard size={14} />
                      <span>Đến Threads Studio</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.contentIdeas.map((idea, idx) => (
                    <div
                      key={idea.id}
                      className={`bg-[#0d182e] border rounded-2xl p-5 shadow-xl space-y-3.5 transition ${
                        idea.status === 'accepted' 
                          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' 
                          : 'border-[#1d3358] hover:border-[#254271]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-600/20 text-violet-300 border border-violet-500/30">
                              Ý tưởng #{idx + 1}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              {idea.format}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-400 font-mono">
                              Dự kiến: {idea.predictedRetention}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white leading-snug pt-1">
                            {idea.topic}
                          </h4>
                        </div>

                        <button
                          onClick={() => handleIdeaStatusToggle(idea.id, idea.status)}
                          className={`text-xs p-1.5 rounded-lg transition ${
                            idea.status === 'accepted' 
                              ? 'bg-emerald-600 text-white' 
                              : 'text-slate-400 hover:text-white bg-[#152747]'
                          }`}
                          title={idea.status === 'accepted' ? 'Đã duyệt' : 'Duyệt ý tưởng'}
                        >
                          <Check size={14} />
                        </button>
                      </div>

                      {/* Hook Premise Box */}
                      <div className="bg-[#101e38] border border-[#213b65] rounded-xl p-3 text-xs space-y-1">
                        <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
                          ⚡ Mở Đầu 3 Giây (Viral Hook)
                        </span>
                        <p className="text-slate-200 italic font-medium">
                          {idea.hookPremise}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#1a2e50]">
                        <span>Cảm xúc: <strong className="text-slate-200">{idea.targetEmotion}</strong></span>
                        {onOpenStudio && (
                          <button
                            onClick={onOpenStudio}
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold transition cursor-pointer"
                          >
                            <span>Tạo video này</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TAB 3: TITLE OPTIMIZER ================= */}
            {activeTab === 'titles' && (
              <div className="space-y-6">
                {/* Interactive Title Tester */}
                <div className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-5 shadow-xl space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Wand2 size={16} className="text-violet-400" />
                    <span>Bộ Tối Ưu Hóa Tiêu Đề Theo Tâm Lý Học Shorts</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Nhập tiêu đề hoặc chủ đề bất kỳ để AI tạo ra 4 góc nhìn giật gân, tò mò, và kịch tính
                  </p>

                  <div className="flex gap-2.5 pt-1">
                    <input
                      type="text"
                      value={testTitle}
                      onChange={(e) => setTestTitle(e.target.value)}
                      placeholder="VD: Bí mật của bạn thân lúc nửa đêm..."
                      className="flex-1 bg-[#12223e] border border-[#213b63] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-medium"
                    />
                    <button
                      onClick={handleOptimizeCustomTitle}
                      disabled={isOptimizingTitle}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <Sparkles size={13} className={isOptimizingTitle ? 'animate-spin' : ''} />
                      <span>{isOptimizingTitle ? 'Đang tạo...' : 'Tạo Biến Thể'}</span>
                    </button>
                  </div>
                </div>

                {/* Display Optimized Titles List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Các Biến Thể Tiêu Đề Đề Xuất ({optimizedTitles.length > 0 ? optimizedTitles.length : report.titleSuggestions.length})
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(optimizedTitles.length > 0 ? optimizedTitles : report.titleSuggestions).map((t) => (
                      <div
                        key={t.id}
                        className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-4 shadow-lg space-y-2.5 relative group hover:border-[#2a4a7e] transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            t.angle === 'curiosity' 
                              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                              : t.angle === 'drama'
                              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                              : t.angle === 'relatable'
                              ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {t.angleLabel}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {t.characterCount}/100
                          </span>
                        </div>

                        <p className="text-xs font-bold text-white leading-relaxed">
                          {t.title}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-[#172a49]">
                          <div className="flex gap-1.5">
                            {t.tags.map(tag => (
                              <span key={tag} className="text-[9px] text-slate-400 bg-[#12213a] px-1.5 py-0.5 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <button
                            onClick={() => handleCopy(t.title, t.id)}
                            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-[#152747] hover:bg-[#1f3b6d] px-2.5 py-1 rounded-lg transition cursor-pointer"
                          >
                            {copiedText === t.id ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span className="text-emerald-400 font-bold">Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 4: THUMBNAIL CONCEPTS ================= */}
            {activeTab === 'thumbnails' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">3 Concept Hình Thu Nhỏ (Thumbnail) Gây Tò Mò</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Được thiết kế dựa trên các gam màu tương phản cao giúp tăng CTR cho Shorts</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {report.thumbnailConcepts.map((th, idx) => (
                    <div
                      key={th.id}
                      className="bg-[#0d182e] border border-[#1d3358] rounded-2xl p-5 shadow-xl space-y-3.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {th.conceptTitle}
                        </h4>
                      </div>

                      {/* Mockup Card */}
                      <div className="aspect-[9/16] max-h-48 w-auto mx-auto bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-inner">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono pt-1">
                          [Bố cục: {th.visualLayout.slice(0, 30)}...]
                        </span>

                        {/* Bold Text Overlay */}
                        <div className="px-3 py-1.5 bg-black/90 rounded-lg shadow-xl border border-white/20">
                          <span className="text-xs font-extrabold tracking-wider block" style={{ color: th.textColor.split(' ')[0] }}>
                            {th.textOverlay}
                          </span>
                        </div>

                        <span className="text-[9px] text-slate-400 pb-1">
                          Biểu cảm: {th.facialExpression}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block">Chữ trên ảnh:</span>
                          <span className="font-bold text-white font-mono">{th.textOverlay}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block">Màu sắc chủ đạo:</span>
                          <span className="text-slate-300">{th.textColor}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block">Yếu tố tương phản:</span>
                          <span className="text-slate-300">{th.contrastElements}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TAB 5: BÁO CÁO TUẦN (MARKDOWN) ================= */}
            {activeTab === 'report' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Báo Cáo Chiến Lược Dạng Markdown</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Sao chép hoặc tải file .md để lưu trữ và chia sẻ</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(report.markdownReport, 'md_report')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#142646] hover:bg-[#1b345f] text-slate-200 text-xs font-semibold rounded-xl border border-[#213f6d] transition cursor-pointer"
                    >
                      {copiedText === 'md_report' ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-400">Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Sao chép Markdown</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadMarkdown}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition shadow cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Tải file .md</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#0b1426] border border-[#1b3054] rounded-2xl p-6 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-[600px] overflow-y-auto">
                  {report.markdownReport}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
