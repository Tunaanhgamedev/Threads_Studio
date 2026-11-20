import React, { useState } from 'react';
import { FolderArchive, Play, Download, Trash2, Calendar, HardDrive, Video } from 'lucide-react';
import { Project } from '../types';

interface LibraryViewProps {
  projects: Project[];
  onOpenVideoModal: (videoUrl: string, title: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  projects,
  onOpenVideoModal
}) => {
  const completedProjects = projects.filter(p => p.status === 'completed' && p.lastRenderJob?.outputVideoUrl);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#070d19]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderArchive className="text-blue-400" size={22} />
              <span>Thư viện video thành phẩm</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tất cả các video đã được kết xuất sẵn sàng tải xuống hoặc xuất bản lên mạng xã hội.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-[#0e1a2f] px-3 py-1.5 rounded-xl border border-[#192f52]">
            Tổng: {completedProjects.length} video
          </div>
        </div>

        {/* Video Grid */}
        {completedProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {completedProjects.map(p => {
              const job = p.lastRenderJob!;
              return (
                <div 
                  key={p.id}
                  className="bg-[#0e1a2f] border border-[#192f52] rounded-2xl overflow-hidden hover:border-blue-500/40 transition group flex flex-col"
                >
                  {/* Thumbnail / Video Preview */}
                  <div 
                    onClick={() => onOpenVideoModal(job.outputVideoUrl!, p.title)}
                    className="relative aspect-[9/16] bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden group-hover:opacity-95 transition"
                  >
                    {job.thumbnailUrl ? (
                      <img 
                        src={job.thumbnailUrl} 
                        alt={p.title} 
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
                    
                    {/* Play button overlay */}
                    <div className="p-4 text-center z-10">
                      <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center mx-auto mb-2 shadow-xl group-hover:scale-110 group-hover:bg-blue-500 transition">
                        <Play size={22} className="ml-0.5 fill-white" />
                      </div>
                      <span className="text-xs font-bold text-white line-clamp-2 px-2 drop-shadow">
                        {p.title}
                      </span>
                    </div>

                    <span className="absolute bottom-2 right-2 text-[10px] bg-black/80 backdrop-blur-sm text-slate-300 px-2 py-0.5 rounded font-mono border border-white/10">
                      {p.config.aspectRatio || '9:16'}
                    </span>
                  </div>

                  {/* Info and Actions */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{p.title}</h4>
                      <p className="text-[11px] text-slate-500 font-mono truncate">@{p.post.username}</p>
                    </div>

                    <div className="pt-2 border-t border-[#172744] flex items-center justify-between text-xs">
                      <button
                        onClick={() => onOpenVideoModal(job.outputVideoUrl!, p.title)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Phát video
                      </button>
                      <a
                        href={job.outputVideoUrl}
                        download
                        className="p-1.5 rounded-lg bg-[#14233c] hover:bg-blue-600 text-slate-300 hover:text-white transition"
                        title="Tải về máy tính"
                      >
                        <Download size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#0e1a2f] border border-[#1b3154] rounded-3xl p-14 text-center text-slate-400">
            <Video size={40} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Chưa có video nào được xuất</p>
            <p className="text-xs text-slate-500 mt-1">
              Hãy quay lại Threads Studio, chọn cấu hình và bấm "Tạo video" để tạo video đầu tiên!
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
