import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Volume2, 
  FolderOpen, 
  Clipboard, 
  RotateCcw, 
  Camera, 
  Sparkles, 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Terminal,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Check,
  RefreshCw,
  Wand2,
  Film,
  Phone,
  Video,
  ImagePlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Project, ThreadComment, VideoConfig, StudioTemplate, WatermarkConfig, VideoEffectsConfig, SubtitleStyleConfig, ScriptScene, AudioItem } from '../types';
import { api } from '../services/api';
import { TimelineEditor } from '../components/TimelineEditor';

interface StudioViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenResultsModal: () => void;
}

export const StudioView: React.FC<StudioViewProps> = ({
  project,
  onUpdateProject,
  onOpenResultsModal
}) => {
  const defaultCardPos = {
    x: 50.0,
    y: 38.0,
    scale: 100.0,
    borderRadius: 20,
    bgStyle: 'white' as const
  };

  const defaultSubVideoPos = {
    enabled: true,
    x: 50.0,
    y: 65.0,
    scale: 110.0,
    borderRadius: 16,
    folder: '',
    mute: true,
    loop: true,
    layoutMode: 'fullscreen' as const
  };

  // Local active form state
  const [threadsUrl, setThreadsUrl] = useState(project.threadsUrl || '');
  const [maskAuthor, setMaskAuthor] = useState(project.config?.maskAuthor ?? false);
  const [reviewBeforeExport, setReviewBeforeExport] = useState(project.config?.reviewBeforeExport ?? true);
  const [previewVoice, setPreviewVoice] = useState(project.config?.tts?.previewVoice || 'VieNeu - Ngọc Huyền (Nữ miền Bắc)');
  const [voiceSpeed, setVoiceSpeed] = useState(project.config?.tts?.speed ?? 1.20);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedVoices, setSelectedVoices] = useState<string[]>(project.config?.tts?.selectedVoices || ['VieNeu - Ngọc Huyền (Nữ miền Bắc)']);
  const [voiceMode, setVoiceMode] = useState(project.config?.tts?.randomVoiceMode || 'random');
  const [commentCount, setCommentCount] = useState(project.config?.commentCount || 5);
  const [commentFilterMode, setCommentFilterMode] = useState(project.config?.commentFilterMode || 'most_likes');

  // Folders & audio
  const [bgVideoFolder, setBgVideoFolder] = useState(project.config?.backgroundVideoFolder || '');
  const [subVideoEnabled, setSubVideoEnabled] = useState(project.config?.subVideoPosition?.enabled ?? true);
  const [subVideoFolder, setSubVideoFolder] = useState(project.config?.subVideoPosition?.folder || '');
  const [bgMusicFolder, setBgMusicFolder] = useState(project.config?.backgroundMusic?.folder || '');
  const [bgMusicVolume, setBgMusicVolume] = useState(project.config?.backgroundMusic?.volume ?? 20);

  // Folder & File real-time scan statuses
  const [bgVideoInfo, setBgVideoInfo] = useState<{ checked: boolean; exists: boolean; count: number; isFile?: boolean }>({ checked: false, exists: false, count: 0, isFile: false });
  const [subVideoInfo, setSubVideoInfo] = useState<{ checked: boolean; exists: boolean; count: number; isFile?: boolean }>({ checked: false, exists: false, count: 0, isFile: false });
  const [bgMusicInfo, setBgMusicInfo] = useState<{ checked: boolean; exists: boolean; count: number; isFile?: boolean }>({ checked: false, exists: false, count: 0, isFile: false });
  const [bgVideoLoadError, setBgVideoLoadError] = useState(false);
  const [subVideoLoadError, setSubVideoLoadError] = useState(false);

  // Position & sizing tabs: 'card' | 'subVideo'
  const [positionTab, setPositionTab] = useState<'card' | 'subVideo'>('card');
  const [cardPos, setCardPos] = useState({ ...defaultCardPos, ...(project.config?.cardPosition || {}) });
  const [subVideoPos, setSubVideoPos] = useState({ ...defaultSubVideoPos, ...(project.config?.subVideoPosition || {}) });

  // Preview selection: which comment to preview in canvas (-1 means original post)
  const [previewCommentIdx, setPreviewCommentIdx] = useState<number>(-1);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>(project.config?.aspectRatio || '9:16');

  // Live render state
  const [isRendering, setIsRendering] = useState(project.status === 'rendering');
  const [renderProgress, setRenderProgress] = useState(project.lastRenderJob?.progress || 0);
  const [renderStep, setRenderStep] = useState(project.lastRenderJob?.currentStep || 'Sẵn sàng');
  const [logs, setLogs] = useState<string[]>(project.lastRenderJob?.logs || [
    `[${new Date().toLocaleTimeString()}] Sẵn sàng xử lý bài viết Threads.`
  ]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [postContent, setPostContent] = useState(project.post?.content || '');

  // Phase 6 - Advanced Video Studio States
  const [showTimeline, setShowTimeline] = useState(true);
  const [timelineTime, setTimelineTime] = useState(0);
  const [templates, setTemplates] = useState<StudioTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(project.config.selectedTemplateId);
  const [watermark, setWatermark] = useState<WatermarkConfig>(project.config.watermark || {
    enabled: true,
    text: '@ThreadsStudio',
    position: 'top_right',
    opacity: 0.75,
    fontSize: 26
  });
  const [effects, setEffects] = useState<VideoEffectsConfig>(project.config.effects || {
    zoomPan: true,
    blurBackground: false,
    vignette: false,
    kenBurns: false
  });
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleConfig>(project.config.subtitleStyle || {
    enabled: true,
    fontSize: 40,
    primaryColor: '&H00FFFFFF',
    outlineColor: '&H00000000',
    position: 'middle'
  });
  const [audios, setAudios] = useState<AudioItem[]>([]);

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(() => {});
    api.getAudios(project.id).then(setAudios).catch(() => {});
  }, [project.id]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (isLogsExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isLogsExpanded]);

  // Real-time Folder Scanners
  useEffect(() => {
    setBgVideoLoadError(false);
    if (!bgVideoFolder) {
      setBgVideoInfo({ checked: true, exists: false, count: 0, isFile: false });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.scanFolder(bgVideoFolder);
        setBgVideoInfo({ checked: true, exists: res.exists, count: res.videoCount || 0, isFile: res.isFile });
      } catch {
        setBgVideoInfo({ checked: true, exists: false, count: 0, isFile: false });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [bgVideoFolder]);

  useEffect(() => {
    setSubVideoLoadError(false);
    if (!subVideoFolder) {
      setSubVideoInfo({ checked: true, exists: false, count: 0, isFile: false });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.scanFolder(subVideoFolder);
        setSubVideoInfo({ checked: true, exists: res.exists, count: res.videoCount || 0, isFile: res.isFile });
      } catch {
        setSubVideoInfo({ checked: true, exists: false, count: 0, isFile: false });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [subVideoFolder]);

  useEffect(() => {
    if (!bgMusicFolder) {
      setBgMusicInfo({ checked: true, exists: false, count: 0, isFile: false });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.scanFolder(bgMusicFolder);
        setBgMusicInfo({ checked: true, exists: res.exists, count: res.audioCount || 0, isFile: res.isFile });
      } catch {
        setBgMusicInfo({ checked: true, exists: false, count: 0, isFile: false });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [bgMusicFolder]);

  // Native Windows Folder & File Browser Handlers
  const handleBrowseBgVideo = async () => {
    try {
      const selected = await api.browseFolder(bgVideoFolder, 'Chọn thư mục chứa Video nền');
      if (selected) {
        setBgVideoFolder(selected);
      }
    } catch (err: any) {
      console.warn('Folder browse failed:', err);
    }
  };

  const handleBrowseBgVideoFile = async () => {
    try {
      const selected = await api.browseFile(bgVideoFolder, 'Chọn file Video nền', 'video');
      if (selected) {
        setBgVideoFolder(selected);
      }
    } catch (err: any) {
      console.warn('File browse failed:', err);
    }
  };

  const handleBrowseSubVideo = async () => {
    try {
      const selected = await api.browseFolder(subVideoFolder, 'Chọn thư mục chứa Video phụ (Meme / Gameplay / Satisfying)');
      if (selected) {
        setSubVideoFolder(selected);
      }
    } catch (err: any) {
      console.warn('Folder browse failed:', err);
    }
  };

  const handleBrowseSubVideoFile = async () => {
    try {
      const selected = await api.browseFile(subVideoFolder, 'Chọn file Video phụ (Meme / Gameplay)', 'video');
      if (selected) {
        setSubVideoFolder(selected);
      }
    } catch (err: any) {
      console.warn('File browse failed:', err);
    }
  };

  const handleBrowseBgMusic = async () => {
    try {
      const selected = await api.browseFolder(bgMusicFolder, 'Chọn thư mục chứa Nhạc nền');
      if (selected) {
        setBgMusicFolder(selected);
      }
    } catch (err: any) {
      console.warn('Folder browse failed:', err);
    }
  };

  const handleBrowseBgMusicFile = async () => {
    try {
      const selected = await api.browseFile(bgMusicFolder, 'Chọn file Nhạc nền (MP3 / WAV / M4A)', 'audio');
      if (selected) {
        setBgMusicFolder(selected);
      }
    } catch (err: any) {
      console.warn('File browse failed:', err);
    }
  };

  const handleUseSampleMedia = async () => {
    try {
      const samples = await api.getSampleMedia();
      if (samples.subVideo) {
        setSubVideoFolder(samples.subVideo);
        setSubVideoEnabled(true);
      }
      if (samples.backgroundVideo && !bgVideoFolder) {
        setBgVideoFolder(samples.backgroundVideo);
      }
      if (samples.backgroundMusic && !bgMusicFolder) {
        setBgMusicFolder(samples.backgroundMusic);
      }
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Đã nạp Video phụ & Video nền mẫu có sẵn`]);
    } catch (err: any) {
      console.warn('Failed to load sample media:', err);
    }
  };

  const handleAddPostMedia = async () => {
    const url = prompt('Nhập link ảnh hoặc URL meme cho thẻ bài viết (PNG, JPG, WebP):', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800');
    if (!url) return;
    const currentUrls = project.post?.mediaUrls || [];
    const newUrls = [...currentUrls, url.trim()];
    const updatedProject = {
      ...project,
      post: {
        ...project.post,
        mediaUrls: newUrls
      }
    };
    onUpdateProject(updatedProject);
    try {
      await api.updateProject(project.id, {
        post: { mediaUrls: newUrls }
      });
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Đã thêm ảnh vào thẻ bài viết`]);
    } catch (e) {
      console.warn('Failed to save media url to backend:', e);
    }
  };

  const handleRemovePostMedia = async (idxToRemove: number) => {
    const currentUrls = project.post?.mediaUrls || [];
    const newUrls = currentUrls.filter((_, i) => i !== idxToRemove);
    const updatedProject = {
      ...project,
      post: {
        ...project.post,
        mediaUrls: newUrls
      }
    };
    onUpdateProject(updatedProject);
    try {
      await api.updateProject(project.id, {
        post: { mediaUrls: newUrls }
      });
    } catch (e) {
      console.warn('Failed to save media url to backend:', e);
    }
  };

  // Sync state when project changes
  useEffect(() => {
    setThreadsUrl(project.threadsUrl);
    setMaskAuthor(project.config.maskAuthor);
    setReviewBeforeExport(project.config.reviewBeforeExport);
    setPreviewVoice(project.config.tts.previewVoice);
    setVoiceSpeed(project.config.tts.speed);
    setSelectedVoices(project.config.tts.selectedVoices || []);
    setVoiceMode(project.config.tts.randomVoiceMode);
    setCommentCount(project.config.commentCount);
    setCommentFilterMode(project.config.commentFilterMode);
    setBgVideoFolder(project.config.backgroundVideoFolder);
    setSubVideoEnabled(project.config.subVideoPosition.enabled);
    setSubVideoFolder(project.config.subVideoPosition.folder);
    setBgMusicFolder(project.config.backgroundMusic.folder);
    setBgMusicVolume(project.config.backgroundMusic.volume);
    setCardPos(project.config.cardPosition);
    setSubVideoPos({
      ...defaultSubVideoPos,
      ...(project.config.subVideoPosition || {}),
      layoutMode: project.config.subVideoPosition?.layoutMode || 'fullscreen'
    });
    setAspectRatio(project.config.aspectRatio);
    setPostContent(project.post.content);

    if (project.lastRenderJob) {
      setRenderProgress(project.lastRenderJob.progress);
      setRenderStep(project.lastRenderJob.currentStep);
      setLogs(project.lastRenderJob.logs);
      setIsRendering(project.lastRenderJob.status === 'rendering');
    }
  }, [project.id]);

  // Poll render status if currently rendering
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRendering) {
      timer = setInterval(async () => {
        try {
          const status = await api.getRenderStatus(project.id);
          if (status) {
            setRenderProgress(status.progress);
            setRenderStep(status.currentStep);
            setLogs(status.logs);

            if (status.status === 'completed') {
              setIsRendering(false);
              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
              const updated = await api.getProject(project.id);
              onUpdateProject(updated);
            } else if (status.status === 'failed') {
              setIsRendering(false);
            }
          }
        } catch (err) {
          console.error('Error polling render status', err);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRendering, project.id]);

  // Save changes to backend
  const saveConfig = async () => {
    const updatedConfig: VideoConfig = {
      ...project.config,
      aspectRatio,
      maskAuthor,
      reviewBeforeExport,
      commentCount,
      commentFilterMode,
      cardPosition: cardPos,
      subVideoPosition: {
        ...subVideoPos,
        enabled: subVideoEnabled,
        folder: subVideoFolder,
        layoutMode: subVideoPos.layoutMode || 'fullscreen'
      },
      backgroundVideoFolder: bgVideoFolder,
      backgroundMusic: {
        ...project.config.backgroundMusic,
        folder: bgMusicFolder,
        volume: bgMusicVolume
      },
      tts: {
        ...project.config.tts,
        previewVoice,
        speed: voiceSpeed,
        randomVoiceMode: voiceMode,
        selectedVoices
      },
      watermark,
      effects,
      subtitleStyle,
      selectedTemplateId
    };

    try {
      const updated = await api.updateProject(project.id, {
        config: updatedConfig,
        title: project.title
      });
      onUpdateProject(updated);
    } catch (err) {
      console.error('Error saving config', err);
    }
  };

  // Phase 6 - Apply Studio Template
  const handleApplyTemplate = async (tmpl: StudioTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setAspectRatio(tmpl.aspectRatio);
    setCardPos(tmpl.cardPosition);
    setSubVideoPos({
      ...defaultSubVideoPos,
      ...tmpl.subVideoPosition,
      folder: subVideoFolder,
      layoutMode: tmpl.subVideoPosition?.layoutMode || 'fullscreen'
    });
    setWatermark(tmpl.watermark);
    setEffects(tmpl.effects);
    setSubtitleStyle(tmpl.subtitleStyle);

    try {
      await api.applyTemplate(project.id, tmpl.id);
      const updated = await api.getProject(project.id);
      onUpdateProject(updated);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Đã áp dụng mẫu video: ${tmpl.name}`]);
    } catch (e: any) {
      console.warn('Apply template error:', e);
    }
  };

  // Paste from clipboard
  const handlePasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.includes('threads.net')) {
        setThreadsUrl(text);
        handleFetchData(text);
      }
    } catch {
      // fallback
    }
  };

  // Fetch thread data
  const handleFetchData = async (targetUrl?: string) => {
    const urlToFetch = targetUrl || threadsUrl;
    if (!urlToFetch) return;
    setIsFetchingUrl(true);
    try {
      const updated = await api.fetchThread(project.id, urlToFetch);
      onUpdateProject(updated);
      setPostContent(updated.post.content);
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Đã thu thập thành công bài viết và ${updated.comments.length} bình luận từ Threads!`
      ]);
    } catch (err: any) {
      alert('Không thể lấy dữ liệu: ' + err.message);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Preview Speech synthesis using active TTS backend (Edge / Piper / Google), falling back to Web Speech
  const handlePreviewVoice = async () => {
    setIsPlayingAudio(true);
    try {
      const res = await api.previewVoice({
        voiceName: previewVoice,
        speed: voiceSpeed,
        text: 'Xin chào, đây là giọng đọc thử nghiệm trong Threads Content Studio.'
      });

      if (res && res.audioUrl) {
        if (audioPreviewRef.current) {
          audioPreviewRef.current.pause();
        }
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Đang phát thử giọng: ${previewVoice} (${res.provider || 'Neural TTS'})`]);
        const audio = new Audio(res.audioUrl);
        audioPreviewRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('Backend TTS preview failed, using Web Speech API fallback:', err);
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Xin chào, đây là giọng đọc thử nghiệm trong Threads Content Studio.');
      utterance.rate = voiceSpeed;
      utterance.lang = 'vi-VN';
      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Đang phát thử bằng Web Speech API`]);
      };
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingAudio(false), 2000);
    }
  };

  // Toggle voice selection in multi-voice list
  const toggleVoiceSelection = (vName: string) => {
    let next: string[];
    if (selectedVoices.includes(vName)) {
      if (selectedVoices.length === 1) return; // Keep at least one
      next = selectedVoices.filter(v => v !== vName);
    } else {
      next = [...selectedVoices, vName];
    }
    setSelectedVoices(next);
  };

  // Start Render Video
  const handleStartRender = async () => {
    await saveConfig();
    setIsRendering(true);
    setRenderProgress(5);
    setRenderStep('Đang khởi động tiến trình render...');
    try {
      const job = await api.startRender(project.id);
      setLogs(job.logs);
    } catch (err: any) {
      alert('Lỗi khởi động render: ' + err.message);
      setIsRendering(false);
    }
  };

  // Stop Render
  const handleStopRender = async () => {
    try {
      await api.stopRender(project.id);
      setIsRendering(false);
      setRenderStep('Đã dừng');
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Tiến trình đã bị hủy.`]);
    } catch (err) {
      console.error(err);
    }
  };

  // Capture Test Snapshot
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const handleCaptureTestSnapshot = async () => {
    setIsCapturingSnapshot(true);
    try {
      const res = await api.renderPostScreenshot(project.id, {
        aspectRatio,
        theme: cardPos.bgStyle === 'dark' ? 'dark' : 'light'
      });
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Đã chụp thử ảnh thẻ bài viết: ${res.fileUrl}`]);
      alert(`Đã chụp thử ảnh thẻ thành công!\nFile: ${res.fileUrl}\nBạn có thể vào tab "Ảnh chụp thẻ" trên menu bên trái để tải về hoặc xem chi tiết.`);
    } catch (err: any) {
      alert('Lỗi chụp ảnh: ' + err.message);
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  // Reset Position
  const handleResetPosition = () => {
    if (positionTab === 'card') {
      setCardPos({
        x: 50.0,
        y: 38.0,
        scale: 100.0,
        borderRadius: 20,
        bgStyle: 'white'
      });
    } else {
      setSubVideoPos({
        enabled: true,
        x: 50.0,
        y: 65.0,
        scale: 110.0,
        borderRadius: 16,
        folder: '',
        mute: true,
        loop: true,
        layoutMode: 'fullscreen'
      });
    }
  };

  // Selected display card item (either post or a comment)
  const isViewingPost = previewCommentIdx === -1;
  const currentComment = previewCommentIdx >= 0 ? project.comments[previewCommentIdx] : null;

  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden bg-[#070d19]">
      {/* ================= LEFT CONTROLS PANEL ================= */}
      <div className="w-full xl:w-[500px] 2xl:w-[540px] border-r border-[#192b47] flex flex-col h-full bg-[#091222] shrink-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Phase 6: Quick Templates Bar */}
          {templates.length > 0 && (
            <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Wand2 size={13} className="text-amber-400" />
                  <span>Mẫu video có sẵn (Studio Presets)</span>
                </span>
                <span className="text-[10px] text-blue-400 font-mono">Phase 6</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {templates.map(tmpl => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => handleApplyTemplate(tmpl)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm'
                          : 'border-[#1b3154] bg-[#14233e] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[11px] font-bold truncate">{tmpl.name}</span>
                        <span className="text-[9px] px-1 rounded bg-black/40 text-blue-300 font-mono">
                          {tmpl.aspectRatio}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{tmpl.tag}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card 1: Nội dung */}
          <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center justify-between">
              <span>Nội dung</span>
              <span className="text-[11px] font-normal text-slate-400">URL bài viết Threads</span>
            </h3>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={threadsUrl}
                  onChange={(e) => setThreadsUrl(e.target.value)}
                  placeholder="https://www.threads.net/@user/post/..."
                  className="flex-1 bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={handlePasteLink}
                  className="bg-[#1b2f52] hover:bg-[#233d6b] text-blue-300 px-3 py-2 rounded-xl text-xs font-semibold border border-[#254370] transition flex items-center gap-1.5 shrink-0"
                >
                  <Clipboard size={13} />
                  <span>Dán link</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleFetchData()}
                    disabled={isFetchingUrl}
                    className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
                  >
                    <RefreshCw size={12} className={isFetchingUrl ? 'animate-spin' : ''} />
                    <span>{isFetchingUrl ? 'Đang lấy dữ liệu...' : 'Lấy dữ liệu'}</span>
                  </button>
                  <span className="text-slate-600">·</span>
                  <button 
                    onClick={() => setIsEditingContent(!isEditingContent)}
                    className="text-slate-400 hover:text-slate-200 transition"
                  >
                    {isEditingContent ? 'Đóng soạn thảo' : 'Nhập nội dung'}
                  </button>
                </div>

                <button 
                  onClick={() => alert('Đăng nhập Threads: Có thể dùng Cookie hoặc API Graph chính thức.')}
                  className="text-slate-400 hover:text-slate-300 text-[11px] transition"
                >
                  Đăng nhập Threads
                </button>
              </div>

              {/* Editable Content Accordion */}
              {isEditingContent && (
                <div className="pt-2">
                  <textarea
                    rows={3}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full bg-[#13223b] border border-[#233e69] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
                    placeholder="Chỉnh sửa hoặc dán trực tiếp nội dung bài viết..."
                  />
                </div>
              )}

              {/* Options Checkboxes */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={maskAuthor}
                    onChange={(e) => setMaskAuthor(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-[#172744] border-[#253f68] text-blue-600 focus:ring-0"
                  />
                  <span>Che tên</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reviewBeforeExport}
                    onChange={(e) => setReviewBeforeExport(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-[#172744] border-[#253f68] text-blue-600 focus:ring-0"
                  />
                  <span>Duyệt nội dung trước khi xuất</span>
                </label>
              </div>
            </div>
          </div>

          

          {/* Card 2: Giọng Việt */}
          <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center justify-between">
              <span>Giọng Việt</span>
              <span className="text-[11px] text-blue-400 font-mono">TTS Cục bộ</span>
            </h3>

            <div className="space-y-3">
              {/* Voice selector and speed */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-8">
                  <label className="block text-[11px] text-slate-400 mb-1">Giọng nghe thử</label>
                  <select
                    value={previewVoice}
                    onChange={(e) => setPreviewVoice(e.target.value)}
                    className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="VieNeu - Ngọc Huyền (Nữ miền Bắc)">VieNeu - Ngọc Huyền (Nữ miền Bắc)</option>
                    <option value="VieNeu - Thiện Minh (Nam miền Bắc)">VieNeu - Thiện Minh (Nam miền Bắc)</option>
                    <option value="VieNeu - Hải Đăng (Nam miền Nam)">VieNeu - Hải Đăng (Nam miền Nam)</option>
                    <option value="TikTok Việt 1 (Nữ viral)">TikTok Việt 1 (Nữ viral)</option>
                    <option value="TikTok Việt 2 (Nam vui vẻ)">TikTok Việt 2 (Nam vui vẻ)</option>
                    <option value="Adam bựa - VieNeu">Adam bựa - VieNeu</option>
                    <option value="VieNeu - Mai Linh (Nữ miền Trung)">VieNeu - Mai Linh (Nữ miền Trung)</option>
                  </select>
                </div>

                <div className="col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">Tốc độ</label>
                  <div className="flex items-center bg-[#152542] border border-[#213b63] rounded-xl px-2 py-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="2.5"
                      value={voiceSpeed}
                      onChange={(e) => setVoiceSpeed(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-transparent text-xs text-slate-100 focus:outline-none text-center font-mono"
                    />
                    <span className="text-[11px] text-slate-400 pr-1">x</span>
                  </div>
                </div>
              </div>

              {/* Nghe thử Button */}
              <div>
                <button
                  onClick={handlePreviewVoice}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 ${
                    isPlayingAudio
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 animate-pulse'
                      : 'bg-[#182a47] hover:bg-[#20365b] border-[#25416d] text-slate-200'
                  }`}
                >
                  <Volume2 size={14} className={isPlayingAudio ? 'animate-bounce text-blue-400' : 'text-slate-400'} />
                  <span>{isPlayingAudio ? 'Đang phát âm thanh...' : 'Nghe thử'}</span>
                </button>
              </div>

              {/* Multi-voice checkbox list */}
              <div className="pt-2 border-t border-[#182b47]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-300 font-medium">Giọng trong video</span>
                  <select
                    value={voiceMode}
                    onChange={(e: any) => setVoiceMode(e.target.value)}
                    className="bg-[#152542] border border-[#213b63] rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="random">Ngẫu nhiên</option>
                    <option value="alternate">Luân phiên</option>
                    <option value="fixed">Cố định</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
                    'VieNeu - Thiện Minh (Nam miền Bắc)',
                    'VieNeu - Hải Đăng (Nam miền Nam)',
                    'TikTok Việt 1 (Nữ viral)',
                    'TikTok Việt 2 (Nam vui vẻ)',
                    'Adam bựa - VieNeu',
                    'VieNeu - Mai Linh (Nữ miền Trung)'
                  ].map(vName => {
                    const isChecked = selectedVoices.includes(vName);
                    return (
                      <label 
                        key={vName}
                        onClick={() => toggleVoiceSelection(vName)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer select-none transition ${
                          isChecked 
                            ? 'bg-blue-600/15 border-blue-500/40 text-blue-200' 
                            : 'bg-[#122038] border-[#1d3356] text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded bg-[#172744] border-[#253f68] text-blue-600 focus:ring-0"
                        />
                        <span className="truncate text-[11px] font-medium">{vName.replace('VieNeu - ', '')}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono">
                  {selectedVoices.length} giọng · Microsoft Edge Neural & Piper TTS
                </p>
              </div>
            </div>
          </div>

          

          {/* Card 3: Bình luận */}
          <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center justify-between">
              <span>Bình luận</span>
              <span className="text-[11px] text-slate-400 font-mono">Tổng: {project.comments.length}</span>
            </h3>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <label className="block text-[11px] text-slate-400 mb-1">Số bình luận</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={commentCount}
                  onChange={(e) => setCommentCount(parseInt(e.target.value) || 5)}
                  className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 text-center font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="col-span-8">
                <label className="block text-[11px] text-slate-400 mb-1">Chế độ lấy bình luận</label>
                <select
                  value={commentFilterMode}
                  onChange={(e: any) => setCommentFilterMode(e.target.value)}
                  className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="most_likes">Nhiều tim - gồm tác giả</option>
                  <option value="latest">Mới nhất</option>
                  <option value="ai_curated">Chọn lọc AI nổi bật</option>
                  <option value="random">Ngẫu nhiên</option>
                </select>
              </div>
            </div>

            {/* Quick Comment List Selector */}
            <div className="mt-3 pt-3 border-t border-[#182b47]">
              <span className="text-[11px] text-slate-400 block mb-1.5">Xem trước thẻ hiển thị trên video:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setPreviewCommentIdx(-1)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    previewCommentIdx === -1
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-[#152542] text-slate-300 hover:bg-[#1b2f52]'
                  }`}
                >
                  Bài viết gốc
                </button>
                {project.comments.slice(0, commentCount).map((c, idx) => (
                  <button
                    key={c.id}
                    onClick={() => setPreviewCommentIdx(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      previewCommentIdx === idx
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-[#152542] text-slate-300 hover:bg-[#1b2f52]'
                    }`}
                  >
                    Bình luận #{idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          

          {/* Card 4: Video & âm thanh */}
          <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-100 mb-2 flex items-center justify-between">
              <span>Video & âm thanh</span>
              <span className="text-[10px] text-slate-400 font-normal">Tự động lặp & căn chỉnh</span>
            </h3>

            {/* Video minh họa (Gameplay / Minecraft / Satisfying) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={subVideoEnabled}
                    onChange={(e) => setSubVideoEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-[#172744] border-[#253f68] text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Video phụ minh họa (Gameplay Minecraft / Satisfying)</span>
                </label>
                {subVideoEnabled && (
                  <span className="text-[10px] font-mono font-medium text-emerald-400">
                    ✓ Bật (Chạy nền dọc 100%)
                  </span>
                )}
              </div>

              {subVideoEnabled ? (
                <div className="space-y-2 mt-1.5 pl-5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subVideoFolder || bgVideoFolder}
                      placeholder="Chọn thư mục hoặc file video (D:/TOOL/NGUỒN...)..."
                      onChange={(e) => {
                        setSubVideoFolder(e.target.value);
                        setBgVideoFolder(e.target.value);
                      }}
                      className="flex-1 bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono truncate focus:outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={handleBrowseSubVideoFile}
                      className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Chọn 1 file video cụ thể (.mp4, .mov, .mkv)"
                    >
                      <Film size={13} className="text-cyan-400" />
                      <span>Chọn file</span>
                    </button>
                    <button 
                      onClick={handleBrowseSubVideo}
                      className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Mở hộp thoại chọn thư mục Windows"
                    >
                      <FolderOpen size={13} className="text-cyan-400" />
                      <span>Chọn thư mục</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUseSampleMedia}
                      className="bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-cyan-500/40 transition shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Sử dụng video mẫu có sẵn"
                    >
                      <Sparkles size={12} className="text-cyan-400" />
                      <span>Dùng mẫu</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Tắt tiếng · Tự lặp · Chiếm 100% màn hình dọc phía sau thẻ</span>
                    {(subVideoInfo.exists || bgVideoInfo.exists) && (
                      <span className="text-emerald-400 font-medium">✓ Đã nhận diện video</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 pl-5 mt-1">Đã tắt video phụ. Video sẽ xuất trên nền màu tối sang trọng.</p>
              )}
            </div>

            {/* Nhạc nền & âm lượng */}
            <div className="pt-2 border-t border-[#182b47]">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] text-slate-400">Thư mục hoặc file nhạc nền</label>
                {bgMusicInfo.checked && (
                  <span className={`text-[10px] font-mono font-medium ${bgMusicInfo.exists && (bgMusicInfo.count > 0 || bgMusicInfo.isFile) ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {bgMusicInfo.exists ? (bgMusicInfo.isFile ? '✓ File nhạc nền' : `✓ ${bgMusicInfo.count} bài nhạc`) : '⚠ Chưa thấy file nhạc'}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={bgMusicFolder}
                  placeholder="Chọn thư mục hoặc file nhạc nền (.mp3, .wav)..."
                  onChange={(e) => setBgMusicFolder(e.target.value)}
                  className="flex-1 bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono truncate focus:outline-none focus:border-blue-500"
                />
                <button 
                  onClick={handleBrowseBgMusicFile}
                  className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Chọn 1 file nhạc nền cụ thể (.mp3, .wav)"
                >
                  <Volume2 size={13} className="text-purple-400" />
                  <span>Chọn file</span>
                </button>
                <button 
                  onClick={handleBrowseBgMusic}
                  className="bg-[#1b2f52] hover:bg-[#233d6b] text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#254370] transition shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Mở hộp thoại chọn thư mục Windows"
                >
                  <FolderOpen size={13} className="text-purple-400" />
                  <span>Chọn thư mục</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="text-[11px] text-slate-400">Âm lượng nhạc: {bgMusicVolume}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bgMusicVolume}
                  onChange={(e) => setBgMusicVolume(parseInt(e.target.value))}
                  className="w-32 cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Hiệu ứng, Watermark & Phụ đề (Phase 6) */}
          <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span>Hiệu ứng & Watermark</span>
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full font-mono">
                Phase 6
              </span>
            </h3>

            {/* Watermark Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watermark.enabled}
                    onChange={(e) => setWatermark({ ...watermark, enabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                  />
                  <span>Bật Watermark kênh</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Độ mờ: {Math.round(watermark.opacity * 100)}%</span>
              </div>

              {watermark.enabled && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={watermark.text}
                      onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                      placeholder="@TenKenhCuaBan"
                      className="flex-1 bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                    />
                    <select
                      value={watermark.position}
                      onChange={(e) => setWatermark({ ...watermark, position: e.target.value as any })}
                      className="bg-[#152542] border border-[#213b63] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="top_center">Chính giữa phía trên (Top Center)</option>
                      <option value="top_right">Góc phải trên</option>
                      <option value="top_left">Góc trái trên</option>
                      <option value="bottom_right">Góc phải dưới</option>
                      <option value="bottom_left">Góc trái dưới</option>
                    </select>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={Math.round(watermark.opacity * 100)}
                    onChange={(e) => setWatermark({ ...watermark, opacity: parseInt(e.target.value) / 100 })}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Effects Section */}
            <div className="pt-2 border-t border-[#182b47] space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Hiệu ứng hình ảnh video</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 bg-[#13223d] rounded-xl border border-[#1b3154] cursor-pointer hover:border-slate-500 transition">
                  <input
                    type="checkbox"
                    checked={effects.vignette}
                    onChange={(e) => setEffects({ ...effects, vignette: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-blue-600"
                  />
                  <span className="text-[11px] text-slate-200">Viền tối điện ảnh</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#13223d] rounded-xl border border-[#1b3154] cursor-pointer hover:border-slate-500 transition">
                  <input
                    type="checkbox"
                    checked={effects.zoomPan}
                    onChange={(e) => setEffects({ ...effects, zoomPan: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-blue-600"
                  />
                  <span className="text-[11px] text-slate-200">Zoom/Pan động</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#13223d] rounded-xl border border-[#1b3154] cursor-pointer hover:border-slate-500 transition col-span-2">
                  <input
                    type="checkbox"
                    checked={effects.blurBackground}
                    onChange={(e) => setEffects({ ...effects, blurBackground: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-blue-600"
                  />
                  <span className="text-[11px] text-slate-200">Làm mờ hậu cảnh (Blur Background)</span>
                </label>
              </div>
            </div>

            {/* Subtitles Style Section */}
            <div className="pt-2 border-t border-[#182b47] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">Kiểu hiển thị phụ đề</span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subtitleStyle.enabled}
                    onChange={(e) => setSubtitleStyle({ ...subtitleStyle, enabled: e.target.checked })}
                    className="w-3 h-3 rounded accent-blue-600"
                  />
                  <span>Bật phụ đề</span>
                </label>
              </div>

              {subtitleStyle.enabled && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Vị trí phụ đề</label>
                    <select
                      value={subtitleStyle.position}
                      onChange={(e) => setSubtitleStyle({ ...subtitleStyle, position: e.target.value as any })}
                      className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="middle">Giữa màn hình (TikTok)</option>
                      <option value="bottom">Dưới đáy (YouTube)</option>
                      <option value="top">Trên đỉnh</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Màu chữ phụ đề</label>
                    <select
                      value={subtitleStyle.primaryColor}
                      onChange={(e) => setSubtitleStyle({ ...subtitleStyle, primaryColor: e.target.value })}
                      className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="&H00FFFFFF">Trắng viền đen</option>
                      <option value="&H0000FFFF">Vàng viền đen</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Collapsible Bottom Log Bar */}
        <div className="border-t border-[#192b47] bg-[#0a1424]">
          <div 
            onClick={() => setIsLogsExpanded(!isLogsExpanded)}
            className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-[#0e1c31] transition select-none"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Terminal size={14} className="text-blue-400" />
              <span>Nhật ký xử lý</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
                {logs.length} dòng
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-blue-400">
              <span>{isLogsExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
              {isLogsExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
          </div>

          {isLogsExpanded && (
            <div className="h-40 bg-[#060b14] p-3 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 border-t border-[#152540]">
              {logs.map((line, idx) => (
                <div key={idx} className="leading-relaxed hover:bg-white/5 px-1 rounded">
                  {line}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT PREVIEW & POSITIONING PANEL ================= */}
      <div className="flex-1 flex flex-col h-full bg-[#070d19] overflow-y-auto">
        <div className="p-4 flex-1 flex flex-col lg:flex-row gap-6 items-start justify-center">

          {/* Interactive Phone Mockup Canvas */}
          <div className="flex flex-col items-center">
            {/* Header info */}
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">Xem trước</span>
                <span className="text-[11px] font-mono text-slate-400 px-1.5 py-0.5 bg-[#0f1b30] rounded border border-[#1b3154]">
                  {aspectRatio} - 1080p
                </span>
              </div>

              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-1 bg-[#0f1b30] p-0.5 rounded-lg border border-[#1b3154]">
                {(['9:16', '16:9', '1:1'] as const).map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
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

            {/* Video Canvas Container */}
            <div 
              className={`relative overflow-hidden rounded-2xl border-2 border-[#1f3860] shadow-2xl bg-slate-950 bg-grid-pattern transition-all ${
                aspectRatio === '9:16'
                  ? 'w-[320px] h-[570px] sm:w-[360px] sm:h-[640px]'
                  : aspectRatio === '16:9'
                  ? 'w-[560px] h-[315px]'
                  : 'w-[420px] h-[420px]'
              }`}
            >
              {/* Background Video Preview (Gameplay / Minecraft / Satisfying) */}
              {subVideoEnabled && (
                (subVideoFolder || bgVideoFolder) ? (
                  <video
                    key={subVideoFolder || bgVideoFolder}
                    src={`/api/media/stream-local?folder=${encodeURIComponent(subVideoFolder || bgVideoFolder)}&type=video`}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={() => setSubVideoLoadError(true)}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
                    style={{
                      filter: `${effects.blurBackground ? 'blur(6px)' : 'none'} ${effects.vignette ? 'brightness(0.7)' : 'brightness(0.85)'}`
                    }}
                  />
                ) : (
                  <video
                    src="/api/media/stream-local?folder=storage%2Fsample_media%2Fvideos&type=video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 brightness-75"
                  />
                )
              )}
              {/* Subtle ambient contrast overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45 pointer-events-none z-[1]" />

              {/* 1. Dynamic Threads Card (Post or Comment) */}
              <div
                onClick={() => setPositionTab('card')}
                style={{
                  position: 'absolute',
                  left: `${cardPos.x}%`,
                  top: `${cardPos.y}%`,
                  transform: `translate(-50%, -50%) scale(${cardPos.scale / 100})`,
                  borderRadius: `${cardPos.borderRadius}px`,
                  backgroundColor: 
                    cardPos.bgStyle === 'white' 
                      ? '#ffffff' 
                      : cardPos.bgStyle === 'dark' 
                      ? '#101728' 
                      : 'rgba(15, 23, 42, 0.75)',
                  color: cardPos.bgStyle === 'white' ? '#0f172a' : '#f8fafc',
                  backdropFilter: cardPos.bgStyle === 'transparent' ? 'blur(12px)' : 'none',
                  border: cardPos.bgStyle === 'white' ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid #1e3356'
                }}
                className={`w-[88%] p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] transition-all duration-150 select-none cursor-pointer z-20 ${
                  positionTab === 'card' ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950' : ''
                }`}
              >
                {/* Header: iOS Chat / Threads Hybrid Bar */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100/80">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold text-sm select-none mr-0.5 hover:text-slate-600 transition">‹</span>
                    <img 
                      src={isViewingPost ? project.post.avatar : currentComment?.avatar} 
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-slate-200/80 object-cover shadow-sm ring-1 ring-slate-100" 
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs">
                          {maskAuthor 
                            ? 'Người dùng ẩn danh' 
                            : (isViewingPost ? project.post.displayName : currentComment?.displayName)}
                        </span>
                        {project.post.verified && !maskAuthor && (
                          <div className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] opacity-60">
                        {maskAuthor ? '@anonymous' : `@${isViewingPost ? project.post.username : currentComment?.username}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Phone size={13} className="hover:text-blue-500 transition cursor-pointer" />
                    <Video size={14} className="hover:text-blue-500 transition cursor-pointer" />
                  </div>
                </div>

                {/* Content */}
                <div className="text-xs leading-relaxed mb-2.5 font-medium">
                  {isViewingPost ? postContent : currentComment?.content}
                </div>

                {/* Media attachments inside Card */}
                {isViewingPost && project.post?.mediaUrls && project.post.mediaUrls.length > 0 && (
                  <div className="space-y-1.5 my-2">
                    {project.post.mediaUrls.map((url, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200/80 shadow-sm">
                        <img src={url} alt="Card media" className="w-full max-h-48 object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemovePostMedia(i); }}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Xóa ảnh"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Add Media Button inside Card */}
                {isViewingPost && (
                  <div className="flex justify-end mb-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleAddPostMedia(); }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <ImagePlus size={11} />
                      <span>+ Thêm ảnh / meme vào thẻ</span>
                    </button>
                  </div>
                )}

                {/* Interactive Threads Reactions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 text-[11px] opacity-80">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 hover:text-red-500 transition cursor-pointer">
                      <Heart size={13} className="text-red-500 fill-red-500" />
                      <span>{isViewingPost ? project.post.likes.toLocaleString() : currentComment?.likes.toLocaleString()}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={13} />
                      <span>{isViewingPost ? project.post.repliesCount : 12}</span>
                    </span>
                    <Repeat2 size={13} />
                    <Send size={13} />
                  </div>
                  <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">
                    Threads
                  </span>
                </div>
              </div>

              {/* 2. Secondary Video (PIP Box) ONLY when layoutMode is 'pip' */}
              {subVideoEnabled && subVideoPos.layoutMode === 'pip' && (
                <div
                  onClick={() => setPositionTab('subVideo')}
                  style={{
                    position: 'absolute',
                    left: `${subVideoPos.x}%`,
                    top: `${subVideoPos.y}%`,
                    transform: `translate(-50%, -50%) scale(${subVideoPos.scale / 100})`,
                    borderRadius: `${subVideoPos.borderRadius}px`
                  }}
                  className={`w-[78%] h-36 bg-slate-900 shadow-2xl overflow-hidden flex flex-col items-center justify-center z-10 group cursor-pointer transition-all duration-150 ${
                    positionTab === 'subVideo' ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : 'border border-cyan-500/40'
                  }`}
                >
                  <video
                    key={subVideoFolder || 'default-pip'}
                    src={subVideoFolder ? `/api/media/stream-local?folder=${encodeURIComponent(subVideoFolder)}&type=video` : '/api/media/stream-local?folder=storage%2Fsample_media%2Fvideos&type=video'}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <span className="absolute top-1.5 right-1.5 text-[9px] bg-black/75 text-cyan-300 px-1.5 py-0.5 rounded font-mono border border-cyan-500/30">
                    Video phụ ({subVideoPos.scale}%)
                  </span>
                </div>
              )}

              {/* 3. Live Watermark Preview */}
              {watermark.enabled && watermark.text && (
                <div 
                  style={{ opacity: watermark.opacity }}
                  className={`absolute z-30 font-bold pointer-events-none drop-shadow-md font-mono ${
                    watermark.position === 'top_center'
                      ? 'top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-black/65 rounded-full border border-yellow-400/40 text-yellow-300 font-black shadow-xl tracking-wide flex items-center gap-1.5 text-xs'
                      : watermark.position === 'top_left'
                      ? 'top-3 left-3 text-white text-[11px]'
                      : watermark.position === 'bottom_left'
                      ? 'bottom-8 left-3 text-white text-[11px]'
                      : watermark.position === 'bottom_right'
                      ? 'bottom-8 right-3 text-white text-[11px]'
                      : 'top-3 right-3 text-white text-[11px]'
                  }`}
                >
                  {watermark.text}
                </div>
              )}

              {/* 4. Live Subtitle Preview */}
              {subtitleStyle.enabled && (
                <div 
                  className={`absolute inset-x-3 z-30 pointer-events-none flex justify-center text-center ${
                    subtitleStyle.position === 'top' ? 'top-14' :
                    subtitleStyle.position === 'middle' ? 'top-1/2 -translate-y-1/2' :
                    'bottom-10'
                  }`}
                >
                  <span 
                    className="px-3 py-1 font-black text-sm uppercase tracking-wider select-none"
                    style={{
                      color: '#FFE600',
                      textShadow: '0 3px 6px rgba(0,0,0,0.95), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 2px 0 0 #000, -2px 0 0 #000'
                    }}
                  >
                    {isViewingPost 
                      ? 'Một câu chuyện hay bắt đầu từ những điều rất nhỏ...' 
                      : (currentComment?.content ? currentComment.content.slice(0, 35) + '...' : 'Bình luận nổi bật...')}
                  </span>
                </div>
              )}

              {/* 5. Live Vignette Effect Overlay */}
              {effects.vignette && (
                <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.6)_100%)]" />
              )}
            </div>
          </div>

          {/* Positioning & Control Sliders */}
          <div className="w-full lg:w-72 xl:w-80 space-y-4">
            
            {/* Vị trí & kích thước Card */}
            <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-100">Vị trí & kích thước</span>
                <button
                  onClick={handleResetPosition}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                >
                  <RotateCcw size={11} />
                  <span>Đặt lại</span>
                </button>
              </div>

              {/* Tabs: [Thẻ bình luận] & [Video phụ] */}
              <div className="grid grid-cols-2 gap-1 bg-[#152542] p-1 rounded-xl border border-[#213b63] mb-3">
                <button
                  onClick={() => setPositionTab('card')}
                  className={`py-1.5 text-xs rounded-lg font-semibold transition ${
                    positionTab === 'card'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Thẻ bình luận
                </button>
                <button
                  onClick={() => setPositionTab('subVideo')}
                  className={`py-1.5 text-xs rounded-lg font-semibold transition ${
                    positionTab === 'subVideo'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Video phụ
                </button>
              </div>

              {/* Sliders for active tab */}
              {positionTab === 'card' ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Tọa độ X</span>
                      <span className="font-mono text-slate-200">{(cardPos?.x ?? 50).toFixed(1)} %</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="0.5"
                      value={cardPos?.x ?? 50}
                      onChange={(e) => setCardPos({ ...cardPos, x: parseFloat(e.target.value) })}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Tọa độ Y</span>
                      <span className="font-mono text-slate-200">{(cardPos?.y ?? 28).toFixed(1)} %</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="0.5"
                      value={cardPos?.y ?? 28}
                      onChange={(e) => setCardPos({ ...cardPos, y: parseFloat(e.target.value) })}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Cỡ (Phóng to)</span>
                      <span className="font-mono text-slate-200">{(cardPos?.scale ?? 105).toFixed(1)} %</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="150"
                      step="1"
                      value={cardPos?.scale ?? 105}
                      onChange={(e) => setCardPos({ ...cardPos, scale: parseFloat(e.target.value) })}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Bo góc</span>
                      <span className="font-mono text-slate-200">{cardPos?.borderRadius ?? 16} px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="32"
                      value={cardPos?.borderRadius ?? 16}
                      onChange={(e) => setCardPos({ ...cardPos, borderRadius: parseInt(e.target.value) })}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Nền thẻ</label>
                    <select
                      value={cardPos?.bgStyle || 'white'}
                      onChange={(e: any) => setCardPos({ ...cardPos, bgStyle: e.target.value })}
                      className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="white">Trắng (Mặc định)</option>
                      <option value="dark">Đen (Chế độ tối)</option>
                      <option value="transparent">Trong suốt (Kính mờ Glassmorphism)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Chế độ hiển thị Video phụ</label>
                    <select
                      value={subVideoPos?.layoutMode || 'fullscreen'}
                      onChange={(e: any) => setSubVideoPos({ ...subVideoPos, layoutMode: e.target.value })}
                      className="w-full bg-[#152542] border border-[#213b63] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="fullscreen">Toàn màn hình dọc (100% nền) - [Mặc định Shorts/TikTok]</option>
                      <option value="pip">Khung nhỏ góc dưới (PIP Box)</option>
                    </select>
                  </div>

                  {subVideoPos?.layoutMode === 'pip' ? (
                    <>
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Tọa độ X</span>
                          <span className="font-mono text-slate-200">{(subVideoPos?.x ?? 50).toFixed(1)} %</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          step="0.5"
                          value={subVideoPos?.x ?? 50}
                          onChange={(e) => setSubVideoPos({ ...subVideoPos, x: parseFloat(e.target.value) })}
                          className="w-full cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Tọa độ Y</span>
                          <span className="font-mono text-slate-200">{(subVideoPos?.y ?? 65).toFixed(1)} %</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          step="0.5"
                          value={subVideoPos?.y ?? 65}
                          onChange={(e) => setSubVideoPos({ ...subVideoPos, y: parseFloat(e.target.value) })}
                          className="w-full cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Cỡ (Phóng to)</span>
                          <span className="font-mono text-slate-200">{(subVideoPos?.scale ?? 110).toFixed(1)} %</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="160"
                          step="1"
                          value={subVideoPos?.scale ?? 110}
                          onChange={(e) => setSubVideoPos({ ...subVideoPos, scale: parseFloat(e.target.value) })}
                          className="w-full cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Bo góc</span>
                          <span className="font-mono text-slate-200">{subVideoPos?.borderRadius ?? 12} px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="32"
                          value={subVideoPos?.borderRadius ?? 12}
                          onChange={(e) => setSubVideoPos({ ...subVideoPos, borderRadius: parseInt(e.target.value) })}
                          className="w-full cursor-pointer"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl space-y-1.5 text-xs">
                      <p className="font-semibold text-cyan-300">✓ Toàn màn hình dọc (100% nền)</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Video phụ (Gameplay Minecraft / B-roll) luôn chạy dọc chiếm 100% toàn màn hình phía sau. Thẻ bài viết và phụ đề nổi bật phía trước.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons: Tạo video & Dừng */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <button
                  onClick={handleStartRender}
                  disabled={isRendering}
                  className={`col-span-8 py-3 px-4 rounded-xl text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 ${
                    isRendering
                      ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  }`}
                >
                  {isRendering ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Đang render...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} className="fill-white" />
                      <span>Tạo video</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleStopRender}
                  disabled={!isRendering}
                  className="col-span-4 py-3 px-3 rounded-xl text-xs font-semibold bg-[#1a2b47] hover:bg-[#233a61] text-slate-300 border border-[#243e69] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Square size={13} className="fill-slate-400" />
                  <span>Dừng</span>
                </button>
              </div>

              {/* Chụp thử ảnh Button */}
              <button
                onClick={handleCaptureTestSnapshot}
                disabled={isCapturingSnapshot}
                className="w-full py-2 px-3 rounded-xl text-xs font-medium bg-[#111f36] hover:bg-[#172948] text-slate-300 border border-[#1d3459] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Camera size={13} className={isCapturingSnapshot ? 'animate-spin text-blue-400' : 'text-slate-400'} />
                <span>{isCapturingSnapshot ? 'Đang chụp ảnh...' : 'Chụp thử ảnh'}</span>
              </button>
            </div>

            {/* Progress Bar & Status Feed */}
            <div className="bg-[#0f1b30] rounded-2xl border border-[#1b3154] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 truncate max-w-[180px]">{renderStep}</span>
                <span className="font-mono text-blue-400 font-bold">{renderProgress}%</span>
              </div>

              <div className="w-full h-2 bg-[#172744] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>

              {renderProgress === 100 && (
                <div className="pt-1 flex items-center justify-between text-xs text-emerald-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Xuất video thành công!</span>
                  </span>
                  <button 
                    onClick={onOpenResultsModal}
                    className="underline text-blue-400 hover:text-blue-300"
                  >
                    Xem kết quả
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Phase 6: Advanced Timeline Editor Dock */}
        <div className="border-t border-[#192b47] bg-[#091222] shrink-0 mt-auto">
          <div className="px-4 py-2 bg-[#0a1426] border-b border-[#14233f] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Film size={14} className="text-blue-400" />
                <span>Trình dựng Timeline đa tầng (Advanced Timeline Studio)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                Phase 6
              </span>
            </div>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 transition"
            >
              <span>{showTimeline ? 'Thu gọn timeline' : 'Mở rộng timeline'}</span>
              {showTimeline ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>

          {showTimeline && (
            <TimelineEditor
              scenes={project.scenes || []}
              audios={audios}
              currentTime={timelineTime}
              onSeekTime={(t) => setTimelineTime(t)}
              onUpdateScenes={async (updatedScenes) => {
                try {
                  const updated = await api.updateProject(project.id, { scenes: updatedScenes });
                  onUpdateProject(updated);
                } catch (e) {
                  console.error('Update scenes error:', e);
                }
              }}
              onSelectSceneForPreview={(idx) => {
                if (idx <= 1) {
                  setPreviewCommentIdx(-1);
                } else {
                  setPreviewCommentIdx(Math.min(project.comments.length - 1, idx - 2));
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
