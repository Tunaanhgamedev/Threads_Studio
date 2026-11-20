import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, CheckCircle2, AlertTriangle, Key, HardDrive, Cpu, Save } from 'lucide-react';
import { SystemSettings } from '../types';
import { api } from '../services/api';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'local'>('gemini');
  const [defaultVoice, setDefaultVoice] = useState('VieNeu - Ngọc Huyền (Nữ miền Bắc)');
  const [ffmpegPath, setFfmpegPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then(s => {
      setSettings(s);
      setApiKey(s.apiKey);
      setAiProvider(s.aiProvider);
      setDefaultVoice(s.defaultVoice);
      setFfmpegPath(s.ffmpegPath);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings({
        apiKey,
        aiProvider,
        defaultVoice,
        ffmpegPath
      });
      alert('Đã lưu cấu hình hệ thống!');
    } catch (err: any) {
      alert('Lỗi lưu cấu hình: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#070d19]">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="text-blue-400" size={22} />
            <span>Cài đặt hệ thống Threads Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cấu hình công cụ render FFmpeg, khóa API AI và giọng đọc mặc định.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* FFmpeg Status Card */}
          <div className="bg-[#0e1a2f] border border-[#1b3154] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="text-blue-400" size={18} />
                <h3 className="text-sm font-bold text-white">Công cụ nén video FFmpeg</h3>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                settings?.ffmpegDetected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {settings?.ffmpegDetected ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>Đã nhận diện trên máy</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} />
                    <span>Chưa phát hiện</span>
                  </>
                )}
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Đường dẫn thực thi ffmpeg.exe</label>
              <input
                type="text"
                value={ffmpegPath}
                onChange={(e) => setFfmpegPath(e.target.value)}
                className="w-full bg-[#13223b] border border-[#213b63] rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Đã phát hiện: D:\DevData\ffmpeg\bin\ffmpeg.exe
              </p>
            </div>
          </div>

          {/* AI Provider & API Key */}
          <div className="bg-[#0e1a2f] border border-[#1b3154] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Key className="text-amber-400" size={18} />
              <h3 className="text-sm font-bold text-white">Trí tuệ nhân tạo (Kịch bản & Tóm tắt)</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nhà cung cấp AI</label>
                <select
                  value={aiProvider}
                  onChange={(e: any) => setAiProvider(e.target.value)}
                  className="w-full bg-[#13223b] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="gemini">Google Gemini 2.5 / 3.0</option>
                  <option value="openai">OpenAI GPT-4o</option>
                  <option value="local">Ollama / Local LLM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Khóa API (API Key)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Nhập API Key nếu có..."
                  className="w-full bg-[#13223b] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Storage Path */}
          <div className="bg-[#0e1a2f] border border-[#1b3154] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="text-emerald-400" size={18} />
              <h3 className="text-sm font-bold text-white">Thư mục lưu trữ dự án</h3>
            </div>
            <p className="text-xs text-slate-400 font-mono bg-[#13223b] p-3 rounded-xl border border-[#213b63] truncate">
              {settings?.storagePath || 'E:\\Threads_Studio\\storage'}
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-2"
            >
              <Save size={15} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
