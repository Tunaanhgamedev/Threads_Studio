import React from 'react';
import { 
  Clapperboard, 
  LayoutDashboard, 
  Globe, 
  MessageSquare, 
  Camera,
  FileText, 
  Clock, 
  FolderArchive, 
  SlidersHorizontal,
  Zap,
  Radio,
  Compass
} from 'lucide-react';

export type ActiveTab = 'studio' | 'automation' | 'connector' | 'discovery' | 'dashboard' | 'sources' | 'comments' | 'screenshots' | 'script' | 'queue' | 'library' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  renderStatus?: string;
  hasActiveJobs?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  hasActiveJobs
}) => {
  const menuItems = [
    { id: 'studio', label: 'Threads Studio', icon: Clapperboard, badge: 'Chính' },
    { id: 'automation', label: 'Tự động hóa', icon: Zap, badge: 'Phase 7', badgeColor: 'bg-cyan-500/20 text-cyan-300' },
    { id: 'connector', label: 'Threads API Sync', icon: Radio, badge: 'Phase 8', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
    { id: 'discovery', label: 'Khám phá Kênh', icon: Compass, badge: 'Phase 9', badgeColor: 'bg-purple-500/20 text-purple-300' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sources', label: 'Nguồn Threads', icon: Globe },
    { id: 'comments', label: 'Bình luận', icon: MessageSquare },
    { id: 'screenshots', label: 'Ảnh chụp thẻ', icon: Camera, badge: 'Phase 3' },
    { id: 'script', label: 'Kịch bản AI', icon: FileText, badge: 'Phase 4' },
    { id: 'queue', label: 'Hàng đợi', icon: Clock, badge: hasActiveJobs ? 'Đang chạy' : undefined, badgeColor: 'bg-amber-500/20 text-amber-300' },
    { id: 'library', label: 'Thư viện', icon: FolderArchive },
    { id: 'settings', label: 'Cài đặt', icon: SlidersHorizontal }
  ];

  return (
    <aside className="w-56 bg-[#08101e] border-r border-[#192b47] flex flex-col justify-between py-3 select-none shrink-0">
      <div className="space-y-1 px-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-1">
          Quy trình sản xuất
        </div>
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101e34]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-[#182b4a] text-blue-400')}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System status footer */}
      <div className="px-3 pt-3 border-t border-[#15243c] mx-2">
        <div className="bg-[#0e1a2f] p-2.5 rounded-xl border border-[#1b3154]">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>FFmpeg</span>
            <span className="text-emerald-400 font-mono font-semibold">Sẵn sàng</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>VieNeu TTS</span>
            <span className="text-blue-400 font-mono font-semibold">Cục bộ</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
