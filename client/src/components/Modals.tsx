import React, { useState } from 'react';
import { X, Key, Settings, Video, Download, Check } from 'lucide-react';
import { api } from '../services/api';

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyModal: React.FC<KeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await api.updateSettings({ apiKey });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 800);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0e1a2f] border border-[#1e3863] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Key size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Thông tin bản quyền & API Key</h3>
            <p className="text-[11px] text-slate-400">Trạng thái: Đã kích hoạt - Vĩnh viễn</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Mã bản quyền phần mềm</label>
            <input 
              type="text" 
              readOnly 
              value="THREADS-STUDIO-PRO-2026-UNLIMITED" 
              className="w-full bg-[#14243f] border border-[#213b63] rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 select-all"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">OpenAI / Gemini API Key (Tùy chọn cho kịch bản AI)</label>
            <input 
              type="password"
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#14243f] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-[#152542] transition"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            {saved ? <Check size={14} /> : null}
            <span>{saved ? 'Đã lưu!' : 'Lưu lại'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0e1a2f] border border-[#1e3863] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Settings size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Tùy chọn hệ thống</h3>
            <p className="text-[11px] text-slate-400">Thiết lập cấu hình render và hiệu ứng</p>
          </div>
        </div>

        <div className="space-y-3 pt-2 text-xs text-slate-300">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#13223b] border border-[#213b63]">
            <span>Tăng tốc phần cứng GPU (NVENC/VAAPI)</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 focus:ring-0" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#13223b] border border-[#213b63]">
            <span>Tự động phát video sau khi xuất</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 focus:ring-0" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#13223b] border border-[#213b63]">
            <span>Lưu cache thẻ bài viết để tái sử dụng</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 focus:ring-0" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

interface VideoModalProps {
  isOpen: boolean;
  videoUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, videoUrl, title, onClose }) => {
  if (!isOpen || !videoUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b1426] border border-[#1e3863] rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative flex flex-col items-center">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X size={18} />
        </button>

        <h3 className="text-sm font-bold text-white text-center truncate max-w-[260px]">{title || 'Video thành phẩm'}</h3>

        {/* Video Player */}
        <div className="w-[280px] h-[498px] rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-xl relative flex items-center justify-center">
          <video 
            src={videoUrl} 
            controls 
            autoPlay 
            className="w-full h-full object-cover"
          />
        </div>

        <div className="w-full flex items-center justify-between pt-1">
          <a
            href={videoUrl}
            download
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Tải file MP4</span>
          </a>

          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
