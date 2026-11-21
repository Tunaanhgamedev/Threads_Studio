import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Play, 
  Square, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FolderOpen, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Sliders, 
  Layers, 
  Sparkles, 
  Film,
  Music,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BatchJob, BatchItem, Project } from '../types';
import { api } from '../services/api';

interface AutomationViewProps {
  onOpenVideoModal?: (url: string, title: string) => void;
  onSelectProject?: (projectId: string) => void;
  onOpenStudio?: () => void;
}

export const AutomationView: React.FC<AutomationViewProps> = ({
  onOpenVideoModal,
  onSelectProject,
  onOpenStudio
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);
  const [batchTitle, setBatchTitle] = useState('');
  
  // Batch Video Configurations
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [voiceName, setVoiceName] = useState('VieNeu - Ngọc Huyền (Nữ miền Bắc)');
  const [voiceSpeed, setVoiceSpeed] = useState(1.2);
  const [bgVideoFolder, setBgVideoFolder] = useState('');
  const [subVideoEnabled, setSubVideoEnabled] = useState(true);
  const [subVideoFolder, setSubVideoFolder] = useState('');
  const [bgMusicFolder, setBgMusicFolder] = useState('');
  const [bgMusicVolume, setBgMusicVolume] = useState(20);
  const [watermarkText, setWatermarkText] = useState('@ThreadsStudio');

  // Status
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [activeBatch, setActiveBatch] = useState<BatchJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto detect URLs from input
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!urlInput.trim()) {
        setDetectedUrls([]);
        return;
      }
      try {
        const res = await api.extractThreadsUrls(urlInput);
        if (res.success) {
          setDetectedUrls(res.urls);
        }
      } catch {
        // Fallback simple regex
        const matches = urlInput.split(/[\r\n,]+/).map(s => s.trim()).filter(s => s.includes('threads.net'));
        setDetectedUrls(matches);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [urlInput]);

  // Load batches list on mount
  const loadBatches = async () => {
    try {
      const list = await api.getBatches();
      setBatches(list);
      if (list.length > 0 && !activeBatch) {
        setActiveBatch(list[0]);
      }
    } catch (err) {
      console.warn('Failed to load batches:', err);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  // Poll active batch progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeBatch && (activeBatch.status === 'processing' || activeBatch.status === 'queued')) {
      interval = setInterval(async () => {
        try {
          const fresh = await api.getBatch(activeBatch.id);
          setActiveBatch(fresh);
          setBatches(prev => prev.map(b => b.id === fresh.id ? fresh : b));

          if (fresh.status === 'completed') {
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          }
        } catch (err) {
          console.warn('Error polling batch:', err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [activeBatch?.id, activeBatch?.status]);

  // Folder & File Browsers
  const handleBrowseBgVideo = async () => {
    const p = await api.browseFolder(bgVideoFolder, 'Chọn thư mục Video nền');
    if (p) setBgVideoFolder(p);
  };

  const handleBrowseBgVideoFile = async () => {
    const p = await api.browseFile(bgVideoFolder, 'Chọn file Video nền', 'video');
    if (p) setBgVideoFolder(p);
  };

  const handleBrowseSubVideo = async () => {
    const p = await api.browseFolder(subVideoFolder, 'Chọn thư mục Video phụ (Satisfying/Gameplay/Meme)');
    if (p) setSubVideoFolder(p);
  };

  const handleBrowseSubVideoFile = async () => {
    const p = await api.browseFile(subVideoFolder, 'Chọn file Video phụ (Meme / Gameplay)', 'video');
    if (p) setSubVideoFolder(p);
  };

  const handleBrowseBgMusic = async () => {
    const p = await api.browseFolder(bgMusicFolder, 'Chọn thư mục Nhạc nền');
    if (p) setBgMusicFolder(p);
  };

  const handleBrowseBgMusicFile = async () => {
    const p = await api.browseFile(bgMusicFolder, 'Chọn file Nhạc nền (MP3 / WAV)', 'audio');
    if (p) setBgMusicFolder(p);
  };

  // Sample URLs helper
  const handleInsertSampleUrls = () => {
    const samples = [
      'https://www.threads.net/@zuck/post/DFa_Sample1',
      'https://www.threads.net/@threads/post/DFb_Sample2',
      'https://www.threads.net/@creators/post/DFc_Sample3'
    ].join('\n');
    setUrlInput(prev => prev ? `${prev}\n${samples}` : samples);
  };

  // Start Batch Automation Run
  const handleStartBatch = async () => {
    if (detectedUrls.length === 0) {
      setErrorMsg('Vui lòng nhập ít nhất 1 liên kết Threads hợp lệ.');
      return;
    }

    setIsStarting(true);
    setErrorMsg('');

    try {
      const config = {
        aspectRatio,
        backgroundVideoFolder: bgVideoFolder,
        cardPosition: {
          x: 50,
          y: 40,
          scale: 92,
          borderRadius: 18,
          bgStyle: 'white'
        },
        subVideoPosition: {
          enabled: subVideoEnabled,
          layoutMode: 'fullscreen',
          folder: subVideoFolder,
          scale: 100,
          x: 50,
          y: 50,
          borderRadius: 0,
          brightness: 80
        },
        backgroundMusic: {
          enabled: true,
          folder: bgMusicFolder,
          volume: bgMusicVolume
        },
        tts: {
          previewVoice: voiceName,
          speed: voiceSpeed,
          selectedVoices: [voiceName]
        },
        watermark: {
          enabled: !!watermarkText,
          text: watermarkText,
          position: 'top_right' as const,
          opacity: 0.75,
          fontSize: 26
        }
      };

      const newBatch = await api.createBatch(
        detectedUrls,
        config,
        batchTitle.trim() || undefined
      );

      setActiveBatch(newBatch);
      setBatches(prev => [newBatch, ...prev]);
      setUrlInput('');
      setBatchTitle('');
      confetti({ particleCount: 50, spread: 50 });
    } catch (err: any) {
      setErrorMsg('Lỗi khởi động mẻ tự động: ' + err.message);
    } finally {
      setIsStarting(false);
    }
  };

  // Cancel Batch
  const handleCancelBatch = async (batchId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy mẻ chạy tự động này?')) return;
    try {
      await api.cancelBatch(batchId);
      const updated = await api.getBatch(batchId);
      setActiveBatch(updated);
      setBatches(prev => prev.map(b => b.id === batchId ? updated : b));
    } catch (err: any) {
      alert('Lỗi hủy mẻ: ' + err.message);
    }
  };

  // Delete Batch
  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mẻ này khỏi lịch sử?')) return;
    try {
      await api.deleteBatch(batchId);
      setBatches(prev => prev.filter(b => b.id !== batchId));
      if (activeBatch?.id === batchId) {
        const remaining = batches.filter(b => b.id !== batchId);
        setActiveBatch(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err: any) {
      alert('Lỗi xóa mẻ: ' + err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden bg-[#070d19]">
      {/* ================= LEFT CONFIGURATION PANEL ================= */}
      <div className="w-full xl:w-[480px] 2xl:w-[520px] border-r border-[#192b47] flex flex-col h-full bg-[#091222] shrink-0">
        <div className="p-4 border-b border-[#1b2d4b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Zap size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-slate-100 text-sm">Automation Engine</h2>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">Phase 7</span>
              </div>
              <p className="text-[11px] text-slate-400">Sản xuất video Threads hàng loạt tự động</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Card 1: URLs Input */}
          <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Danh sách URL bài viết Threads</span>
                <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleInsertSampleUrls}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                + Thêm link mẫu
              </button>
            </div>

            <textarea
              rows={4}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Dán các đường dẫn bài viết Threads vào đây (mỗi dòng 1 link)&#10;https://www.threads.net/@user/post/abc123&#10;https://www.threads.net/@user/post/xyz789"
              className="w-full bg-[#152542] border border-[#213b63] rounded-xl p-3 text-xs text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center justify-between text-xs">
              <span className={`text-[11px] font-mono ${detectedUrls.length > 0 ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                {detectedUrls.length > 0 ? `✓ Đã nhận diện ${detectedUrls.length} liên kết Threads hợp lệ` : 'Nhập ít nhất 1 link Threads'}
              </span>
              <input
                type="text"
                value={batchTitle}
                onChange={(e) => setBatchTitle(e.target.value)}
                placeholder="Tên mẻ chạy (tùy chọn)..."
                className="w-44 bg-[#152542] border border-[#213b63] rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Card 2: Preset Video Cấu hình */}
          <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-4 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Sliders size={14} className="text-blue-400" />
              <span>Cấu hình chung áp dụng cho toàn bộ mẻ</span>
            </h3>

            {/* Tỷ lệ khung hình & Giọng đọc */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tỷ lệ video</label>
                <div className="flex gap-1 bg-[#152542] p-0.5 rounded-xl border border-[#213b63]">
                  {(['9:16', '16:9', '1:1'] as const).map(ratio => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-mono transition ${
                        aspectRatio === ratio
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tốc độ đọc</label>
                <select
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value={1.0}>1.0x (Chuẩn)</option>
                  <option value={1.15}>1.15x (Tự nhiên)</option>
                  <option value={1.2}>1.2x (Khuyên dùng)</option>
                  <option value={1.3}>1.3x (Nhanh)</option>
                </select>
              </div>
            </div>

            {/* Giọng đọc AI */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Giọng đọc lồng tiếng (Neural AI)</label>
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="VieNeu - Ngọc Huyền (Nữ miền Bắc)">VieNeu - Ngọc Huyền (Nữ miền Bắc)</option>
                <option value="VieNeu - Thiện Minh (Nam miền Bắc)">VieNeu - Thiện Minh (Nam miền Bắc)</option>
                <option value="VieNeu - Hải Đăng (Nam miền Nam)">VieNeu - Hải Đăng (Nam miền Nam)</option>
                <option value="TikTok Việt 1">TikTok Việt 1 (Nữ viral)</option>
                <option value="TikTok Việt 2">TikTok Việt 2 (Nam vui vẻ)</option>
                <option value="Adam bựa - VieNeu">Adam bựa - VieNeu</option>
              </select>
            </div>

            {/* Thư mục Video Nền */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Thư mục Video nền</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bgVideoFolder}
                  placeholder="Chọn file hoặc thư mục video nền..."
                  onChange={(e) => setBgVideoFolder(e.target.value)}
                  className="flex-1 bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleBrowseBgVideoFile}
                  className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Chọn 1 file video cụ thể"
                >
                  <Film size={12} className="text-cyan-400" />
                  <span>File</span>
                </button>
                <button
                  type="button"
                  onClick={handleBrowseBgVideo}
                  className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Chọn thư mục video ngẫu nhiên"
                >
                  <FolderOpen size={12} className="text-blue-400" />
                  <span>Thư mục</span>
                </button>
              </div>
            </div>

            {/* Thư mục Video Phụ */}
            <div className="pt-2 border-t border-[#182b47]">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={subVideoEnabled}
                  onChange={(e) => setSubVideoEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[#172744] border-[#253f68] text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>Ghép Video phụ (Meme / Gameplay / Satisfying)</span>
              </label>

              {subVideoEnabled && (
                <div className="flex gap-2 pl-5">
                  <input
                    type="text"
                    value={subVideoFolder}
                    placeholder="Chọn file hoặc thư mục video phụ..."
                    onChange={(e) => setSubVideoFolder(e.target.value)}
                    className="flex-1 bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono truncate focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseSubVideoFile}
                    className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Chọn 1 file video phụ cụ thể"
                  >
                    <Film size={12} className="text-cyan-400" />
                    <span>File</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowseSubVideo}
                    className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Chọn thư mục video phụ"
                  >
                    <FolderOpen size={12} className="text-cyan-400" />
                    <span>Thư mục</span>
                  </button>
                </div>
              )}
            </div>

            {/* Thư mục Nhạc Nền */}
            <div className="pt-2 border-t border-[#182b47]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-400">Nhạc nền & Âm lượng</label>
                <span className="text-[11px] text-purple-400 font-mono">{bgMusicVolume}%</span>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={bgMusicFolder}
                  placeholder="Chọn file hoặc thư mục nhạc nền..."
                  onChange={(e) => setBgMusicFolder(e.target.value)}
                  className="flex-1 bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleBrowseBgMusicFile}
                  className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Chọn 1 file nhạc nền cụ thể"
                >
                  <Volume2 size={12} className="text-purple-400" />
                  <span>File</span>
                </button>
                <button
                  type="button"
                  onClick={handleBrowseBgMusic}
                  className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Chọn thư mục nhạc nền"
                >
                  <FolderOpen size={12} className="text-purple-400" />
                  <span>Thư mục</span>
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={bgMusicVolume}
                onChange={(e) => setBgMusicVolume(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Watermark */}
            <div className="pt-2 border-t border-[#182b47]">
              <label className="block text-[11px] text-slate-400 mb-1">Watermark bản quyền</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="@ThreadsStudio"
                className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={isStarting || detectedUrls.length === 0}
            onClick={handleStartBatch}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 select-none cursor-pointer ${
              detectedUrls.length === 0
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-500/25 active:scale-[0.99]'
            }`}
          >
            <Zap size={16} className={isStarting ? 'animate-spin' : ''} />
            <span>{isStarting ? 'Đang tạo mẻ chạy...' : `BẮT ĐẦU SẢN XUẤT ${detectedUrls.length > 0 ? `(${detectedUrls.length} VIDEO)` : ''}`}</span>
          </button>
        </div>
      </div>

      {/* ================= RIGHT BATCH PROGRESS & QUEUE ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070d19]">
        {/* Top Header & Stats */}
        <div className="p-4 border-b border-[#192b47] flex items-center justify-between bg-[#0a1324]">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              <span>Tiến độ hàng đợi sản xuất</span>
            </h3>

            {activeBatch && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                activeBatch.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' :
                activeBatch.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {activeBatch.status === 'processing' ? 'Đang sản xuất' :
                 activeBatch.status === 'completed' ? 'Đã hoàn thành' :
                 activeBatch.status === 'cancelled' ? 'Đã hủy' : 'Đang chờ'}
              </span>
            )}
          </div>

          {activeBatch && activeBatch.status === 'processing' && (
            <button
              onClick={() => handleCancelBatch(activeBatch.id)}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <Square size={13} />
              <span>Dừng mẻ này</span>
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeBatch ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-[#0f1b30] border border-[#1b3154] flex items-center justify-center text-cyan-400 mb-3 shadow-lg">
                <Zap size={28} />
              </div>
              <h4 className="text-base font-bold text-slate-200 mb-1">Chưa có mẻ tự động nào đang chạy</h4>
              <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
                Nhập danh sách link bài viết Threads ở bảng bên trái và nhấn <span className="text-cyan-300 font-semibold">Bắt đầu sản xuất</span> để tự động trích xuất, tạo ảnh thẻ, lồng tiếng AI và render MP4.
              </p>
            </div>
          ) : (
            <>
              {/* Batch Overview Summary Box */}
              <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{activeBatch.title}</h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      ID: {activeBatch.id} · Bắt đầu lúc {new Date(activeBatch.createdAt).toLocaleTimeString('vi-VN')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-center">
                      <div className="text-slate-400 text-[10px]">TỔNG SỐ</div>
                      <div className="font-bold text-slate-200">{activeBatch.totalItems}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-400 text-[10px]">HOÀN THÀNH</div>
                      <div className="font-bold text-emerald-400">{activeBatch.completedItems}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 text-[10px]">THẤT BÀI</div>
                      <div className="font-bold text-red-400">{activeBatch.failedItems}</div>
                    </div>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="w-full bg-[#152542] rounded-full h-2 overflow-hidden border border-[#1e3458]">
                  <div 
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-full transition-all duration-300"
                    style={{ width: `${Math.round(((activeBatch.completedItems + activeBatch.failedItems) / Math.max(1, activeBatch.totalItems)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
                  <span>Danh sách bài viết trong mẻ ({activeBatch.items?.length || 0})</span>
                  <span>Trạng thái sản xuất</span>
                </div>

                {activeBatch.items?.map((item, idx) => {
                  const isItemDone = item.status === 'completed';
                  const isItemFailed = item.status === 'failed';
                  const isItemRunning = ['scraping', 'screenshotting', 'voicing', 'rendering'].includes(item.status);

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isItemDone
                          ? 'bg-[#0f1f33] border-emerald-500/30'
                          : isItemFailed
                          ? 'bg-[#1f1017] border-red-500/30'
                          : isItemRunning
                          ? 'bg-[#0d1c33] border-blue-500/40 shadow-sm'
                          : 'bg-[#0b162a] border-[#182b4a]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-[#162744] text-[10px] font-mono font-bold flex items-center justify-center text-slate-300 shrink-0">
                            #{idx + 1}
                          </span>
                          <a
                            href={item.threadsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-slate-200 hover:text-cyan-400 truncate max-w-[280px] sm:max-w-[420px] font-mono flex items-center gap-1.5 transition"
                            title={item.threadsUrl}
                          >
                            <span>{item.threadsUrl}</span>
                            <ExternalLink size={11} className="text-slate-500 shrink-0" />
                          </a>
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {isItemDone && item.outputVideoUrl && (
                            <>
                              <button
                                onClick={() => onOpenVideoModal?.(item.outputVideoUrl!, `Video Threads #${idx + 1}`)}
                                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                              >
                                <Play size={12} className="fill-emerald-400" />
                                <span>Xem video</span>
                              </button>
                              <a
                                href={item.outputVideoUrl}
                                download={`threads_video_${idx + 1}.mp4`}
                                className="p-1 hover:bg-[#162846] text-slate-400 hover:text-slate-200 rounded transition"
                                title="Tải video MP4"
                              >
                                <Download size={14} />
                              </a>
                            </>
                          )}

                          {item.projectId && onSelectProject && (
                            <button
                              onClick={() => {
                                onSelectProject(item.projectId!);
                                onOpenStudio?.();
                              }}
                              className="px-2 py-1 bg-[#13233f] hover:bg-[#1a3057] border border-[#223d6a] text-blue-300 rounded-lg text-[11px] font-medium transition cursor-pointer"
                              title="Chỉnh sửa chi tiết trong Studio"
                            >
                              Mở Studio
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step Details & Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-medium ${
                            isItemDone ? 'text-emerald-400' :
                            isItemFailed ? 'text-red-400' :
                            isItemRunning ? 'text-blue-300' :
                            'text-slate-400'
                          }`}>
                            {item.currentStep}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.progress}%
                          </span>
                        </div>

                        <div className="w-full bg-[#13233d] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              isItemDone ? 'bg-emerald-500' :
                              isItemFailed ? 'bg-red-500' :
                              'bg-gradient-to-r from-blue-500 to-cyan-400'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>

                        {item.error && (
                          <p className="text-[10px] text-red-400 font-mono mt-1">
                            Lỗi: {item.error}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Batches History Selector */}
              {batches.length > 1 && (
                <div className="pt-4 border-t border-[#182b47]">
                  <h5 className="text-xs font-bold text-slate-300 mb-2">Lịch sử các mẻ chạy khác</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {batches.filter(b => b.id !== activeBatch.id).map(b => (
                      <div 
                        key={b.id}
                        onClick={() => setActiveBatch(b)}
                        className="p-2.5 bg-[#0d182b] hover:bg-[#12223d] border border-[#1b3154] rounded-xl cursor-pointer transition flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-200 truncate">{b.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {b.completedItems}/{b.totalItems} video · {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBatch(b.id);
                          }}
                          className="p-1 hover:text-red-400 text-slate-500 transition"
                          title="Xóa mẻ này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
