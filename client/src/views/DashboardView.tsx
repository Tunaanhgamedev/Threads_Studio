import React from 'react';
import { 
  Video, 
  MessageSquare, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  FolderPlus,
  Play
} from 'lucide-react';
import { Project } from '../types';

interface DashboardViewProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onOpenStudio: () => void;
  onCreateNewProject: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onSelectProject,
  onOpenStudio,
  onCreateNewProject
}) => {
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalComments = projects.reduce((acc, p) => acc + (p.comments?.length || 0), 0);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#070d19]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-950/80 to-[#0d1a33] p-6 border border-blue-500/20 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Tự động hóa sản xuất video
                </span>
                <span className="text-xs text-slate-400">Phiên bản 1.0</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Chào mừng bạn đến với Threads Content Studio
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
                Biến bất kỳ bài viết và bình luận nào trên Threads thành video TikTok, Reels và YouTube Shorts hoàn chỉnh chỉ với 1 click.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onCreateNewProject}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
              >
                <FolderPlus size={15} />
                <span>Thêm dự án mới</span>
              </button>
              <button
                onClick={onOpenStudio}
                className="bg-[#152542] hover:bg-[#1c3259] text-blue-300 px-4 py-2.5 rounded-xl text-xs font-bold border border-[#234273] flex items-center gap-2 transition"
              >
                <Play size={15} />
                <span>Vào Studio</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0e1a2f] p-4 rounded-2xl border border-[#192f52] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Tổng số bài viết</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-mono">{totalProjects}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Dự án đã nạp vào studio</span>
          </div>

          <div className="bg-[#0e1a2f] p-4 rounded-2xl border border-[#192f52] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Video đã xuất</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Video size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-mono">{completedProjects}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">Sẵn sàng đăng tải</span>
          </div>

          <div className="bg-[#0e1a2f] p-4 rounded-2xl border border-[#192f52] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Bình luận đã thu thập</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <MessageSquare size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-mono">{totalComments}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Sẵn sàng lọc kịch bản</span>
          </div>

          <div className="bg-[#0e1a2f] p-4 rounded-2xl border border-[#192f52] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Tốc độ xuất video</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-mono">~35s</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Tự động với FFmpeg</span>
          </div>
        </div>

        {/* Recent Projects Table */}
        <div className="bg-[#0e1a2f] rounded-2xl border border-[#192f52] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Danh sách bài viết gần đây</h3>
            <span className="text-xs text-slate-400 font-mono">{projects.length} bài</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1b3154] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Bài viết</th>
                  <th className="py-2.5 px-3">Tác giả</th>
                  <th className="py-2.5 px-3">Bình luận</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-[#172b49]">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-[#122340] transition">
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-semibold text-slate-200 truncate">{p.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{p.threadsUrl}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      @{p.post?.username || 'user'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {p.comments?.length || 0}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        p.status === 'completed' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : p.status === 'rendering'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {p.status === 'completed' ? 'Đã xuất video' : p.status === 'rendering' ? 'Đang tạo video' : 'Đã thu thập'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          onSelectProject(p.id);
                          onOpenStudio();
                        }}
                        className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white px-3 py-1 rounded-lg text-xs font-medium transition"
                      >
                        Mở Studio
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
