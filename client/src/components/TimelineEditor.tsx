import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Sliders, 
  ChevronLeft, 
  ChevronRight, 
  MoveHorizontal, 
  Layers, 
  Clock, 
  Mic, 
  Video, 
  Type, 
  X, 
  Check, 
  Plus, 
  Trash2,
  Wand2
} from 'lucide-react';
import { ScriptScene, AudioItem, TransitionType } from '../types';

interface TimelineEditorProps {
  scenes: ScriptScene[];
  audios: AudioItem[];
  onUpdateScenes: (updated: ScriptScene[]) => void;
  onSelectSceneForPreview?: (index: number) => void;
  currentTime?: number;
  onSeekTime?: (time: number) => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  scenes,
  audios,
  onUpdateScenes,
  onSelectSceneForPreview,
  currentTime = 0,
  onSeekTime
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadTime, setPlayheadTime] = useState(currentTime);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<ScriptScene | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(30); // pixels per second
  const playTimerRef = useRef<number | null>(null);

  // Total duration of all selected scenes
  const totalDuration = scenes
    .filter(s => s.selected)
    .reduce((acc, s) => acc + (s.duration || 4.5), 0);

  // Sync internal playhead with prop if provided
  useEffect(() => {
    if (!isPlaying && currentTime !== undefined) {
      setPlayheadTime(currentTime);
    }
  }, [currentTime, isPlaying]);

  // Find active scene index based on playhead time
  const getActiveSceneIndex = (time: number): number => {
    let elapsed = 0;
    for (let i = 0; i < scenes.length; i++) {
      const dur = scenes[i].duration || 4.5;
      if (time >= elapsed && time <= elapsed + dur) {
        return i;
      }
      elapsed += dur;
    }
    return 0;
  };

  // Playhead animation loop
  useEffect(() => {
    if (isPlaying) {
      const step = 0.05; // 50ms intervals
      playTimerRef.current = window.setInterval(() => {
        setPlayheadTime(prev => {
          const next = prev + step;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          if (onSeekTime) onSeekTime(next);
          const activeIdx = getActiveSceneIndex(next);
          if (onSelectSceneForPreview) onSelectSceneForPreview(activeIdx);
          return next;
        });
      }, 50);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, totalDuration, scenes]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (playheadTime >= totalDuration) {
        setPlayheadTime(0);
      }
      setIsPlaying(true);
    }
  };

  const handleResetPlayhead = () => {
    setIsPlaying(false);
    setPlayheadTime(0);
    if (onSeekTime) onSeekTime(0);
    if (onSelectSceneForPreview) onSelectSceneForPreview(0);
  };

  // Re-order scenes (Move Left / Right)
  const handleMoveScene = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const reordered = [...scenes];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Recalculate orders
    const updated = reordered.map((s, idx) => ({ ...s, order: idx }));
    onUpdateScenes(updated);
  };

  // Update scene transition
  const handleUpdateTransition = (sceneId: string, transition: TransitionType) => {
    const updated = scenes.map(s => s.id === sceneId ? { ...s, transition } : s);
    onUpdateScenes(updated);
    if (editingScene && editingScene.id === sceneId) {
      setEditingScene({ ...editingScene, transition });
    }
  };

  // Save changes from inspector
  const handleSaveInspector = () => {
    if (!editingScene) return;
    const updated = scenes.map(s => s.id === editingScene.id ? editingScene : s);
    onUpdateScenes(updated);
    setSelectedSceneId(null);
    setEditingScene(null);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };

  // Calculate timeline markers (every 5 seconds)
  const markerCount = Math.max(1, Math.ceil(totalDuration / 5) + 1);
  const markers = Array.from({ length: markerCount }, (_, i) => i * 5);

  return (
    <div className="bg-[#0b1325] border-t border-[#18294a] select-none flex flex-col">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#080d1a] border-b border-[#14233f] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handleTogglePlay}
              className={`p-1.5 rounded-lg font-bold transition flex items-center justify-center ${
                isPlaying 
                  ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              title={isPlaying ? 'Tạm dừng' : 'Phát xem trước'}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
            </button>
            <button
              onClick={handleResetPlayhead}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Quay lại đầu timeline"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Time Counter */}
          <div className="font-mono text-xs bg-[#0f1d38] px-2.5 py-1 rounded-md border border-[#1b315b] flex items-center gap-1.5">
            <span className="text-blue-400 font-bold">{formatSeconds(playheadTime)}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{formatSeconds(totalDuration)}</span>
          </div>

          <span className="text-slate-500">|</span>

          {/* Scene summary pill */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <Layers size={13} className="text-blue-400" />
            <span>{scenes.length} phân cảnh</span>
          </div>
        </div>

        {/* Timeline Zoom Slider */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Thu phóng:</span>
            <input
              type="range"
              min="15"
              max="70"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
              className="w-20 accent-blue-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <span className="text-slate-600 text-xs">·</span>
          <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
            <Sparkles size={12} />
            Advanced Studio v0.6.0
          </span>
        </div>
      </div>

      {/* 2. Multi-track Timeline Area */}
      <div className="relative overflow-x-auto p-4 min-h-[220px] bg-[#070d19]">
        <div style={{ width: `${Math.max(800, totalDuration * zoomLevel + 120)}px` }} className="relative">
          
          {/* Time Ruler */}
          <div className="h-6 border-b border-slate-800 flex relative mb-2">
            {markers.map((sec) => (
              <div 
                key={sec} 
                className="absolute top-0 text-[10px] font-mono text-slate-400 border-l border-slate-700/60 pl-1 h-full"
                style={{ left: `${sec * zoomLevel}px` }}
              >
                {sec}s
              </div>
            ))}
          </div>

          {/* Playhead Indicator Line */}
          <div 
            className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
            style={{ left: `${playheadTime * zoomLevel}px` }}
          >
            <div className="w-3.5 h-3.5 bg-red-500 rotate-45 transform -translate-y-1 shadow-md shadow-red-500/50"></div>
            <div className="w-0.5 bg-red-500 flex-1 opacity-90"></div>
          </div>

          {/* TRACK 1: Card Scenes & Transitions */}
          <div className="mb-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Video size={12} className="text-blue-400" />
              <span>Lớp thẻ nội dung & Hiệu ứng chuyển cảnh</span>
            </div>
            <div className="flex items-center gap-1 relative h-16">
              {scenes.map((scene, idx) => {
                const dur = scene.duration || 4.5;
                const widthPx = Math.max(90, dur * zoomLevel);
                const isSelected = selectedSceneId === scene.id;
                const isActive = getActiveSceneIndex(playheadTime) === idx;

                const badgeBg = 
                  scene.type === 'hook' ? 'bg-amber-600/30 text-amber-300 border-amber-600/50' :
                  scene.type === 'post' ? 'bg-blue-600/30 text-blue-300 border-blue-600/50' :
                  scene.type === 'outro' ? 'bg-purple-600/30 text-purple-300 border-purple-600/50' :
                  'bg-emerald-600/30 text-emerald-300 border-emerald-600/50';

                return (
                  <React.Fragment key={scene.id}>
                    {/* Scene Block */}
                    <div
                      style={{ width: `${widthPx}px` }}
                      onClick={() => {
                        setSelectedSceneId(scene.id);
                        setEditingScene({ ...scene });
                        if (onSelectSceneForPreview) onSelectSceneForPreview(idx);
                      }}
                      className={`h-full rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition select-none relative group ${
                        isSelected 
                          ? 'border-blue-400 bg-[#162a4d] shadow-lg shadow-blue-500/20' 
                          : isActive 
                            ? 'border-emerald-500/80 bg-[#11223f]' 
                            : 'border-[#1b315b] bg-[#0d1a33] hover:border-slate-500'
                      }`}
                    >
                      {/* Top badge & move arrows */}
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold truncate ${badgeBg}`}>
                          {scene.type === 'hook' ? 'Hook' : scene.type === 'post' ? 'Bài viết' : scene.type === 'outro' ? 'Outro' : `#${idx}`}
                        </span>

                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveScene(idx, 'left'); }}
                            disabled={idx === 0}
                            className="p-0.5 hover:text-white text-slate-400 disabled:opacity-20"
                            title="Di chuyển sang trái"
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveScene(idx, 'right'); }}
                            disabled={idx === scenes.length - 1}
                            className="p-0.5 hover:text-white text-slate-400 disabled:opacity-20"
                            title="Di chuyển sang phải"
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Content excerpt */}
                      <p className="text-[10px] text-slate-200 line-clamp-1 font-medium">
                        {scene.text}
                      </p>

                      {/* Duration pill */}
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>{dur.toFixed(1)}s</span>
                        <span className="text-[9px] text-blue-400 capitalize">{scene.transition || 'fade'}</span>
                      </div>
                    </div>

                    {/* Transition badge between scenes */}
                    {idx < scenes.length - 1 && (
                      <div className="relative group/trans">
                        <button
                          onClick={() => {
                            const current = scene.transition || 'fade';
                            const cycle: TransitionType[] = ['fade', 'slide_left', 'slide_right', 'zoom_in', 'none'];
                            const nextIdx = (cycle.indexOf(current) + 1) % cycle.length;
                            handleUpdateTransition(scene.id, cycle[nextIdx]);
                          }}
                          className="w-5 h-7 rounded bg-[#13233f] hover:bg-blue-600 text-slate-400 hover:text-white text-[9px] font-bold flex items-center justify-center transition border border-[#1e3863]"
                          title={`Chuyển cảnh: ${scene.transition || 'fade'} (Nhấp để đổi)`}
                        >
                          ⇋
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* TRACK 2: Voice Audio Narration */}
          <div className="mb-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Mic size={12} className="text-emerald-400" />
              <span>Lớp giọng đọc AI & Âm lượng phân cảnh</span>
            </div>
            <div className="flex items-center gap-1 h-9">
              {scenes.map((scene) => {
                const dur = scene.duration || 4.5;
                const widthPx = Math.max(90, dur * zoomLevel);
                const audio = audios.find(a => a.sceneId === scene.id);

                return (
                  <div
                    key={`audio_${scene.id}`}
                    style={{ width: `${widthPx}px` }}
                    className="h-full rounded-lg bg-[#0e271e] border border-[#164232] px-2 flex items-center justify-between text-[10px] text-emerald-300"
                  >
                    <span className="truncate text-[9px] font-mono">
                      {audio ? 'Audio ready' : 'Auto sync'}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400 font-mono">
                      {scene.volume ?? 100}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TRACK 3: Subtitles Track */}
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Type size={12} className="text-amber-400" />
              <span>Lớp phụ đề tự động (ASS Subtitles)</span>
            </div>
            <div className="flex items-center gap-1 h-7">
              {scenes.map((scene) => {
                const dur = scene.duration || 4.5;
                const widthPx = Math.max(90, dur * zoomLevel);
                return (
                  <div
                    key={`sub_${scene.id}`}
                    style={{ width: `${widthPx}px` }}
                    className="h-full rounded-md bg-[#241f0f] border border-[#4d3d17] px-2 flex items-center text-[9px] text-amber-300 font-mono truncate"
                  >
                    💬 Phụ đề đồng bộ ({dur.toFixed(1)}s)
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* 3. Scene Inspector Drawer / Modal */}
      {editingScene && (
        <div className="border-t border-[#1e345b] bg-[#0c162b] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Chỉnh sửa phân cảnh:</span>
              <span className="text-xs font-semibold text-blue-400">{editingScene.title}</span>
            </div>
            <input
              type="text"
              value={editingScene.text}
              onChange={(e) => setEditingScene({ ...editingScene, text: e.target.value })}
              className="w-full bg-[#080d19] border border-[#192f52] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            {/* Transition selector */}
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Hiệu ứng chuyển cảnh</label>
              <select
                value={editingScene.transition || 'fade'}
                onChange={(e) => setEditingScene({ ...editingScene, transition: e.target.value as TransitionType })}
                className="bg-[#080d19] border border-[#192f52] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="fade">Mờ dần (Fade)</option>
                <option value="slide_left">Trượt từ phải sang (Slide Left)</option>
                <option value="slide_right">Trượt từ trái sang (Slide Right)</option>
                <option value="zoom_in">Phóng to (Zoom In)</option>
                <option value="none">Cắt trực tiếp (Cut)</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Thời lượng (giây)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="30.0"
                value={editingScene.duration || 4.5}
                onChange={(e) => setEditingScene({ ...editingScene, duration: parseFloat(e.target.value) || 4.5 })}
                className="w-20 bg-[#080d19] border border-[#192f52] rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Volume */}
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Âm lượng cảnh ({editingScene.volume ?? 100}%)</label>
              <input
                type="range"
                min="0"
                max="150"
                value={editingScene.volume ?? 100}
                onChange={(e) => setEditingScene({ ...editingScene, volume: parseInt(e.target.value, 10) })}
                className="w-24 accent-emerald-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2 md:pt-0">
              <button
                onClick={handleSaveInspector}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
              >
                <Check size={13} />
                <span>Lưu thay đổi</span>
              </button>
              <button
                onClick={() => { setEditingScene(null); setSelectedSceneId(null); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
