import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Volume2, 
  Plus, 
  Trash2, 
  Check, 
  ArrowDown, 
  Play, 
  Pause, 
  RefreshCw, 
  Mic, 
  Music, 
  Clock, 
  Image as ImageIcon,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { Project, ScriptScene, AudioItem } from '../types';
import { api } from '../services/api';

interface ScriptViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

export const ScriptView: React.FC<ScriptViewProps> = ({
  project,
  onUpdateProject
}) => {
  const [scenes, setScenes] = useState<ScriptScene[]>(project.scenes || []);
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [serviceStatus, setServiceStatus] = useState<{
    tts?: { activeProvider: string; piperAvailable: boolean; piperUrl: string };
    ai?: { available: boolean; model?: string; availableModels: string[] };
  }>({});
  const [isGeneratingAudios, setIsGeneratingAudios] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [activePlayingAudioUrl, setActivePlayingAudioUrl] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);

  // Load existing audios for project
  const loadAudios = async () => {
    try {
      const list = await api.getAudios(project.id);
      setAudios(list);
    } catch (err) {
      console.error(err);
    }
  };

  const loadServiceStatus = async () => {
    try {
      const status = await api.getServiceStatus();
      setServiceStatus(status);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadAudios();
    loadServiceStatus();
    setScenes(project.scenes || []);
  }, [project.id]);

  // Audio Playback
  const handleTogglePlayAudio = (url: string) => {
    if (activePlayingAudioUrl === url && audioPlayer) {
      audioPlayer.pause();
      setActivePlayingAudioUrl(null);
      return;
    }

    if (audioPlayer) {
      audioPlayer.pause();
    }

    const newPlayer = new Audio(url);
    newPlayer.onended = () => setActivePlayingAudioUrl(null);
    newPlayer.onerror = () => setActivePlayingAudioUrl(null);
    newPlayer.play();
    setAudioPlayer(newPlayer);
    setActivePlayingAudioUrl(url);
  };

  // Edit scene text
  const handleUpdateSceneText = (id: string, newText: string) => {
    const next = scenes.map(s => s.id === id ? { ...s, text: newText } : s);
    setScenes(next);
  };

  // Edit scene voice
  const handleUpdateSceneVoice = (id: string, newVoice: string) => {
    const next = scenes.map(s => s.id === id ? { ...s, voice: newVoice } : s);
    setScenes(next);
  };

  // Save script changes
  const handleSaveScript = async () => {
    try {
      const updated = await api.updateProject(project.id, { scenes });
      onUpdateProject(updated);
      alert('Đã lưu kịch bản video thành công!');
    } catch (err: any) {
      alert('Lỗi lưu kịch bản: ' + err.message);
    }
  };

  // AI Script Generation
  const handleGenerateAIScript = async () => {
    setIsAiRewriting(true);
    try {
      const newScenes = await api.generateAIScript(project.id);
      setScenes(newScenes);
      const updated = await api.getProject(project.id);
      onUpdateProject(updated);
      alert('AI đã phân tích và tự động viết lại kịch bản viral cho bạn!');
    } catch (err: any) {
      alert('Lỗi tạo kịch bản AI: ' + err.message);
    } finally {
      setIsAiRewriting(false);
    }
  };

  // Generate audio for single scene
  const handleGenerateSceneAudio = async (sceneId: string) => {
    try {
      const audioItem = await api.generateSceneAudio(project.id, sceneId);
      setAudios(prev => [...prev.filter(a => a.sceneId !== sceneId), audioItem]);
      // Update local scene duration
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, duration: audioItem.duration } : s));
    } catch (err: any) {
      alert('Lỗi tạo giọng đọc: ' + err.message);
    }
  };

  // Batch generate audio for all scenes
  const handleBatchGenerateAudios = async () => {
    setIsGeneratingAudios(true);
    try {
      const results = await api.generateAllAudios(project.id);
      setAudios(results);
      const updated = await api.getProject(project.id);
      onUpdateProject(updated);
      setScenes(updated.scenes);
      alert(`Đã hoàn tất tạo giọng đọc cho toàn bộ ${results.length} phân cảnh!`);
    } catch (err: any) {
      alert('Lỗi tạo audio: ' + err.message);
    } finally {
      setIsGeneratingAudios(false);
    }
  };

  // Calculate total script duration
  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 4.5), 0);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#070d19]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="text-blue-400" size={22} />
              <span>Kịch bản & Bộ máy giọng đọc AI (Phase 4 - Script & Voice Engine)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Phân tách kịch bản thành từng cảnh, gán giọng đọc tiếng Việt theo vùng miền và tổng hợp file audio tương ứng.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAIScript}
              disabled={isAiRewriting}
              className="bg-[#142542] hover:bg-[#1d355e] text-blue-300 border border-[#234273] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Sparkles size={14} className={isAiRewriting ? 'animate-spin text-amber-400' : 'text-amber-400'} />
              <span>{isAiRewriting ? 'AI đang viết...' : 'AI viết kịch bản'}</span>
            </button>

            <button
              onClick={handleBatchGenerateAudios}
              disabled={isGeneratingAudios}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/25"
            >
              {isGeneratingAudios ? <RefreshCw size={14} className="animate-spin" /> : <Mic size={14} />}
              <span>{isGeneratingAudios ? 'Đang tạo audio...' : 'Tạo audio toàn bộ cảnh'}</span>
            </button>

            <button
              onClick={handleSaveScript}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Check size={14} />
              <span>Lưu</span>
            </button>
          </div>
        </div>

        {/* Sync Summary Banner */}
        <div className="bg-[#0e1a2f] p-4 rounded-2xl border border-[#192f52] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400 block text-[11px]">Tổng số phân cảnh:</span>
              <strong className="text-white text-sm font-mono">{scenes.length} cảnh</strong>
            </div>
            <div className="border-l border-slate-700/60 pl-4">
              <span className="text-slate-400 block text-[11px]">Tổng thời lượng ước tính:</span>
              <strong className="text-emerald-400 text-sm font-mono">~{Math.round(totalDuration)} giây</strong>
            </div>
            <div className="border-l border-slate-700/60 pl-4">
              <span className="text-slate-400 block text-[11px]">File Audio đã sẵn sàng:</span>
              <strong className="text-blue-400 text-sm font-mono">{audios.length} / {scenes.length}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-400">Tốc độ: {project.config.tts?.speed || 1.2}x</span>
            <span className="text-slate-600">·</span>
            {serviceStatus.tts?.piperAvailable ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Piper TTS (Local)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full" title="Chạy .\start-piper.ps1 để bật Piper TTS">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Synthetic Voice (Sẵn sàng)
              </span>
            )}
            <span className="text-slate-600">·</span>
            {serviceStatus.ai?.available ? (
              <span className="inline-flex items-center gap-1 text-blue-300 bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                Ollama ({serviceStatus.ai.model})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800/40 border border-slate-700/40 px-2 py-0.5 rounded-full" title="Chạy ollama run llama3.2">
                AI Template Viral
              </span>
            )}
          </div>
        </div>

        {/* Scene Cards Pipeline */}
        <div className="space-y-4">
          {scenes.map((scene, idx) => {
            const audioItem = audios.find(a => a.sceneId === scene.id);
            const isPlaying = activePlayingAudioUrl === audioItem?.fileUrl;

            return (
              <div key={scene.id} className="relative">
                <div className="bg-[#0e1a2f] border border-[#1b3154] rounded-2xl p-4 shadow-sm hover:border-blue-500/30 transition">
                  
                  {/* Scene Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{scene.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                        scene.type === 'hook'
                          ? 'bg-amber-500/20 text-amber-300'
                          : scene.type === 'post'
                          ? 'bg-blue-500/20 text-blue-300'
                          : scene.type === 'comment'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {scene.type}
                      </span>

                      {audioItem && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                          <CheckCircle2 size={10} />
                          <span>Audio sẵn sàng</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Voice selector for this scene */}
                      <select
                        value={scene.voice}
                        onChange={(e) => handleUpdateSceneVoice(scene.id, e.target.value)}
                        className="bg-[#14243f] border border-[#213b63] rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="VieNeu - Ngọc Huyền (Nữ miền Bắc)">Ngọc Huyền (Nữ Bắc)</option>
                        <option value="VieNeu - Hải Đăng (Nam miền Nam)">Hải Đăng (Nam Nam)</option>
                        <option value="VieNeu - Thiện Minh (Nam miền Bắc)">Thiện Minh (Nam Bắc)</option>
                        <option value="VieNeu - Mai Linh (Nữ miền Trung)">Mai Linh (Nữ Trung)</option>
                        <option value="TikTok Việt 1 (Nữ viral)">TikTok 1 (Nữ viral)</option>
                        <option value="TikTok Việt 2 (Nam vui vẻ)">TikTok 2 (Nam vui vẻ)</option>
                        <option value="Adam bựa - VieNeu">Adam bựa</option>
                      </select>

                      {/* Play or Generate single audio */}
                      {audioItem ? (
                        <button
                          onClick={() => handleTogglePlayAudio(audioItem.fileUrl)}
                          title={isPlaying ? 'Dừng phát' : 'Nghe file audio đã tạo'}
                          className={`p-1.5 rounded-lg border transition ${
                            isPlaying
                              ? 'bg-blue-600 text-white border-blue-500 animate-pulse'
                              : 'bg-[#152542] hover:bg-blue-600 hover:text-white text-slate-300 border-[#213b63]'
                          }`}
                        >
                          {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5 fill-current" />}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGenerateSceneAudio(scene.id)}
                          title="Tạo file audio cho cảnh này"
                          className="p-1.5 rounded-lg bg-[#152542] hover:bg-blue-600 hover:text-white text-slate-300 border border-[#213b63] transition"
                        >
                          <Mic size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Text Content */}
                  <textarea
                    rows={3}
                    value={scene.text}
                    onChange={(e) => handleUpdateSceneText(scene.id, e.target.value)}
                    className="w-full bg-[#13223b] border border-[#213b63] rounded-xl p-3 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-blue-500 font-sans"
                  />

                  {/* Scene footer */}
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-mono">
                    <div className="flex items-center gap-3">
                      <span>Số từ: {scene.text.split(' ').filter(Boolean).length} từ</span>
                      <span>·</span>
                      <span>Thời lượng: ~{scene.duration || 4.5}s</span>
                    </div>

                    {audioItem && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {audioItem.fileUrl.split('/').pop()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Down Arrow between scenes */}
                {idx < scenes.length - 1 && (
                  <div className="flex justify-center my-1 text-slate-600">
                    <ArrowDown size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
