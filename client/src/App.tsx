import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { StudioView } from './views/StudioView';
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
  const loadProjects = async (selectId?: string) => {
    try {
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
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
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
        {activeTab === 'studio' && currentProject && (
          <StudioView
            project={currentProject}
            onUpdateProject={(p) => {
              setCurrentProject(p);
              setProjects(prev => prev.map(item => item.id === p.id ? p : item));
            }}
            onOpenResultsModal={handleOpenResults}
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
