import React, { useState, useEffect } from 'react';
import {
  Monitor,
  HardDrive,
  Cpu,
  Power,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Radio,
  Sparkles,
  Link2,
  Terminal,
  ShieldCheck,
  FolderSync,
  Layers,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { DesktopStatus, DesktopServicesStatus } from '../types';

export const DesktopManagementView: React.FC = () => {
  const [status, setStatus] = useState<DesktopStatus | null>(null);
  const [services, setServices] = useState<DesktopServicesStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Storage migration form
  const [newStorageDir, setNewStorageDir] = useState('');
  const [copyData, setCopyData] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);

  // Service toggle loaders
  const [isTogglingPiper, setIsTogglingPiper] = useState(false);
  const [isTogglingOllama, setIsTogglingOllama] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, servicesRes] = await Promise.all([
        api.getDesktopStatus(),
        api.getDesktopServices()
      ]);
      setStatus(statusRes);
      setServices(servicesRes);
      if (!newStorageDir && statusRes.storageDir) {
        setNewStorageDir(statusRes.storageDir);
      }
    } catch (err: any) {
      console.error('Error loading desktop data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      api.getDesktopServices().then(setServices).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 6000);
  };

  const handleTogglePiper = async (action: 'start' | 'stop') => {
    setIsTogglingPiper(true);
    try {
      const res = await api.managePiperService(action);
      showToast('success', res.message);
      // Wait for server to bind or release port
      setTimeout(async () => {
        const s = await api.getDesktopServices();
        setServices(s);
        setIsTogglingPiper(false);
      }, 1500);
    } catch (err: any) {
      showToast('error', `Lỗi: ${err.message}`);
      setIsTogglingPiper(false);
    }
  };

  const handleToggleOllama = async (action: 'start' | 'stop') => {
    setIsTogglingOllama(true);
    try {
      const res = await api.manageOllamaService(action);
      showToast('success', res.message);
      setTimeout(async () => {
        const s = await api.getDesktopServices();
        setServices(s);
        setIsTogglingOllama(false);
      }, 1500);
    } catch (err: any) {
      showToast('error', `Lỗi: ${err.message}`);
      setIsTogglingOllama(false);
    }
  };

  const handleChangeStorage = async () => {
    if (!newStorageDir.trim()) {
      showToast('error', 'Vui lòng nhập đường dẫn thư mục lưu trữ hợp lệ.');
      return;
    }
    if (!window.confirm(`Xác nhận chuyển dữ liệu lưu trữ sang: ${newStorageDir}?`)) {
      return;
    }
    setIsMigrating(true);
    try {
      const res = await api.changeStorageDir(newStorageDir.trim(), copyData);
      showToast('success', res.message);
      await loadData();
    } catch (err: any) {
      showToast('error', `Lỗi chuyển dữ liệu: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSelectDirectoryViaElectron = async () => {
    const desktopBridge = (window as any).desktopBridge;
    if (desktopBridge?.selectDirectory) {
      const selected = await desktopBridge.selectDirectory();
      if (selected) {
        setNewStorageDir(selected);
      }
    } else {
      const input = prompt('Nhập đường dẫn thư mục lưu trữ mới trên ổ D hoặc E:', newStorageDir || 'D:\\Threads_Studio_Data');
      if (input) setNewStorageDir(input.trim());
    }
  };

  const handleShutdown = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đóng an toàn Threads Content Studio và dừng tiến trình backend?')) {
      return;
    }
    setIsShuttingDown(true);
    try {
      await api.shutdownDesktop();
      showToast('info', 'Ứng dụng đang đóng an toàn...');
    } catch {
      showToast('info', 'Ứng dụng đang đóng...');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070d19] text-slate-100 overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <div className="bg-[#0b1426] border-b border-[#1b2b48] px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Monitor size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Quản lý Ứng dụng Desktop Windows
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Phase 16
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Khung ứng dụng Electron Desktop, quản lý dịch vụ nền Piper & Ollama, chuyển đổi ổ lưu trữ D/E an toàn và cấu hình deep link.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#172a4d] hover:bg-[#223d6f] active:scale-95 text-xs font-semibold text-slate-200 rounded-xl border border-[#233d6b] transition shadow"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-blue-400' : 'text-slate-400'} />
            Làm mới
          </button>

          <button
            onClick={handleShutdown}
            disabled={isShuttingDown}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold rounded-xl border border-rose-600/40 transition shadow"
          >
            <Power size={13} />
            {isShuttingDown ? 'Đang tắt...' : 'Đóng an toàn'}
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {actionMessage && (
        <div
          className={`mx-6 mt-4 px-4 py-2.5 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
              : actionMessage.type === 'error'
              ? 'bg-rose-950/60 border-rose-800/80 text-rose-200'
              : 'bg-blue-950/60 border-blue-800/80 text-blue-200'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6 space-y-6">
        {/* Row 1: Desktop Status & Runtime Overview */}
        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0d182e] p-4 rounded-2xl border border-[#1a2d4e] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <Monitor size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400">Nền tảng hệ điều hành</div>
                <div className="text-sm font-bold text-white capitalize mt-0.5">
                  Windows {status.arch}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Node {status.nodeVersion}</div>
              </div>
            </div>

            <div className="bg-[#0d182e] p-4 rounded-2xl border border-[#1a2d4e] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400">Backend Express Server</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">Port {status.port} (Sẵn sàng)</div>
                <div className="text-[10px] text-slate-500 font-mono">PID: {status.pid} · Uptime: {status.uptimeSeconds}s</div>
              </div>
            </div>

            <div className="bg-[#0d182e] p-4 rounded-2xl border border-[#1a2d4e] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Link2 size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400">OAuth Deep Link</div>
                <div className="text-sm font-bold text-white mt-0.5 font-mono text-xs">{status.deepLinkProtocol}</div>
                <div className="text-[10px] text-emerald-400 font-semibold">Tự động bắt Authorization</div>
              </div>
            </div>

            <div className="bg-[#0d182e] p-4 rounded-2xl border border-[#1a2d4e] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                <HardDrive size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400">Lưu trữ dữ liệu</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {status.isCustomStorageDir ? 'Tùy chỉnh (Ổ riêng)' : 'Thư mục mặc định'}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{status.storageDir}</div>
              </div>
            </div>
          </div>
        )}

        {/* Row 2: Data Isolation & Storage Migration to Drive D / E */}
        <div className="bg-[#0d182e] p-6 rounded-2xl border border-[#1b2f52] space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <FolderSync size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Tách biệt dữ liệu & Chuyển sang ổ D / E (Data Isolation)</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Cơ sở dữ liệu SQLite, hình ảnh, audio, video render và backup nằm độc lập hoàn toàn với thư mục cài đặt phần mềm. Dữ liệu được bảo toàn 100% khi bạn cập nhật hoặc cài lại ứng dụng.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              An toàn nâng cấp
            </span>
          </div>

          <div className="bg-[#081120] p-4 rounded-xl border border-[#172a48] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Thư mục dữ liệu đang kích hoạt:</span>
              <span className="font-mono text-emerald-400 font-semibold break-all">{status?.storageDir}</span>
            </div>
            {status?.configFilePath && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-[#12223a]">
                <span>Tệp cấu hình AppData:</span>
                <span className="font-mono text-slate-400 break-all">{status.configFilePath}</span>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-3">
            <label className="text-xs font-semibold text-slate-200 block">
              Chuyển đổi hoặc đặt thư mục lưu trữ mới (Ví dụ: <code className="text-blue-400 font-mono">D:\Threads_Studio_Data</code> hoặc <code className="text-blue-400 font-mono">E:\Threads_Studio_Data</code>):
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                value={newStorageDir}
                onChange={(e) => setNewStorageDir(e.target.value)}
                placeholder="D:\Threads_Studio_Data"
                className="flex-1 bg-[#081120] border border-[#1d3356] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSelectDirectoryViaElectron}
                className="px-3.5 py-2 bg-[#172a4d] hover:bg-[#223d6f] text-xs font-semibold text-slate-200 rounded-xl border border-[#233d6b] transition flex items-center gap-1.5"
                title="Chọn thư mục từ máy tính"
              >
                <FolderOpen size={14} />
                Chọn thư mục
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={copyData}
                  onChange={(e) => setCopyData(e.target.checked)}
                  className="rounded bg-[#081120] border-[#1d3356] text-blue-600 focus:ring-0"
                />
                <span>Tự động sao chép toàn bộ database SQLite, video, audio và backups hiện có sang thư mục mới</span>
              </label>

              <button
                type="button"
                onClick={handleChangeStorage}
                disabled={isMigrating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs font-semibold text-white rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center gap-2"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Đang di chuyển dữ liệu...
                  </>
                ) : (
                  'Áp dụng vị trí mới'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Service Management (Piper TTS & Ollama AI) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Piper TTS Server Card */}
          <div className="bg-[#0d182e] p-6 rounded-2xl border border-[#1b2f52] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center">
                    <Radio size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Quản lý Piper TTS Server</h3>
                    <p className="text-xs text-slate-400">Giọng đọc tiếng Việt cục bộ (Cổng 5000)</p>
                  </div>
                </div>

                {services?.piper.running ? (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Đang chạy
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30 flex items-center gap-1.5">
                    <Square size={10} /> Đã dừng
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Máy chủ giọng đọc cục bộ giúp chuyển văn bản bài viết Threads và bình luận thành giọng nói tự nhiên, không tốn phí API, hoạt động hoàn toàn offline.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              {services?.piper.running ? (
                <button
                  onClick={() => handleTogglePiper('stop')}
                  disabled={isTogglingPiper}
                  className="w-full py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold rounded-xl text-xs border border-rose-600/40 transition flex items-center justify-center gap-1.5"
                >
                  <Square size={13} />
                  {isTogglingPiper ? 'Đang dừng...' : 'Dừng Piper Server'}
                </button>
              ) : (
                <button
                  onClick={() => handleTogglePiper('start')}
                  disabled={isTogglingPiper}
                  className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-teal-600/25 flex items-center justify-center gap-1.5"
                >
                  <Play size={13} />
                  {isTogglingPiper ? 'Đang khởi động...' : 'Khởi động Piper Server'}
                </button>
              )}
            </div>
          </div>

          {/* Ollama Local AI Card */}
          <div className="bg-[#0d182e] p-6 rounded-2xl border border-[#1b2f52] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Quản lý Ollama Local AI</h3>
                    <p className="text-xs text-slate-400">Trí tuệ nhân tạo cục bộ (Cổng 11434)</p>
                  </div>
                </div>

                {services?.ollama.running ? (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Đang chạy
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30 flex items-center gap-1.5">
                    <Square size={10} /> Đã dừng
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Ollama cung cấp khả năng phân tích nội dung, tối ưu tiêu đề tò mò và tạo concept thumbnail YouTube Shorts trực tiếp trên phần cứng máy tính của bạn.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              {services?.ollama.running ? (
                <button
                  onClick={() => handleToggleOllama('stop')}
                  disabled={isTogglingOllama}
                  className="w-full py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold rounded-xl text-xs border border-rose-600/40 transition flex items-center justify-center gap-1.5"
                >
                  <Square size={13} />
                  {isTogglingOllama ? 'Đang dừng...' : 'Dừng Ollama'}
                </button>
              ) : (
                <button
                  onClick={() => handleToggleOllama('start')}
                  disabled={isTogglingOllama}
                  className="w-full py-2 px-3 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-violet-600/25 flex items-center justify-center gap-1.5"
                >
                  <Play size={13} />
                  {isTogglingOllama ? 'Đang khởi động...' : 'Khởi động Ollama'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 4: Packaging & Windows NSIS Installer Guide */}
        <div className="bg-[#0d182e] p-6 rounded-2xl border border-[#1b2f52] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Terminal size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Đóng gói Bộ cài đặt Windows (NSIS Installer)</h3>
              <p className="text-xs text-slate-400">Tạo tệp cài đặt Setup .exe cho máy tính người dùng Windows 10/11 x64</p>
            </div>
          </div>

          <div className="bg-[#050b15] p-4 rounded-xl border border-[#14233c] text-xs font-mono space-y-2 text-slate-300">
            <div className="text-slate-400"># Chạy lệnh PowerShell sau tại thư mục gốc dự án để tạo bộ cài:</div>
            <div className="text-emerald-400 font-bold select-all">.\desktop\build.ps1</div>
            <div className="text-slate-500 text-[11px] pt-1">
              File bộ cài đặt sẽ được tạo tự động tại thư mục: <span className="text-slate-300">release\Threads Content Studio Setup 0.16.0.exe</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300 pt-1">
            <div className="bg-[#081120] p-3 rounded-xl border border-[#172a48] space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> Giữ Database an toàn
              </div>
              <p className="text-[11px] text-slate-400">
                Khi nâng cấp phiên bản mới, installer tự động giữ nguyên toàn bộ database và video của bạn.
              </p>
            </div>

            <div className="bg-[#081120] p-3 rounded-xl border border-[#172a48] space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Layers size={14} className="text-blue-400" /> Tích hợp Chromium
              </div>
              <p className="text-[11px] text-slate-400">
                Script đóng gói Playwright Chromium tự động để chụp ảnh thẻ bài viết Threads sắc nét 1080p.
              </p>
            </div>

            <div className="bg-[#081120] p-3 rounded-xl border border-[#172a48] space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Power size={14} className="text-purple-400" /> Đóng an toàn
              </div>
              <p className="text-[11px] text-slate-400">
                Tự động yêu cầu Express đóng kết nối database SQLite và giải phóng tài nguyên trước khi thoát.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
