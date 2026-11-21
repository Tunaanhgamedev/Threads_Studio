import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { StudioView } from './views/StudioView';
import { AutomationView } from './views/AutomationView';
import { ThreadsConnectorView } from './views/ThreadsConnectorView';
import { DiscoveryView } from './views/DiscoveryView';
import { YouTubePublishingView } from './views/YouTubePublishingView';
import { YouTubeAnalyticsView } from './views/YouTubeAnalyticsView';
import { DashboardView } from './views/DashboardView';
import { SourcesView } from './views/SourcesView';
import { CommentsView } from './views/CommentsView';
import { ScreenshotsView } from './views/ScreenshotsView';
import { ScriptView } from './views/ScriptView';
import { RenderQueueView } from './views/RenderQueueView';
import { LibraryView } from './views/LibraryView';
import { SettingsView } from './views/SettingsView';
import { KeyModal, OptionsModal, VideoModal } from './components/Modals';
import { Project } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [modalVideoTitle, setModalVideoTitle] = useState('');

  // Initial load
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProjects = async (selectId?: string) => {
    try {
      setLoadError(null);
      const projs = await api.getProjects();
      setProjects(projs);
      if (projs.length > 0) {
        if (selectId) {
          const matched = projs.find(p => p.id === selectId);
          setCurrentProject(matched || projs[0]);
        } else if (!currentProject) {
          setCurrentProject(projs[0]);
        } else {
          const matched = projs.find(p => p.id === currentProject.id);
          setCurrentProject(matched || projs[0]);
        }
      } else {
        // Auto-create initial project if empty
        try {
          const created = await api.createProject('https://www.threads.net/share/Bp3XJQNdMh');
          setProjects([created]);
          setCurrentProject(created);
        } catch {}
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setLoadError(err.message || 'Không thể kết nối đến máy chủ API (Port 3210)');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleSelectProject = async (id: string) => {
    try {
      const proj = await api.getProject(id);
      setCurrentProject(proj);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNewProject = async () => {
    const url = prompt('Nhập đường dẫn bài viết Threads:', 'https://www.threads.net/@user/post/demo');
    if (!url) return;
    try {
      const created = await api.createProject(url);
      await loadProjects(created.id);
      setActiveTab('studio');
    } catch (err: any) {
      alert('Lỗi tạo dự án: ' + err.message);
    }
  };

  const handleOpenResults = () => {
    if (currentProject?.lastRenderJob?.outputVideoUrl) {
      setModalVideoUrl(currentProject.lastRenderJob.outputVideoUrl);
      setModalVideoTitle(currentProject.title);
      setIsVideoModalOpen(true);
    } else {
      setActiveTab('queue');
    }
  };

  const handleOpenVideoDirect = (url: string, title: string) => {
    setModalVideoUrl(url);
    setModalVideoTitle(title);
    setIsVideoModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-[#070d19] flex items-center justify-center text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium">Đang khởi động Threads Content Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-[#070d19] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateNewProject={handleCreateNewProject}
        onOpenOptions={() => setIsOptionsModalOpen(true)}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onOpenResults={handleOpenResults}
      />

      {/* Main Studio Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          hasActiveJobs={currentProject?.status === 'rendering'}
        />

        {/* View Switcher */}
        {activeTab === 'studio' && (
          currentProject ? (
            <StudioView
              project={currentProject}
              onUpdateProject={(p) => {
                setCurrentProject(p);
                setProjects(prev => prev.map(item => item.id === p.id ? p : item));
              }}
              onOpenResultsModal={handleOpenResults}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#070d19] p-8 text-center text-slate-400">
              <div className="max-w-md bg-[#0d1729] border border-[#1b2b48] rounded-2xl p-8 shadow-2xl space-y-4">
                <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                  🧵
                </div>
                <h2 className="text-xl font-bold text-white">Chưa chọn dự án Threads nào</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {loadError ? (
                    <span className="text-rose-400 font-medium">{loadError}</span>
                  ) : (
                    'Bắt đầu tạo video đầu tiên bằng cách dán đường dẫn bài viết Threads hoặc chọn từ danh sách.'
                  )}
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleCreateNewProject}
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-blue-600/30"
                  >
                    + Tạo dự án mới
                  </button>
                  <button
                    onClick={() => loadProjects()}
                    className="py-2.5 px-4 bg-[#1a2c4e] hover:bg-[#253e6d] text-slate-200 font-semibold rounded-xl text-xs transition"
                  >
                    Tải lại
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'automation' && (
          <AutomationView
            onOpenVideoModal={handleOpenVideoDirect}
            onSelectProject={handleSelectProject}
            onOpenStudio={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'connector' && (
          <ThreadsConnectorView
            onSelectProject={handleSelectProject}
            onOpenStudio={() => setActiveTab('studio')}
            onOpenAutomation={() => setActiveTab('automation')}
          />
        )}

        {activeTab === 'discovery' && (
          <DiscoveryView
            onSelectProject={handleSelectProject}
            onOpenStudio={() => setActiveTab('studio')}
            onOpenAutomation={() => setActiveTab('automation')}
          />
        )}

        {activeTab === 'youtube' && (
          <YouTubePublishingView
            onOpenVideoModal={handleOpenVideoDirect}
            onOpenStudio={() => setActiveTab('studio')}
            onOpenAnalytics={() => setActiveTab('analytics')}
          />
        )}

        {activeTab === 'analytics' && (
          <YouTubeAnalyticsView
            onOpenVideoModal={handleOpenVideoDirect}
            onOpenStudio={() => setActiveTab('studio')}
            onOpenPublishing={() => setActiveTab('youtube')}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            projects={projects}
            onSelectProject={handleSelectProject}
            onOpenStudio={() => setActiveTab('studio')}
            onCreateNewProject={handleCreateNewProject}
          />
        )}

        {activeTab === 'sources' && (
          <SourcesView
            projects={projects}
            onSelectProject={handleSelectProject}
            onOpenStudio={() => setActiveTab('studio')}
            onRefreshProjects={loadProjects}
          />
        )}

        {activeTab === 'comments' && currentProject && (
          <CommentsView
            project={currentProject}
            onUpdateProject={(p) => {
              setCurrentProject(p);
              setProjects(prev => prev.map(item => item.id === p.id ? p : item));
            }}
          />
        )}

        {activeTab === 'screenshots' && currentProject && (
          <ScreenshotsView
            project={currentProject}
          />
        )}

        {activeTab === 'script' && currentProject && (
          <ScriptView
            project={currentProject}
            onUpdateProject={(p) => {
              setCurrentProject(p);
              setProjects(prev => prev.map(item => item.id === p.id ? p : item));
            }}
          />
        )}

        {activeTab === 'queue' && currentProject && (
          <RenderQueueView
            project={currentProject}
            onOpenStudio={() => setActiveTab('studio')}
            onOpenResults={handleOpenResults}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            projects={projects}
            onOpenVideoModal={handleOpenVideoDirect}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView />
        )}
      </div>

      {/* Modals */}
      <KeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      <OptionsModal isOpen={isOptionsModalOpen} onClose={() => setIsOptionsModalOpen(false)} />
      <VideoModal
        isOpen={isVideoModalOpen}
        videoUrl={modalVideoUrl}
        title={modalVideoTitle}
        onClose={() => setIsVideoModalOpen(false)}
      />
    </div>
  );
};
