import React from 'react';
import { 
  Sparkles, 
  Settings as SettingsIcon, 
  Key, 
  Video, 
  Moon, 
  Sun,
  ShieldCheck,
  FolderPlus
} from 'lucide-react';
import { Project } from '../types';

interface NavbarProps {
  currentProject: Project | null;
  projects: Project[];
  onSelectProject: (id: string) => void;
  onCreateNewProject: () => void;
  onOpenOptions: () => void;
  onOpenKeyModal: () => void;
  onOpenResults: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onCreateNewProject,
  onOpenOptions,
  onOpenKeyModal,
  onOpenResults
}) => {
  return (
    <header className="h-14 bg-[#0a1324] border-b border-[#1b2d4b] px-4 flex items-center justify-between select-none">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-lg shadow-blue-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-[#0a1324] rounded-[10px] flex items-center justify-center">
            <span className="text-blue-400 font-extrabold text-lg">@</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-100 text-[15px] tracking-tight">Threads Studio</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">v1.0 Pro</span>
          </div>
          <p className="text-[11px] text-slate-400 -mt-0.5">Tạo video từ bài viết Threads</p>
        </div>

        {/* Project Selector */}
        <div className="ml-6 flex items-center gap-1.5 bg-[#101e36] px-2.5 py-1 rounded-lg border border-[#1e3558]">
          <span className="text-xs text-slate-400">Dự án:</span>
          <select 
            value={currentProject?.id || ''} 
            onChange={(e) => onSelectProject(e.target.value)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[200px] truncate"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id} className="bg-[#0f1b30] text-slate-200">
                {p.title}
              </option>
            ))}
          </select>
          <button 
            onClick={onCreateNewProject}
            title="Tạo dự án mới"
            className="p-1 hover:bg-blue-600/20 hover:text-blue-400 rounded text-slate-400 transition"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Dark Mode Switch */}
        <div className="flex items-center gap-2 bg-[#101e36] px-2.5 py-1 rounded-full border border-[#1e3558]">
          <div className="w-8 h-4 bg-blue-600 rounded-full relative cursor-pointer flex items-center px-0.5">
            <div className="w-3 h-3 bg-white rounded-full ml-auto shadow-sm" />
          </div>
          <span className="text-xs text-slate-300 font-medium">Tối</span>
        </div>

        {/* Header Action Buttons from Screenshot */}
        <button 
          onClick={onOpenOptions}
          className="text-xs bg-[#12223e] hover:bg-[#182d52] text-slate-200 px-3 py-1.5 rounded-lg border border-[#213a62] font-medium transition flex items-center gap-1.5"
        >
          <SettingsIcon size={13} className="text-slate-400" />
          <span>Tùy chọn</span>
        </button>

        <button 
          onClick={onOpenKeyModal}
          className="text-xs bg-[#12223e] hover:bg-[#182d52] text-slate-200 px-3 py-1.5 rounded-lg border border-[#213a62] font-medium transition flex items-center gap-1.5"
        >
          <Key size={13} className="text-amber-400" />
          <span>Thông tin key</span>
        </button>

        <button 
          onClick={onOpenResults}
          className="text-xs bg-[#12223e] hover:bg-[#182d52] text-slate-200 px-3 py-1.5 rounded-lg border border-[#213a62] font-medium transition flex items-center gap-1.5"
        >
          <Video size={13} className="text-emerald-400" />
          <span>Kết quả</span>
        </button>

        {/* Active Badge */}
        <div className="flex items-center gap-1.5 pl-2 text-[11px] font-medium text-emerald-400 border-l border-[#1b2d4b]">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Đã kích hoạt - Không giới hạn video</span>
        </div>
      </div>
    </header>
  );
};
