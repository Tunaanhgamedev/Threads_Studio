import React from 'react';
import { Clock, Play, CheckCircle2, AlertCircle, RefreshCw, Download, Terminal, Video } from 'lucide-react';
import { Project, RenderJob } from '../types';

interface RenderQueueViewProps {
  project: Project;
  onOpenStudio: () => void;
  onOpenResults: () => void;
}

export const RenderQueueView: React.FC<RenderQueueViewProps> = ({
  project,
  onOpenStudio,
  onOpenResults
}) => {
  const job = project.lastRenderJob;

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#070d19]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="text-amber-400" size={22} />
              <span>Hàng đợi kết xuất (Render Queue)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Theo dõi chi tiết các bước xử lý video qua FFmpeg, TTS và HTML/CSS Screenshot Engine.
            </p>
          </div>

          <button
            onClick={onOpenStudio}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Play size={13} className="fill-white" />
            <span>Vào Studio tạo video</span>
          </button>
        </div>

        {/* Current Job Card */}
        {job ? (
          <div className="bg-[#0e1a2f] border border-[#1b3154] rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Mã tiến trình: {job.id}</span>
                <h3 className="text-base font-bold text-white mt-1">{project.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-lg">{project.threadsUrl}</p>
              </div>

              <span className={`text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                job.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : job.status === 'rendering'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {job.status === 'completed' ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Hoàn thành 100%</span>
                  </>
                ) : job.status === 'rendering' ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Đang render ({job.progress}%)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} />
                    <span>Thất bại / Đã dừng</span>
                  </>
                )}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">{job.currentStep}</span>
                <span className="font-mono text-blue-400 font-bold">{job.progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#172744] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              {job.stepDetails && (
                <p className="text-[11px] text-slate-400 mt-1.5">{job.stepDetails}</p>
              )}
            </div>

            {/* Completed Output Card */}
            {job.status === 'completed' && job.outputVideoUrl && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Video size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Video đã sẵn sàng</span>
                    <span className="text-[11px] text-emerald-400 font-mono">MP4 1080x1920 (H.264/AAC)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenResults}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow transition"
                  >
                    Xem video
                  </button>
                  <a
                    href={job.outputVideoUrl}
                    download
                    className="bg-[#122340] hover:bg-[#1a325c] text-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-[#203a66] transition flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Tải về</span>
                  </a>
                </div>
              </div>
            )}

            {/* Logs Terminal */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Terminal size={14} className="text-blue-400" />
                <span>Nhật ký xử lý chi tiết (Terminal Logs)</span>
              </div>
              <div className="bg-[#060b14] p-3.5 rounded-2xl border border-[#14233c] font-mono text-xs text-slate-300 space-y-1.5 max-h-56 overflow-y-auto">
                {job.logs.map((logLine, idx) => (
                  <div key={idx} className="leading-relaxed hover:bg-white/5 px-1 rounded">
                    {logLine}
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-[#0e1a2f] border border-[#1b3154] rounded-3xl p-12 text-center text-slate-400">
            <Clock size={36} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Chưa có tiến trình render nào</p>
            <p className="text-xs text-slate-500 mt-1">Hãy bấm "Tạo video" trong Threads Studio để bắt đầu.</p>
          </div>
        )}

      </div>
    </div>
  );
};
