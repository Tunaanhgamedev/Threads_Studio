import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  HardDrive,
  Database,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  Clock,
  Lock,
  Server,
  Cpu,
  Layers,
  Settings2,
  Sparkles,
  Radio,
  FileBox,
  Terminal,
  Search,
  Sliders,
  FolderArchive,
  Activity,
  Zap,
  Gauge,
  Play,
  Pause,
  Save
} from 'lucide-react';
import { api } from '../services/api';
import {
  SystemHealthReport,
  StorageBreakdownStats,
  SystemBackupItem,
  BackupScheduleConfig,
  SystemLogEntry,
  ServiceHealthStatus,
  RenderPerformanceConfig,
  SystemResourceUsage,
  SceneCacheStats
} from '../types';

type ReliabilityTab = 'health' | 'performance' | 'backup' | 'storage' | 'logs';

export const ReliabilityView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReliabilityTab>('health');
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [storageStats, setStorageStats] = useState<StorageBreakdownStats | null>(null);
  const [backups, setBackups] = useState<SystemBackupItem[]>([]);
  const [scheduleConfig, setScheduleConfig] = useState<BackupScheduleConfig | null>(null);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);

  // Phase 18 - Render Performance & Scene Caching States
  const [resourceUsage, setResourceUsage] = useState<SystemResourceUsage | null>(null);
  const [perfConfig, setPerfConfig] = useState<RenderPerformanceConfig>({
    queueEnabled: true,
    maxWorkers: 1,
    minFreeRamGb: 1.5,
    ffmpegPreset: 'veryfast',
    cpuThreads: 0,
    sceneCacheEnabled: true,
    shutdownTimeoutSec: 300
  });
  const [sceneCacheStats, setSceneCacheStats] = useState<SceneCacheStats | null>(null);
  const [isLoadingPerf, setIsLoadingPerf] = useState(false);
  const [isSavingPerf, setIsSavingPerf] = useState(false);
  const [isCleaningCache, setIsCleaningCache] = useState(false);

  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modals & form state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupFormNotes, setBackupFormNotes] = useState('');
  const [backupFormIncludeMedia, setBackupFormIncludeMedia] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const [restoreConfirmBackup, setRestoreConfirmBackup] = useState<SystemBackupItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [isCleaningTemp, setIsCleaningTemp] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Log filters
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  // 1. Initial Load
  useEffect(() => {
    loadHealth();
    loadPerformance();
    loadSceneCache();
    loadStorage();
    loadBackups();
    loadSchedule();
    loadLogs();
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const loadHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const data = await api.getHealthChecks();
      setHealthReport(data);
    } catch (err: any) {
      showToast('error', `Lỗi kiểm tra hệ thống: ${err.message}`);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const loadPerformance = async () => {
    setIsLoadingPerf(true);
    try {
      const data = await api.getRenderPerformance();
      setResourceUsage(data);
      if (data.config) {
        setPerfConfig(data.config);
      }
    } catch (err: any) {
      console.warn('Lỗi đọc hiệu năng render:', err.message);
    } finally {
      setIsLoadingPerf(false);
    }
  };

  const loadSceneCache = async () => {
    try {
      const data = await api.getSceneCacheStats();
      setSceneCacheStats(data);
    } catch (err: any) {
      console.warn('Lỗi đọc cache phân cảnh:', err.message);
    }
  };

  const handleSavePerfConfig = async () => {
    setIsSavingPerf(true);
    try {
      const updated = await api.updateRenderPerformanceConfig(perfConfig);
      setPerfConfig(updated);
      showToast('success', 'Đã lưu cấu hình hiệu năng render & bộ đệm phân cảnh thành công!');
      loadPerformance();
    } catch (err: any) {
      showToast('error', `Lỗi lưu cấu hình: ${err.message}`);
    } finally {
      setIsSavingPerf(false);
    }
  };

  const handleCleanSceneCache = async () => {
    if (!window.confirm('Bạn có chắc muốn dọn dẹp bộ đệm phân cảnh video? (Các job đang chạy sẽ được tự động bảo vệ).')) {
      return;
    }
    setIsCleaningCache(true);
    try {
      const res = await api.cleanSceneCache(false);
      showToast('success', res.message);
      loadSceneCache();
      loadStorage();
    } catch (err: any) {
      showToast('error', `Lỗi dọn dẹp cache: ${err.message}`);
    } finally {
      setIsCleaningCache(false);
    }
  };

  const loadStorage = async () => {
    setIsLoadingStorage(true);
    try {
      const data = await api.getStorageStats();
      setStorageStats(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const data = await api.getBackups();
      setBackups(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const loadSchedule = async () => {
    try {
      const data = await api.getBackupSchedule();
      setScheduleConfig(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await api.getSystemLogs({
        level: logLevelFilter,
        search: logSearchQuery
      });
      setLogs(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // 2. Backup Actions
  const handleCreateManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const newBackup = await api.createBackup({
        backupType: 'manual',
        includeDatabase: true,
        includeMedia: backupFormIncludeMedia,
        includeEnv: false,
        notes: backupFormNotes || 'Bản sao lưu thủ công'
      });
      showToast('success', `Đã tạo bản sao lưu thành công: ${newBackup.filename} (${newBackup.fileSizeFormatted})`);
      setIsBackupModalOpen(false);
      setBackupFormNotes('');
      setBackupFormIncludeMedia(false);
      await loadBackups();
      await loadStorage();
    } catch (err: any) {
      showToast('error', `Lỗi tạo sao lưu: ${err.message}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (id: string, filename: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản sao lưu ${filename}?`)) {
      return;
    }
    try {
      await api.deleteBackup(id);
      showToast('info', `Đã xóa bản sao lưu ${filename}`);
      await loadBackups();
      await loadStorage();
    } catch (err: any) {
      showToast('error', `Lỗi xóa sao lưu: ${err.message}`);
    }
  };

  const handleExecuteRestore = async () => {
    if (!restoreConfirmBackup) return;
    setIsRestoring(true);
    try {
      const result = await api.restoreBackup(restoreConfirmBackup.id);
      showToast('success', result.message);
      setRestoreConfirmBackup(null);
      await loadBackups();
      await loadHealth();
      await loadStorage();
    } catch (err: any) {
      showToast('error', `Lỗi phục hồi dữ liệu: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleUpdateSchedule = async (updates: Partial<BackupScheduleConfig>) => {
    if (!scheduleConfig) return;
    try {
      const updated = await api.updateBackupSchedule(updates);
      setScheduleConfig(updated);
      showToast('success', 'Đã cập nhật lịch sao lưu tự động');
    } catch (err: any) {
      showToast('error', `Lỗi cập nhật lịch sao lưu: ${err.message}`);
    }
  };

  // 3. Storage Actions
  const handleCleanTemp = async () => {
    if (!window.confirm('Dọn dẹp file tạm an toàn trong storage/temp? Các video thành phẩm và tác vụ đang render sẽ không bị ảnh hưởng.')) {
      return;
    }
    setIsCleaningTemp(true);
    try {
      const result = await api.cleanTempFiles();
      showToast('success', result.message);
      await loadStorage();
    } catch (err: any) {
      showToast('error', `Lỗi dọn dẹp file tạm: ${err.message}`);
    } finally {
      setIsCleaningTemp(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Status icon helper
  const renderStatusBadge = (status: 'healthy' | 'degraded' | 'offline') => {
    if (status === 'healthy') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={13} className="text-emerald-400" />
          Sẵn sàng (Healthy)
        </span>
      );
    }
    if (status === 'degraded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle size={13} className="text-amber-400" />
          Cảnh báo (Degraded)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <XCircle size={13} className="text-rose-400" />
        Sự cố (Offline)
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070d19] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner & Header */}
      <div className="bg-[#0b1426] border-b border-[#1b2b48] px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Độ tin cậy, Bảo mật & Sao lưu
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Phase 15
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kiểm tra dịch vụ SQLite & FFmpeg, sao lưu atomic snapshot VACUUM INTO, dọn dẹp ổ đĩa và nhật ký token-masked.
            </p>
          </div>
        </div>

        {/* Global Status & Quick Refresh */}
        <div className="flex items-center gap-3">
          {healthReport && (
            <div className="flex items-center gap-2 bg-[#101e38] px-3 py-1.5 rounded-xl border border-[#1d3358]">
              <span className="text-xs text-slate-400">Trạng thái chung:</span>
              {renderStatusBadge(healthReport.overallStatus)}
            </div>
          )}

          <button
            onClick={() => {
              loadHealth();
              loadStorage();
              loadBackups();
              loadLogs();
            }}
            disabled={isLoadingHealth}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#172a4d] hover:bg-[#223d6f] active:scale-95 text-xs font-semibold text-slate-200 rounded-xl border border-[#233d6b] transition shadow"
          >
            <RefreshCw size={13} className={isLoadingHealth ? 'animate-spin text-blue-400' : 'text-slate-400'} />
            Quét lại
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
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

      {/* Tab Navigation */}
      <div className="px-6 pt-3 border-b border-[#15233c] bg-[#070d19] flex gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'health'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu size={14} />
          <span>Kiểm tra dịch vụ (Health Checks)</span>
          {healthReport && (
            <span className="px-1.5 py-0.2 rounded-md bg-[#13233e] text-[10px] text-slate-300">
              {healthReport.summary.healthyCount}/{healthReport.summary.totalCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'performance'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity size={14} />
          <span>Hiệu năng render (Phase 18)</span>
          {resourceUsage && (
            <span className="px-1.5 py-0.2 rounded-md bg-[#13233e] text-[10px] text-cyan-300 font-mono">
              RAM {resourceUsage.ramUsagePercent}%
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'backup'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database size={14} />
          <span>Sao lưu & Phục hồi (VACUUM INTO)</span>
          <span className="px-1.5 py-0.2 rounded-md bg-[#13233e] text-[10px] text-slate-300">
            {backups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'storage'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive size={14} />
          <span>Dung lượng ổ đĩa & Dọn dẹp</span>
          {storageStats?.totalAppFormatted && (
            <span className="px-1.5 py-0.2 rounded-md bg-[#13233e] text-[10px] text-slate-300">
              {storageStats.totalAppFormatted}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'logs'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal size={14} />
          <span>Nhật ký hệ thống (Masked JSONL)</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: HEALTH CHECKS                                      */}
        {/* ========================================================= */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            {/* Summary Highlights */}
            {healthReport && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0d182e] p-4 rounded-2xl border border-[#1a2d4e] flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{healthReport.summary.healthyCount}</div>
                    <div className="text-xs text-slate-400">Dịch vụ hoạt động hoàn hảo</div>
                  </div>
                </div>

                <div className="bg-[#0d182e] p-4 rounded-2xl border border-[#1a2d4e] flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{healthReport.summary.degradedCount}</div>
                    <div className="text-xs text-slate-400">Dịch vụ cần lưu ý / Cục bộ</div>
                  </div>
                </div>

                <div className="bg-[#0d182e] p-4 rounded-2xl border border-[#1a2d4e] flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{healthReport.summary.offlineCount}</div>
                    <div className="text-xs text-slate-400">Dịch vụ gián đoạn</div>
                  </div>
                </div>

                <div className="bg-[#0d182e] p-4 rounded-2xl border border-[#1a2d4e] flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Thời gian quét</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {new Date(healthReport.checkedAt).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Health Cards Grid */}
            {healthReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. SQLite */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                        <Database size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{healthReport.services.sqlite.name}</h3>
                        <p className="text-[11px] text-slate-400">{healthReport.services.sqlite.version}</p>
                      </div>
                    </div>
                    {renderStatusBadge(healthReport.services.sqlite.status)}
                  </div>
                  <div className="bg-[#091122] p-3 rounded-xl border border-[#152643] text-xs text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Độ trễ truy vấn:</span>
                      <span className="font-mono text-emerald-400">{healthReport.services.sqlite.latencyMs} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dung lượng tệp database:</span>
                      <span className="font-mono text-slate-200">{healthReport.services.sqlite.details?.sizeFormatted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kiểm tra PRAGMA quick_check:</span>
                      <span className="font-semibold text-emerald-400">{healthReport.services.sqlite.details?.quickCheck}</span>
                    </div>
                  </div>
                </div>

                {/* 2. FFmpeg */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                        <Layers size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{healthReport.services.ffmpeg.name}</h3>
                        <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {healthReport.services.ffmpeg.version}
                        </p>
                      </div>
                    </div>
                    {renderStatusBadge(healthReport.services.ffmpeg.status)}
                  </div>
                  <div className="bg-[#091122] p-3 rounded-xl border border-[#152643] text-xs text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">FFmpeg CLI:</span>
                      <span className="text-emerald-400 font-semibold">Khả dụng</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">FFprobe Audio/Video Inspector:</span>
                      <span className="text-emerald-400 font-semibold">Khả dụng</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {healthReport.services.ffmpeg.message}
                    </div>
                  </div>
                </div>

                {/* 3. Piper / VieNeu Voice */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center">
                        <Radio size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{healthReport.services.piper.name}</h3>
                        <p className="text-[11px] text-slate-400">{healthReport.services.piper.version}</p>
                      </div>
                    </div>
                    {renderStatusBadge(healthReport.services.piper.status)}
                  </div>
                  <div className="bg-[#091122] p-3 rounded-xl border border-[#152643] text-xs text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Số lượng giọng đọc sẵn sàng:</span>
                      <span className="font-semibold text-blue-400">6 giọng (Bắc, Trung, Nam)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Động cơ:</span>
                      <span className="text-slate-200">VieNeu Neural + Web Audio</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {healthReport.services.piper.message}
                    </div>
                  </div>
                </div>

                {/* 4. Ollama LLM */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{healthReport.services.ollama.name}</h3>
                        <p className="text-[11px] text-slate-400">{healthReport.services.ollama.version || 'Cục bộ'}</p>
                      </div>
                    </div>
                    {renderStatusBadge(healthReport.services.ollama.status)}
                  </div>
                  <div className="bg-[#091122] p-3 rounded-xl border border-[#152643] text-xs text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cổng dịch vụ:</span>
                      <span className="font-mono text-slate-300">http://localhost:11434</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {healthReport.services.ollama.message}
                    </div>
                  </div>
                </div>

                {/* 5. Playwright Chromium */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                        <Server size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{healthReport.services.playwright.name}</h3>
                        <p className="text-[11px] text-slate-400">Headless Browser Engine</p>
                      </div>
                    </div>
                    {renderStatusBadge(healthReport.services.playwright.status)}
                  </div>
                  <div className="bg-[#091122] p-3 rounded-xl border border-[#152643] text-xs text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Khả năng chụp ảnh thẻ:</span>
                      <span className="text-emerald-400 font-semibold">Tự động hóa DOM / Chromium</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {healthReport.services.playwright.message}
                    </div>
                  </div>
                </div>

                {/* 6. OAuth & AES-256 Security */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                        <Lock size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{healthReport.services.oauth.name}</h3>
                        <p className="text-[11px] text-slate-400">Chuẩn bảo mật mã hóa AES-256-GCM</p>
                      </div>
                    </div>
                    {renderStatusBadge(healthReport.services.oauth.status)}
                  </div>
                  <div className="bg-[#091122] p-3 rounded-xl border border-[#152643] text-xs text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mã hóa khóa AES-256:</span>
                      <span className="text-emerald-400 font-semibold">
                        {healthReport.services.oauth.details?.encryptionKeyConfigured ? 'Đã kích hoạt an toàn' : 'Khóa mặc định'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">YouTube OAuth API:</span>
                      <span className={healthReport.services.oauth.details?.youtubeOAuthConfigured ? 'text-emerald-400' : 'text-slate-400'}>
                        {healthReport.services.oauth.details?.youtubeOAuthConfigured ? 'Đã cấu hình' : 'Tùy chọn'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1.5: RENDER PERFORMANCE & SCENE CACHING (PHASE 18)   */}
        {/* ========================================================= */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Header info & Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-blue-400" />
                  <span>Hiệu năng render & Giám sát tài nguyên (Phase 18)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kiểm soát mức chiếm dụng RAM, CPU, giới hạn worker render đồng thời và quản lý bộ đệm phân cảnh SHA-256.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { loadPerformance(); loadSceneCache(); }}
                disabled={isLoadingPerf}
                className="px-3.5 py-2 bg-[#142542] hover:bg-[#1a335c] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition border border-[#223d68]"
              >
                <RefreshCw size={13} className={isLoadingPerf ? 'animate-spin' : ''} />
                <span>Cập nhật số liệu</span>
              </button>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* RAM Card */}
              <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Bộ nhớ RAM</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Gauge size={16} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {resourceUsage ? resourceUsage.freeMemGb : '1.50 GB'} <span className="text-xs font-normal text-slate-400">trống</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Đang dùng {resourceUsage?.usedMemGb || '---'} / Tổng {resourceUsage?.totalMemGb || '---'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-[#162744] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        (resourceUsage?.ramUsagePercent || 0) > 85 ? 'bg-rose-500' : (resourceUsage?.ramUsagePercent || 0) > 65 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${resourceUsage?.ramUsagePercent || 40}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Ngưỡng tối thiểu: {perfConfig.minFreeRamGb} GB</span>
                    <span>{resourceUsage?.ramUsagePercent || 0}% sử dụng</span>
                  </div>
                </div>
              </div>

              {/* CPU Card */}
              <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Bộ vi xử lý CPU</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Cpu size={16} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {resourceUsage ? `${resourceUsage.cpuCount} Cores` : '8 Cores'}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5" title={resourceUsage?.cpuModel}>
                    {resourceUsage?.cpuModel || 'CPU Processor'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-[#162744] h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.max(8, resourceUsage?.cpuUsagePercent || 15)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Luồng cấu hình: {perfConfig.cpuThreads === 0 ? 'Tự động' : `${perfConfig.cpuThreads} threads`}</span>
                    <span>~{resourceUsage?.cpuUsagePercent || 15}% tải</span>
                  </div>
                </div>
              </div>

              {/* Workers & Queue Card */}
              <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hàng đợi Render</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Layers size={16} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {resourceUsage?.activeWorkers || 0} / {perfConfig.maxWorkers} <span className="text-xs font-normal text-slate-400">Worker</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {resourceUsage?.queuedJobsCount || 0} video đang chờ trong hàng đợi
                  </div>
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${perfConfig.queueEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className="text-xs text-slate-300 font-medium">
                    {perfConfig.queueEnabled ? 'Hàng đợi đang bật (1-2 Worker)' : 'Hàng đợi tắt'}
                  </span>
                </div>
              </div>

              {/* Scene Cache Card */}
              <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cache phân cảnh</span>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Zap size={16} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {sceneCacheStats?.totalScenes || 0} <span className="text-xs font-normal text-slate-400">cảnh</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Dung lượng: {sceneCacheStats?.totalFormatted || '0 B'} ({sceneCacheStats?.projectCount || 0} dự án)
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-cyan-300 font-medium">Chữ ký SHA-256</span>
                  <button
                    type="button"
                    onClick={handleCleanSceneCache}
                    disabled={isCleaningCache || !sceneCacheStats?.totalScenes}
                    className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 size={11} />
                    <span>Dọn cache</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Performance Configuration Form */}
            <div className="bg-[#0d182e] p-6 rounded-2xl border border-[#1b2f52] space-y-6">
              <div className="border-b border-[#1b2f52] pb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders size={16} className="text-blue-400" />
                  <span>Cấu hình hiệu năng & Bộ điều phối tài nguyên</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Điều chỉnh các thông số để tối ưu độ mượt và ngăn chặn tràn RAM khi xuất video dài trên máy tính.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Queue & Memory Guard */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Hàng đợi Render (Render Queue)
                    </label>
                    <div className="flex items-center justify-between p-3 bg-[#081120] rounded-xl border border-[#1b2f52]">
                      <div>
                        <div className="text-xs font-semibold text-white">Bật điều phối hàng đợi</div>
                        <div className="text-[10px] text-slate-400">Giới hạn số video render đồng thời để tránh quá tải RAM</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={perfConfig.queueEnabled}
                        onChange={(e) => setPerfConfig({ ...perfConfig, queueEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-500 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Số video xử lý đồng thời (Max Workers)
                    </label>
                    <select
                      value={perfConfig.maxWorkers}
                      onChange={(e) => setPerfConfig({ ...perfConfig, maxWorkers: Number(e.target.value) })}
                      className="w-full bg-[#081120] border border-[#1b2f52] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value={1}>1 Worker (Mặc định - Khuyên dùng để hạn chế RAM)</option>
                      <option value={2}>2 Workers (Chỉ dùng khi máy có từ 16GB RAM trở lên)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Khuyên dùng 1 worker để giữ ổn định tối đa cho máy tính trong suốt quá trình render.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        RAM trống tối thiểu trước khi render
                      </label>
                      <span className="text-xs font-mono font-bold text-cyan-400">{perfConfig.minFreeRamGb} GB</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.5"
                      value={perfConfig.minFreeRamGb}
                      onChange={(e) => setPerfConfig({ ...perfConfig, minFreeRamGb: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#162744] rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>0.5 GB</span>
                      <span className="text-amber-400 font-medium">1.5 GB (Khuyên dùng)</span>
                      <span>4.0 GB</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: FFmpeg & CPU Threads */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      FFmpeg Encoding Preset
                    </label>
                    <select
                      value={perfConfig.ffmpegPreset}
                      onChange={(e) => setPerfConfig({ ...perfConfig, ffmpegPreset: e.target.value as any })}
                      className="w-full bg-[#081120] border border-[#1b2f52] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="ultrafast">ultrafast - Nhanh nhất (File lớn, chiếm ít CPU nhất)</option>
                      <option value="superfast">superfast - Rất nhanh</option>
                      <option value="veryfast">veryfast - Cân bằng hoàn hảo (Khuyên dùng)</option>
                      <option value="faster">faster - Nhanh vừa</option>
                      <option value="fast">fast - Chuẩn</option>
                      <option value="medium">medium - Tối ưu nén cao nhất (Chiếm nhiều CPU)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Preset 'veryfast' cho chất lượng hình ảnh sắc nét và tốc độ xuất MP4 nhanh chóng.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Số luồng CPU (CPU Threads)
                    </label>
                    <select
                      value={perfConfig.cpuThreads}
                      onChange={(e) => setPerfConfig({ ...perfConfig, cpuThreads: Number(e.target.value) })}
                      className="w-full bg-[#081120] border border-[#1b2f52] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value={0}>Auto (0) - FFmpeg tự động phân bổ theo số lõi CPU</option>
                      <option value={1}>1 Luồng - Giữ máy mát tối đa</option>
                      <option value={2}>2 Luồng</option>
                      <option value={4}>4 Luồng</option>
                      <option value={6}>6 Luồng</option>
                      <option value={8}>8 Luồng</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Bộ đệm phân cảnh (Scene Caching & Resume)
                    </label>
                    <div className="flex items-center justify-between p-3 bg-[#081120] rounded-xl border border-[#1b2f52]">
                      <div>
                        <div className="text-xs font-semibold text-white">Bật lưu cache từng cảnh SHA-256</div>
                        <div className="text-[10px] text-slate-400">Cho phép tạm dừng và khôi phục video ngay lập tức</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={perfConfig.sceneCacheEnabled}
                        onChange={(e) => setPerfConfig({ ...perfConfig, sceneCacheEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-500 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action save button */}
              <div className="flex justify-end pt-2 border-t border-[#1b2f52]">
                <button
                  type="button"
                  onClick={handleSavePerfConfig}
                  disabled={isSavingPerf}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} className={isSavingPerf ? 'animate-spin' : ''} />
                  <span>{isSavingPerf ? 'Đang lưu...' : 'Lưu cấu hình hiệu năng'}</span>
                </button>
              </div>
            </div>

            {/* Workflow Info Guide Card */}
            <div className="bg-[#0b1528] p-5 rounded-2xl border border-[#1b2f52]/80 space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Quy trình Tạm dừng, Tiếp tục & Phục hồi sự cố (Phase 18)</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
                <div className="p-3 bg-[#070e1c] rounded-xl border border-[#172744]">
                  <div className="font-semibold text-blue-400 mb-1">1. Từng cảnh độc lập</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Mỗi phân cảnh được render thành file MP4 tạm thời và gán mã băm SHA-256 duy nhất.
                  </p>
                </div>
                <div className="p-3 bg-[#070e1c] rounded-xl border border-[#172744]">
                  <div className="font-semibold text-emerald-400 mb-1">2. Tái sử dụng thông minh</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Khi tiếp tục, ứng dụng dùng FFprobe kiểm tra cảnh cũ. Cảnh chuẩn được giữ nguyên, chỉ render cảnh mới.
                  </p>
                </div>
                <div className="p-3 bg-[#070e1c] rounded-xl border border-[#172744]">
                  <div className="font-semibold text-purple-400 mb-1">3. Đóng ứng dụng an toàn</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Hệ thống đợi worker kết thúc cảnh hiện tại trước khi tắt, tự động chuyển về trạng thái tạm dừng khi mở lại.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BACKUP & RESTORE                                   */}
        {/* ========================================================= */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            {/* Header controls & Automated Schedule Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Manual Backup Trigger */}
              <div className="bg-[#0d182e] p-6 rounded-2xl border border-[#1b2f52] flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3">
                    <Database size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white">Tạo bản sao lưu ngay (VACUUM INTO)</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Sử dụng cơ chế sao lưu nóng an toàn tuyệt đối của SQLite. Dữ liệu được đóng gói snapshot nguyên vẹn mà không làm gián đoạn các tiến trình đang đọc/ghi.
                  </p>
                </div>
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
                >
                  <FolderArchive size={14} />
                  + Tạo bản sao lưu mới
                </button>
              </div>

              {/* Automated Schedule Card */}
              <div className="lg:col-span-2 bg-[#0d182e] p-6 rounded-2xl border border-[#1b2f52] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Lịch sao lưu tự động (Automated Backup)</h3>
                      <p className="text-xs text-slate-400">
                        {scheduleConfig?.enabled 
                          ? `Đang bật: Tự động sao lưu mỗi ${scheduleConfig.intervalHours} giờ (Giữ lại ${scheduleConfig.keepCount} bản)`
                          : 'Hiện đang tắt. Bạn có thể bật lịch định kỳ từ 6 đến 168 giờ.'}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleConfig?.enabled || false}
                      onChange={(e) => handleUpdateSchedule({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {scheduleConfig && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#162744]">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Chu kỳ sao lưu</label>
                      <select
                        value={scheduleConfig.intervalHours}
                        onChange={(e) => handleUpdateSchedule({ intervalHours: Number(e.target.value) })}
                        disabled={!scheduleConfig.enabled}
                        className="w-full bg-[#081120] border border-[#1d3356] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value={6}>Mỗi 6 giờ</option>
                        <option value={12}>Mỗi 12 giờ</option>
                        <option value={24}>Mỗi 24 giờ (Hằng ngày)</option>
                        <option value={48}>Mỗi 48 giờ (2 ngày)</option>
                        <option value={72}>Mỗi 72 giờ (3 ngày)</option>
                        <option value={168}>Mỗi 168 giờ (Hằng tuần)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Số bản giữ lại (Xoay vòng)</label>
                      <select
                        value={scheduleConfig.keepCount}
                        onChange={(e) => handleUpdateSchedule({ keepCount: Number(e.target.value) })}
                        disabled={!scheduleConfig.enabled}
                        className="w-full bg-[#081120] border border-[#1d3356] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value={3}>Giữ 3 bản gần nhất</option>
                        <option value={5}>Giữ 5 bản (Khuyên dùng)</option>
                        <option value={10}>Giữ 10 bản</option>
                        <option value={20}>Giữ 20 bản</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Lần chạy kế tiếp</label>
                      <div className="w-full bg-[#081120] border border-[#1d3356] rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono">
                        {scheduleConfig.enabled && scheduleConfig.nextRunAt
                          ? new Date(scheduleConfig.nextRunAt).toLocaleString('vi-VN')
                          : 'Chưa kích hoạt'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Backups List Table */}
            <div className="bg-[#0d182e] rounded-2xl border border-[#1b2f52] overflow-hidden">
              <div className="p-4 border-b border-[#1b2f52] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Danh sách bản sao lưu ({backups.length})</h3>
                  <p className="text-xs text-slate-400">Các bản snapshot SQLite và bản lưu an toàn pre-restore</p>
                </div>
                <button
                  onClick={loadBackups}
                  disabled={isLoadingBackups}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#162744] transition"
                  title="Tải lại danh sách"
                >
                  <RefreshCw size={14} className={isLoadingBackups ? 'animate-spin' : ''} />
                </button>
              </div>

              {backups.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Database size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-xs">Chưa có bản sao lưu nào. Hãy bấm "Tạo bản sao lưu mới" ở trên.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#152747] bg-[#091222] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Tên tệp & Ghi chú</th>
                        <th className="py-3 px-4">Phân loại</th>
                        <th className="py-3 px-4">Dung lượng</th>
                        <th className="py-3 px-4">Thời gian tạo</th>
                        <th className="py-3 px-4">Mã kiểm tra SHA-256</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#13233e]">
                      {backups.map(item => (
                        <tr key={item.id} className="hover:bg-[#101e38] transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white font-mono text-[11px]">{item.filename}</div>
                            {item.notes && <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>}
                          </td>
                          <td className="py-3 px-4">
                            {item.backupType === 'pre-restore' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Pre-Restore Shield
                              </span>
                            ) : item.backupType === 'scheduled' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Định kỳ (Scheduled)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                Thủ công (Manual)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {item.fileSizeFormatted}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(item.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleCopyHash(item.sha256Hash)}
                              className="group flex items-center gap-1.5 font-mono text-[11px] text-slate-400 hover:text-blue-300 transition"
                              title="Bấm để sao chép toàn bộ mã SHA-256"
                            >
                              <span>{item.sha256Hash.substring(0, 10)}...{item.sha256Hash.substring(item.sha256Hash.length - 6)}</span>
                              {copiedHash === item.sha256Hash ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} className="opacity-0 group-hover:opacity-100" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setRestoreConfirmBackup(item)}
                                className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-xs font-semibold border border-amber-600/40 transition flex items-center gap-1"
                              >
                                <RotateCcw size={12} />
                                Phục hồi
                              </button>
                              <button
                                onClick={() => handleDeleteBackup(item.id, item.filename)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="Xóa bản sao lưu"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: STORAGE BREAKDOWN & SAFE TEMP CLEAN                */}
        {/* ========================================================= */}
        {activeTab === 'storage' && (
          <div className="space-y-6">
            {/* Total Disk Space Progress Bar */}
            {storageStats && (
              <div className="bg-[#0d182e] p-6 rounded-2xl border border-[#1b2f52] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                      <HardDrive size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Dung lượng ổ cứng lưu trữ hệ thống</h3>
                      <p className="text-xs text-slate-400">
                        Threads Content Studio sử dụng {storageStats.totalAppFormatted} trên ổ đĩa
                      </p>
                    </div>
                  </div>

                  {storageStats.diskFreeFormatted && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Còn trống</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        {storageStats.diskFreeFormatted} / {storageStats.diskTotalFormatted}
                      </div>
                    </div>
                  )}
                </div>

                {storageStats.diskUsagePercent !== undefined && (
                  <div className="space-y-1.5">
                    <div className="w-full h-3 bg-[#081120] rounded-full overflow-hidden border border-[#1b2f52] flex">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all"
                        style={{ width: `${storageStats.diskUsagePercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Đã dùng: {storageStats.diskUsagePercent}%</span>
                      <span>Còn trống: {100 - storageStats.diskUsagePercent}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Storage Distribution Grid */}
            {storageStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Videos */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Video đã render (MP4)</div>
                    <div className="text-lg font-bold text-white font-mono mt-1">{storageStats.videosFormatted}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">storage/videos</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <FileBox size={20} />
                  </div>
                </div>

                {/* Images */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Hình ảnh thẻ & Thumbnail</div>
                    <div className="text-lg font-bold text-white font-mono mt-1">{storageStats.imagesFormatted}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">storage/images</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                    <FileBox size={20} />
                  </div>
                </div>

                {/* Audio */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Âm thanh & Lồng tiếng (TTS)</div>
                    <div className="text-lg font-bold text-white font-mono mt-1">{storageStats.audioFormatted}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">storage/audio</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Radio size={20} />
                  </div>
                </div>

                {/* SQLite DB */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Cơ sở dữ liệu SQLite</div>
                    <div className="text-lg font-bold text-white font-mono mt-1">{storageStats.sqliteFormatted}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">threads_studio.sqlite</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Database size={20} />
                  </div>
                </div>

                {/* Backups */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Các bản sao lưu Snapshot</div>
                    <div className="text-lg font-bold text-white font-mono mt-1">{storageStats.backupsFormatted}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">storage/backups</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <FolderArchive size={20} />
                  </div>
                </div>

                {/* Temp */}
                <div className="bg-[#0d182e] p-5 rounded-2xl border border-[#1b2f52] flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Thư mục tạm (Cache/Temp)</div>
                    <div className="text-lg font-bold text-white font-mono mt-1">{storageStats.tempFormatted}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">storage/temp</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Trash2 size={20} />
                  </div>
                </div>
              </div>
            )}

            {/* Safe Temp Cleaning Section */}
            <div className="bg-[#0d182e] p-6 rounded-2xl border border-[#1b2f52] flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Dọn dẹp file tạm an toàn (Safe Temp Cleanup)</h3>
                <p className="text-xs text-slate-400 max-w-xl">
                  Hệ thống tự động bảo vệ các tác vụ render đang hoạt động và không xóa video thành phẩm. Thao tác này chỉ xóa các frame rác và cache cũ trong <code className="text-blue-400 font-mono">storage/temp</code>.
                </p>
              </div>

              <button
                onClick={handleCleanTemp}
                disabled={isCleaningTemp}
                className="py-2.5 px-5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-amber-600/25 flex items-center gap-2"
              >
                <Trash2 size={14} className={isCleaningTemp ? 'animate-spin' : ''} />
                {isCleaningTemp ? 'Đang dọn dẹp...' : 'Dọn dẹp file tạm an toàn'}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SYSTEM LOGS (JSONL WITH REDACTION)                 */}
        {/* ========================================================= */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="bg-[#0d182e] p-4 rounded-2xl border border-[#1b2f52] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-[#081120] px-3 py-1.5 rounded-xl border border-[#1d3356]">
                  <Search size={14} className="text-slate-400" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
                    placeholder="Tìm theo nội dung hoặc module..."
                    className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-48 sm:w-64"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Mức độ:</span>
                  <select
                    value={logLevelFilter}
                    onChange={(e) => setLogLevelFilter(e.target.value)}
                    className="bg-[#081120] border border-[#1d3356] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all">Tất cả (All)</option>
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadLogs}
                  disabled={isLoadingLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#172a4d] hover:bg-[#223d6f] text-xs font-semibold text-slate-200 rounded-xl border border-[#233d6b] transition"
                >
                  <RefreshCw size={13} className={isLoadingLogs ? 'animate-spin' : ''} />
                  Làm mới
                </button>
              </div>
            </div>

            {/* Log Security Banner */}
            <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
              <Lock size={15} className="shrink-0 text-emerald-400" />
              <span>
                <strong>Bảo mật tích hợp:</strong> Mọi token, secret, khóa AES-256 và header authorization đều được kiểm duyệt và che tự động trước khi ghi vào <code className="font-mono text-emerald-200">storage/logs/system.jsonl</code>.
              </span>
            </div>

            {/* Monospace Log Viewer */}
            <div className="bg-[#050b15] border border-[#15233c] rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-[600px] divide-y divide-[#0f1d33]">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Terminal size={28} className="mx-auto mb-2 opacity-30" />
                  Không có nhật ký nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                logs.map((entry, idx) => (
                  <div key={idx} className="py-2.5 flex items-start gap-3 hover:bg-[#0a1424] px-2 rounded-lg transition">
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                        entry.level === 'error'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : entry.level === 'warn'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {entry.level}
                    </span>
                    <span className="text-purple-400 font-semibold shrink-0 text-[11px]">[{entry.module}]</span>
                    <span className="text-slate-200 break-all flex-1">{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: CREATE MANUAL BACKUP                               */}
      {/* ========================================================= */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d182e] border border-[#1b2f52] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Tạo bản sao lưu mới (Snapshot)</h3>
                <p className="text-xs text-slate-400">VACUUM INTO an toàn cho cơ sở dữ liệu SQLite</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Ghi chú bản sao lưu (Tùy chọn)</label>
                <input
                  type="text"
                  value={backupFormNotes}
                  onChange={(e) => setBackupFormNotes(e.target.value)}
                  placeholder="Ví dụ: Trước khi cập nhật cấu hình kênh YouTube..."
                  className="w-full bg-[#081120] border border-[#1d3356] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-[#081120] rounded-xl border border-[#172a48] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-200 font-medium">Bao gồm cơ sở dữ liệu SQLite</div>
                    <div className="text-[11px] text-slate-400">Snapshot atomic VACUUM INTO + SHA-256</div>
                  </div>
                  <span className="text-emerald-400 font-bold">Mặc định</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsBackupModalOpen(false)}
                disabled={isCreatingBackup}
                className="px-4 py-2 bg-[#172a4d] hover:bg-[#223d6f] text-xs font-semibold text-slate-300 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateManualBackup}
                disabled={isCreatingBackup}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs font-semibold text-white rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center gap-2"
              >
                {isCreatingBackup ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Đang tạo snapshot...
                  </>
                ) : (
                  'Bắt đầu sao lưu'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESTORE CONFIRMATION WITH PRE-RESTORE SAFETY       */}
      {/* ========================================================= */}
      {restoreConfirmBackup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d182e] border border-amber-600/40 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xác nhận phục hồi cơ sở dữ liệu</h3>
                <p className="text-xs text-amber-300/80 font-mono">{restoreConfirmBackup.filename}</p>
              </div>
            </div>

            <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl space-y-2 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <ShieldCheck size={16} />
                Cơ chế bảo vệ Rollback Pre-Restore Shield:
              </div>
              <p className="leading-relaxed">
                Trước khi ghi đè cơ sở dữ liệu hiện tại, hệ thống sẽ <strong>tự động tạo một snapshot an toàn pre-restore</strong>. Nếu bạn phục hồi nhầm, bạn có thể hoàn tác ngay lập tức mà không lo mất dữ liệu.
              </p>
            </div>

            <div className="bg-[#081120] p-3 rounded-xl border border-[#172a48] text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Dung lượng:</span>
                <span className="font-mono text-white">{restoreConfirmBackup.fileSizeFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày tạo:</span>
                <span className="text-white">{new Date(restoreConfirmBackup.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SHA-256:</span>
                <span className="font-mono text-[11px] text-slate-400">{restoreConfirmBackup.sha256Hash.substring(0, 16)}...</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setRestoreConfirmBackup(null)}
                disabled={isRestoring}
                className="px-4 py-2 bg-[#172a4d] hover:bg-[#223d6f] text-xs font-semibold text-slate-300 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-xs font-semibold text-white rounded-xl transition shadow-lg shadow-amber-600/30 flex items-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Đang phục hồi an toàn...
                  </>
                ) : (
                  'Tôi hiểu, tiến hành phục hồi'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
