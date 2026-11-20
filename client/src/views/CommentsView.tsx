import React, { useState } from 'react';
import { 
  MessageSquare, 
  Heart, 
  Check, 
  X, 
  Search, 
  Filter, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Smile, 
  Scissors, 
  CheckCheck,
  RotateCcw
} from 'lucide-react';
import { Project, ThreadComment } from '../types';
import { api } from '../services/api';

interface CommentsViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

export const CommentsView: React.FC<CommentsViewProps> = ({
  project,
  onUpdateProject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [minLikes, setMinLikes] = useState<number>(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New comment modal state
  const [newAuthor, setNewAuthor] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newLikes, setNewLikes] = useState(150);

  const comments = project.comments || [];

  const filteredComments = comments.filter(c => {
    const matchesSearch = c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLikes = c.likes >= minLikes;
    return matchesSearch && matchesLikes;
  });

  const selectedCount = comments.filter(c => c.selected).length;

  // Estimate read duration
  const estimatedSeconds = comments
    .filter(c => c.selected)
    .reduce((sum, c) => sum + Math.max(3.5, c.content.split(' ').length * 0.4), 0);

  // Toggle selection
  const toggleSelectComment = async (id: string) => {
    const nextComments = comments.map(c => 
      c.id === id ? { ...c, selected: !c.selected } : c
    );
    try {
      const updated = await api.updateProject(project.id, { comments: nextComments });
      onUpdateProject(updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Select all / Deselect all
  const handleSelectAll = async (select: boolean) => {
    const nextComments = comments.map(c => ({ ...c, selected: select }));
    try {
      const updated = await api.updateProject(project.id, { comments: nextComments });
      onUpdateProject(updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Preset Filters via backend service
  const handleApplyPreset = async (presetType: 'top5' | 'top10' | 'emoji' | 'short' | 'dedup') => {
    let options: any = {};
    if (presetType === 'top5') {
      options = { sortBy: 'likes_desc', limit: 5 };
    } else if (presetType === 'top10') {
      options = { sortBy: 'likes_desc', limit: 10 };
    } else if (presetType === 'emoji') {
      options = { onlyWithEmoji: true };
    } else if (presetType === 'short') {
      options = { maxLength: 60 };
    } else if (presetType === 'dedup') {
      options = { deduplicate: true };
    }

    try {
      const updated = await api.filterComments(project.id, options);
      onUpdateProject(updated);
    } catch (err: any) {
      alert('Lỗi áp dụng bộ lọc: ' + err.message);
    }
  };

  // In-place edit comment
  const startEditComment = (c: ThreadComment) => {
    setEditingCommentId(c.id);
    setEditingText(c.content);
  };

  const saveEditComment = async (id: string) => {
    const nextComments = comments.map(c => 
      c.id === id ? { ...c, content: editingText } : c
    );
    try {
      const updated = await api.updateProject(project.id, { comments: nextComments });
      onUpdateProject(updated);
      setEditingCommentId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa bình luận này khỏi dự án?')) {
      try {
        const updated = await api.deleteComment(project.id, commentId);
        onUpdateProject(updated);
      } catch (err: any) {
        alert('Lỗi xóa bình luận: ' + err.message);
      }
    }
  };

  // Add custom comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    try {
      const updated = await api.addComment(project.id, {
        displayName: newAuthor || 'Độc giả',
        content: newContent.trim(),
        likes: newLikes
      });
      onUpdateProject(updated);
      setIsAddModalOpen(false);
      setNewAuthor('');
      setNewContent('');
    } catch (err: any) {
      alert('Lỗi thêm bình luận: ' + err.message);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#070d19]">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="text-purple-400" size={22} />
              <span>Quản lý & Lọc toàn bộ bình luận (Phase 2)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chọn lọc, sắp xếp, lọc cảm xúc và chỉnh sửa trực tiếp nội dung các bình luận trước khi tạo video.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Plus size={14} />
              <span>Thêm bình luận mới</span>
            </button>
          </div>
        </div>

        {/* Stats & Quick Presets Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#0e1a2f] p-3.5 rounded-2xl border border-[#192f52] flex items-center justify-between">
            <span className="text-xs text-slate-400">Tổng số bình luận:</span>
            <span className="text-sm font-bold text-white font-mono">{comments.length}</span>
          </div>
          <div className="bg-[#0e1a2f] p-3.5 rounded-2xl border border-[#192f52] flex items-center justify-between">
            <span className="text-xs text-slate-400">Đã chọn đưa vào video:</span>
            <span className="text-sm font-bold text-blue-400 font-mono">{selectedCount} / {comments.length}</span>
          </div>
          <div className="bg-[#0e1a2f] p-3.5 rounded-2xl border border-[#192f52] flex items-center justify-between">
            <span className="text-xs text-slate-400">Thời lượng đọc dự tính:</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">~{Math.round(estimatedSeconds)}s</span>
          </div>
        </div>

        {/* Filter Presets Toolbar */}
        <div className="bg-[#0e1a2f] p-4 rounded-2xl border border-[#192f52] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Bộ lọc thông minh một chạm (1-Click Filters)</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectAll(true)}
                className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-[#14243f] hover:bg-[#1b2f52] transition flex items-center gap-1"
              >
                <CheckCheck size={12} />
                <span>Chọn tất cả</span>
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-[#14243f] hover:bg-[#1b2f52] transition flex items-center gap-1"
              >
                <RotateCcw size={12} />
                <span>Bỏ chọn</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleApplyPreset('top5')}
              className="bg-[#142542] hover:bg-blue-600 hover:text-white text-blue-300 border border-[#213b63] px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>Top 5 nhiều like nhất</span>
            </button>
            <button
              onClick={() => handleApplyPreset('top10')}
              className="bg-[#142542] hover:bg-blue-600 hover:text-white text-blue-300 border border-[#213b63] px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Sparkles size={13} className="text-purple-400" />
              <span>Top 10 nhiều like nhất</span>
            </button>
            <button
              onClick={() => handleApplyPreset('emoji')}
              className="bg-[#142542] hover:bg-blue-600 hover:text-white text-blue-300 border border-[#213b63] px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Smile size={13} className="text-emerald-400" />
              <span>Có icon cảm xúc (Emoji)</span>
            </button>
            <button
              onClick={() => handleApplyPreset('short')}
              className="bg-[#142542] hover:bg-blue-600 hover:text-white text-blue-300 border border-[#213b63] px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Scissors size={13} className="text-cyan-400" />
              <span>Bình luận ngắn (&lt; 60 từ)</span>
            </button>
            <button
              onClick={() => handleApplyPreset('dedup')}
              className="bg-[#142542] hover:bg-blue-600 hover:text-white text-blue-300 border border-[#213b63] px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span>Lọc trùng lặp & Spam</span>
            </button>
          </div>

          {/* Search & Min Likes input */}
          <div className="pt-2 border-t border-[#172744] flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Tìm từ khóa trong bình luận..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#13223b] border border-[#213b63] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300 self-end sm:self-auto">
              <span className="text-slate-400 text-[11px]">Tối thiểu lượt thích:</span>
              <input
                type="number"
                min="0"
                step="50"
                value={minLikes}
                onChange={(e) => setMinLikes(parseInt(e.target.value) || 0)}
                className="w-20 bg-[#13223b] border border-[#213b63] rounded-lg px-2 py-1 text-xs text-center font-mono focus:outline-none"
              />
              <span className="text-slate-400 text-[11px]">tim</span>
            </div>
          </div>
        </div>

        {/* Comments Grid / List */}
        <div className="space-y-3">
          {filteredComments.map((c, idx) => {
            const isEditing = editingCommentId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => !isEditing && toggleSelectComment(c.id)}
                className={`p-4 rounded-2xl border transition select-none flex items-start gap-3.5 ${
                  c.selected
                    ? 'bg-[#101e38] border-blue-500/50 shadow-md shadow-blue-500/5'
                    : 'bg-[#0d1629] border-[#182b49] opacity-60 hover:opacity-100'
                }`}
              >
                {/* Checkbox icon */}
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border cursor-pointer transition ${
                  c.selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#233f6b] bg-[#122036]'
                }`}>
                  {c.selected && <Check size={13} strokeWidth={3} />}
                </div>

                {/* Avatar */}
                <img src={c.avatar} alt={c.displayName} className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0" />

                {/* Body */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{c.displayName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">@{c.username}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#182945] text-slate-400 font-mono">#{idx + 1}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-red-400 font-mono">
                        <Heart size={12} className="fill-red-400" />
                        <span>{c.likes.toLocaleString()}</span>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditing) {
                            saveEditComment(c.id);
                          } else {
                            startEditComment(c);
                          }
                        }}
                        title={isEditing ? 'Lưu chỉnh sửa' : 'Chỉnh sửa nội dung'}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                      >
                        {isEditing ? <Check size={13} className="text-emerald-400" /> : <Edit3 size={13} />}
                      </button>

                      <button
                        onClick={(e) => handleDeleteComment(e, c.id)}
                        title="Xóa bình luận này"
                        className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Content (view mode or edit mode) */}
                  {isEditing ? (
                    <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        rows={2}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-[#152542] border border-blue-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(null)}
                          className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditComment(c.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {c.content}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-mono">
                    <span>Thời gian: {c.timestamp}</span>
                    <span>·</span>
                    <span>Độ dài: {c.content.length} ký tự</span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredComments.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">
              Không tìm thấy bình luận nào phù hợp với điều kiện tìm kiếm.
            </div>
          )}
        </div>

      </div>

      {/* Add Custom Comment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1a2f] border border-[#1e3863] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus size={18} className="text-blue-400" />
              <span>Thêm bình luận mới vào dự án</span>
            </h3>

            <form onSubmit={handleAddComment} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tên người bình luận</label>
                <input
                  type="text"
                  placeholder="VD: Tuấn Nguyễn"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full bg-[#13223b] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nội dung bình luận</label>
                <textarea
                  rows={3}
                  placeholder="Nhập nội dung bình luận..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-[#13223b] border border-[#213b63] rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Số lượt thích ban đầu</label>
                <input
                  type="number"
                  min="0"
                  value={newLikes}
                  onChange={(e) => setNewLikes(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#13223b] border border-[#213b63] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-[#152542] transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newContent.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>Thêm bình luận</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
