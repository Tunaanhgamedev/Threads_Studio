import React, { useState } from 'react';
import { 
  Globe, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  ExternalLink,
  Trash2,
  FileEdit,
  Search,
  Filter,
  Check,
  Layers
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';

interface SourcesViewProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onOpenStudio: () => void;
  onRefreshProjects: () => void;
}

export const SourcesView: React.FC<SourcesViewProps> = ({
  projects,
  onSelectProject,
  onOpenStudio,
  onRefreshProjects
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('Việt Story');
  const [manualContent, setManualContent] = useState('');
  const [manualComments, setManualComments] = useState('');

  const [activeFetchingId, setActiveFetchingId] = useState<string | null>(null);

  // Add single URL
  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    setIsSubmitting(true);
    try {
      const proj = await api.createProject(newUrl);
      setNewUrl('');
      onRefreshProjects();
      onSelectProject(proj.id);
      onOpenStudio();
    } catch (err: any) {
      alert('Lỗi thêm bài viết: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Import
  const handleBulkImport = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setIsSubmitting(true);
    try {
      await api.createProjectBatch(urls);
      setBulkUrls('');
      setIsBulkOpen(false);
      onRefreshProjects();
      alert(`Đã nạp thành công ${urls.length} liên kết Threads vào hệ thống!`);
    } catch (err: any) {
      alert('Lỗi import: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Import
  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualContent.trim()) {
      alert('Vui lòng nhập nội dung bài viết!');
      return;
    }
    setIsSubmitting(true);
    try {
      const proj = await api.createProjectManual({
        title: manualTitle,
        authorName: manualAuthor,
        content: manualContent,
        rawCommentsText: manualComments
      });
      setIsManualOpen(false);
      setManualTitle('');
      setManualContent('');
      setManualComments('');
      onRefreshProjects();
      onSelectProject(proj.id);
      onOpenStudio();
    } catch (err: any) {
      alert('Lỗi tạo bài viết thủ công: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-fetch thread
  const handleRefetch = async (id: string, url: string) => {
    setActiveFetchingId(id);
    try {
      await api.fetchThread(id, url);
      onRefreshProjects();
    } catch (err: any) {
      alert('Lỗi cập nhật dữ liệu: ' + err.message);
    } finally {
      setActiveFetchingId(null);
    }
  };

  // Delete project
  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bài viết "${title}"?`)) {
      try {
        await api.deleteProject(id);
        onRefreshProjects();
      } catch (err: any) {
        alert('Lỗi xóa: ' + err.message);
      }
    }
  };

  // Filtered projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.threadsUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.post.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#070d19]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="text-blue-400" size={22} />
              <span>Quản lý nguồn Threads (Phase 2)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Thu thập dữ liệu bài viết, hình ảnh và toàn bộ bình luận từ liên kết Threads hoặc nhập thủ công.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsManualOpen(true)}
              className="bg-[#122340] hover:bg-[#1a325c] text-slate-200 border border-[#234273] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <FileEdit size={14} className="text-blue-400" />
              <span>Nhập nội dung thủ công</span>
            </button>
            <button
              onClick={() => setIsBulkOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
            >
              <Layers size={14} />
              <span>Nhập hàng loạt (Bulk Import)</span>
            </button>
          </div>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddSingle} className="bg-[#0e1a2f] p-4 rounded-2xl border border-[#192f52] shadow-sm flex gap-3">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Dán link bài viết Threads: https://www.threads.net/@user/post/... hoặc https://www.threads.net/share/..."
            className="flex-1 bg-[#14243f] border border-[#213b63] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newUrl}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <Plus size={15} />
            <span>Thu thập ngay</span>
          </button>
        </form>

        {/* Filter and Search Bar */}
        <div className="bg-[#0e1a2f] p-3.5 rounded-2xl border border-[#192f52] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, người đăng hoặc URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#13223b] border border-[#213b63] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Trạng thái:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'fetched', label: 'Đã thu thập' },
              { id: 'rendering', label: 'Đang tạo video' },
              { id: 'completed', label: 'Hoàn thành' },
              { id: 'error', label: 'Lỗi' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-[#13223b] text-slate-300 hover:bg-[#192b4a]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sources Table */}
        <div className="bg-[#0e1a2f] rounded-2xl border border-[#192f52] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1b3154] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#0a1424]">
                <th className="py-3 px-4">Bài viết & Tiêu đề</th>
                <th className="py-3 px-4">Tác giả</th>
                <th className="py-3 px-4">Bình luận</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#172b49]">
              {filteredProjects.map(p => (
                <tr key={p.id} className="hover:bg-[#122340] transition">
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="font-semibold text-slate-200 line-clamp-1">{p.title}</div>
                    <a 
                      href={p.threadsUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono mt-0.5"
                    >
                      <span className="truncate max-w-[260px]">{p.threadsUrl}</span>
                      <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <img src={p.post?.avatar} alt="Avatar" className="w-6 h-6 rounded-full border border-slate-700" />
                      <div>
                        <div className="text-slate-200 font-medium truncate max-w-[120px]">{p.post?.displayName || 'User'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">@{p.post?.username || 'user'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-slate-200 font-semibold bg-[#13223b] px-2 py-0.5 rounded-lg border border-[#213b63]">
                      {p.comments?.length || 0}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                      p.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : p.status === 'rendering'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : p.status === 'error'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {p.status === 'completed' 
                        ? 'Hoàn thành' 
                        : p.status === 'rendering' 
                        ? 'Đang tạo video' 
                        : p.status === 'error'
                        ? 'Lỗi'
                        : 'Đã thu thập'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleRefetch(p.id, p.threadsUrl)}
                        title="Thu thập lại dữ liệu mới nhất"
                        className="p-1.5 rounded-lg bg-[#14233c] hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 transition"
                      >
                        <RefreshCw size={13} className={activeFetchingId === p.id ? 'animate-spin text-blue-400' : ''} />
                      </button>
                      <button
                        onClick={() => {
                          onSelectProject(p.id);
                          onOpenStudio();
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition"
                      >
                        Vào Studio
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        title="Xóa bài viết"
                        className="p-1.5 rounded-lg bg-[#14233c] hover:bg-red-600/30 text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    Không tìm thấy bài viết Threads nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Bulk Import Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1a2f] border border-[#1e3863] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              <span>Nhập hàng loạt liên kết Threads (Bulk Import)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Mỗi dòng một liên kết bài viết Threads. Hệ thống sẽ tự động trích xuất nội dung và bình luận lần lượt cho từng liên kết.
            </p>
            <textarea
              rows={6}
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder="https://www.threads.net/@user1/post/123&#10;https://www.threads.net/@user2/post/456&#10;https://www.threads.net/share/789"
              className="w-full bg-[#13223b] border border-[#213b63] rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-[#152542] transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={isSubmitting || !bulkUrls.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{isSubmitting ? 'Đang trích xuất...' : 'Bắt đầu nạp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Modal */}
      {isManualOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1a2f] border border-[#1e3863] rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileEdit size={18} className="text-blue-400" />
              <span>Nhập bài viết & bình luận thủ công</span>
            </h3>
            <p className="text-xs text-slate-400">
              Dành cho bài viết riêng tư hoặc khi bạn muốn tự sáng tạo kịch bản không cần cào link từ mạng.
            </p>

            <form onSubmit={handleManualCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tiêu đề dự án</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="VD: Câu chuyện khởi nghiệp năm 25 tuổi"
                    className="w-full bg-[#13223b] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tên tác giả</label>
                  <input
                    type="text"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                    placeholder="VD: Việt Story"
                    className="w-full bg-[#13223b] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nội dung bài viết Threads gốc</label>
                <textarea
                  rows={3}
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Nhập hoặc dán nội dung bài viết..."
                  className="w-full bg-[#13223b] border border-[#213b63] rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Danh sách bình luận (Mỗi dòng một bình luận hoặc định dạng: Tên: Bình luận)
                </label>
                <textarea
                  rows={4}
                  value={manualComments}
                  onChange={(e) => setManualComments(e.target.value)}
                  placeholder="Minh Tuấn: Câu chuyện hay quá bạn ơi!&#10;Linh Đan: Mình cũng từng có trải nghiệm tương tự.&#10;Hải Đăng: Rất đồng tình với quan điểm này."
                  className="w-full bg-[#13223b] border border-[#213b63] rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-[#152542] transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !manualContent.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>Tạo bài viết</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
