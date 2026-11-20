import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Sparkles, 
  Download, 
  Trash2, 
  Maximize2, 
  RefreshCw, 
  CheckCircle2, 
  Sun, 
  Moon, 
  Eye, 
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { Project, ScreenshotItem } from '../types';
import { api } from '../services/api';

interface ScreenshotsViewProps {
  project: Project;
}

export const ScreenshotsView: React.FC<ScreenshotsViewProps> = ({ project }) => {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [filterType, setFilterType] = useState<'all' | 'post' | 'comment'>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadScreenshots = async () => {
    try {
      const list = await api.getScreenshots(project.id);
      setScreenshots(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScreenshots();
  }, [project.id]);

  // Batch render all
  const handleBatchRender = async () => {
    setIsRendering(true);
    try {
      const rendered = await api.renderBatchScreenshots(project.id, {
        theme,
        aspectRatio
      });
      setScreenshots(prev => [...rendered, ...prev]);
      alert(`Đã render thành công ${rendered.length} ảnh PNG chất lượng cao!`);
    } catch (err: any) {
      alert('Lỗi render ảnh: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  // Render single post
  const handleRenderPost = async () => {
    setIsRendering(true);
    try {
      const item = await api.renderPostScreenshot(project.id, { theme, aspectRatio });
      setScreenshots(prev => [item, ...prev]);
    } catch (err: any) {
      alert('Lỗi render bài viết: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa ảnh này?')) {
      try {
        await api.deleteScreenshot(project.id, id);
        setScreenshots(prev => prev.filter(s => s.id !== id));
      } catch (err: any) {
        alert('Lỗi xóa: ' + err.message);
      }
    }
  };

  const filtered = screenshots.filter(s => filterType === 'all' || s.type === filterType);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#070d19]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Camera className="text-blue-400" size={22} />
              <span>Thư viện ảnh chụp Threads (Phase 3 - Screenshot Engine)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Render tự động thẻ bài viết và bình luận thành ảnh PNG chất lượng cao chuẩn phong cách Threads qua Playwright.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRenderPost}
              disabled={isRendering}
              className="bg-[#122340] hover:bg-[#1a325c] text-blue-300 border border-[#234273] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Camera size={14} />
              <span>Chụp bài viết</span>
            </button>

            <button
              onClick={handleBatchRender}
              disabled={isRendering}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/25"
            >
              {isRendering ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{isRendering ? 'Đang render PNG...' : 'Render toàn bộ ảnh'}</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Config Bar */}
        <div className="bg-[#0e1a2f] p-4 rounded-2xl border border-[#192f52] flex flex-wrap items-center justify-between gap-4">
          {/* Tabs Filter */}
          <div className="flex items-center gap-1 bg-[#13223b] p-1 rounded-xl border border-[#213b63]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả ({screenshots.length})
            </button>
            <button
              onClick={() => setFilterType('post')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterType === 'post' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bài viết
            </button>
            <button
              onClick={() => setFilterType('comment')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterType === 'comment' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bình luận
            </button>
          </div>

          {/* Theme & Aspect ratio options */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <div className="flex items-center gap-1 bg-[#13223b] p-1 rounded-xl border border-[#213b63]">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  theme === 'light' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun size={12} />
                <span>Nền sáng</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  theme === 'dark' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon size={12} />
                <span>Nền tối</span>
              </button>
            </div>

            {/* Ratio Toggle */}
            <div className="flex items-center gap-1 bg-[#13223b] p-1 rounded-xl border border-[#213b63]">
              {(['9:16', '16:9', '1:1'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition ${
                    aspectRatio === r ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(item => (
              <div 
                key={item.id}
                className="bg-[#0e1a2f] border border-[#192f52] rounded-2xl overflow-hidden hover:border-blue-500/40 transition group flex flex-col"
              >
                {/* Image Container */}
                <div 
                  onClick={() => setPreviewImage(item.fileUrl)}
                  className="relative aspect-[9/16] bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden p-2"
                >
                  <img 
                    src={item.fileUrl} 
                    alt="Threads card" 
                    className="w-full h-full object-contain drop-shadow-xl group-hover:scale-105 transition duration-200" 
                  />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600/80 text-white uppercase">
                      {item.type === 'post' ? 'Bài viết' : 'Bình luận'}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-slate-300">
                      {item.theme === 'light' ? 'Sáng' : 'Tối'}
                    </span>
                  </div>

                  <span className="absolute bottom-2 right-2 text-[9px] bg-black/70 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                    {item.aspectRatio}
                  </span>
                </div>

                {/* Card footer */}
                <div className="p-3 border-t border-[#172744] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {item.width}x{item.height}px
                  </span>

                  <div className="flex items-center gap-1">
                    <a
                      href={item.fileUrl}
                      download
                      className="p-1.5 rounded-lg bg-[#14233c] hover:bg-blue-600 text-slate-300 hover:text-white transition"
                      title="Tải ảnh PNG"
                    >
                      <Download size={13} />
                    </a>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg bg-[#14233c] hover:bg-red-600/30 text-slate-400 hover:text-red-400 transition"
                      title="Xóa ảnh"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#0e1a2f] border border-[#1b3154] rounded-3xl p-14 text-center text-slate-400">
            <ImageIcon size={40} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Chưa có ảnh chụp nào được tạo</p>
            <p className="text-xs text-slate-500 mt-1">
              Bấm nút "Render toàn bộ ảnh" ở phía trên để tự động tạo PNG cho bài viết và các bình luận đã chọn!
            </p>
          </div>
        )}

      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-lg max-h-[90vh] flex items-center justify-center">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white p-1"
            >
              <X size={24} />
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
            />
          </div>
        </div>
      )}

    </div>
  );
};
