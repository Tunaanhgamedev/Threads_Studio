import { Project, VoiceItem, SystemSettings, RenderJob, StudioTemplate, BatchJob, BatchItem } from '../types';

const API_BASE = '/api';

export const api = {
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.projects;
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async createProject(url: string, title?: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async createProjectBatch(urls: string[]): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.projects;
  },

  async createProjectManual(payload: { title?: string; content: string; authorName?: string; rawCommentsText?: string }): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async addComment(projectId: string, comment: { displayName: string; username?: string; content: string; likes?: number }): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async deleteComment(projectId: string, commentId: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/comments/${commentId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async filterComments(projectId: string, options: any): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/comments/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  // Phase 3 - Screenshot Engine
  async getScreenshots(projectId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/screenshots`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.screenshots;
  },

  async renderPostScreenshot(projectId: string, options: any = {}): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/screenshots/render-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.screenshot;
  },

  async renderCommentScreenshot(projectId: string, commentId: string, options: any = {}): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/screenshots/render-comment/${commentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.screenshot;
  },

  async renderBatchScreenshots(projectId: string, options: any = {}): Promise<any[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/screenshots/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.screenshots;
  },

  async deleteScreenshot(projectId: string, screenshotId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/screenshots/${screenshotId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  // Phase 4 - Voice & AI Audio Engine
  async getAudios(projectId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/voice/audios`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.audios;
  },

  async generateSceneAudio(projectId: string, sceneId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/voice/generate-scene/${sceneId}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.audio;
  },

  async generateAllAudios(projectId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/voice/generate-all`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.audios;
  },

  async generateAIScript(projectId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/voice/ai-script`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.scenes;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async fetchThread(id: string, url?: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}/fetch-thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async startRender(id: string): Promise<RenderJob> {
    const res = await fetch(`${API_BASE}/projects/${id}/render`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.job;
  },

  async stopRender(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/projects/${id}/stop-render`, {
      method: 'POST'
    });
    const data = await res.json();
    return data.success;
  },

  async getRenderStatus(id: string): Promise<RenderJob | null> {
    const res = await fetch(`${API_BASE}/projects/${id}/render-status`);
    const data = await res.json();
    return data.job || null;
  },

  async getVoices(): Promise<VoiceItem[]> {
    const res = await fetch(`${API_BASE}/tts/voices`);
    const data = await res.json();
    return data.voices;
  },

  async previewVoice(params: { voiceName?: string; voiceId?: string; speed?: number; text?: string }): Promise<{ audioUrl: string; duration: number; provider: string }> {
    const res = await fetch(`${API_BASE}/tts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data;
  },

  async getServiceStatus(): Promise<{
    tts: { activeProvider: string; piperAvailable: boolean; piperUrl: string };
    ai: { available: boolean; model?: string; availableModels: string[]; baseUrl: string; error?: string };
  }> {
    const res = await fetch(`${API_BASE}/tts/status`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data;
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    return data.settings;
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<void> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  // Phase 6 - Studio Templates
  async getTemplates(): Promise<StudioTemplate[]> {
    const res = await fetch(`${API_BASE}/templates`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.templates;
  },

  async applyTemplate(projectId: string, templateId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/templates/projects/${projectId}/apply-template/${templateId}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data;
  },

  // Media & Native Windows Folder Browser
  async browseFolder(initialPath?: string, title?: string): Promise<string | null> {
    const res = await fetch(`${API_BASE}/media/browse-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialPath, title })
    });
    const data = await res.json();
    return data.path || null;
  },

  async scanFolder(folder: string): Promise<{ success: boolean; exists: boolean; path: string; videoCount: number; audioCount: number; videoFiles?: string[]; audioFiles?: string[] }> {
    const res = await fetch(`${API_BASE}/media/scan-folder?folder=${encodeURIComponent(folder)}`);
    return await res.json();
  },

  // Phase 7 - Automation Engine
  async extractThreadsUrls(text: string): Promise<{ success: boolean; count: number; urls: string[] }> {
    const res = await fetch(`${API_BASE}/automation/extract-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return await res.json();
  },

  async createBatch(urls: string[], config?: any, title?: string): Promise<BatchJob> {
    const res = await fetch(`${API_BASE}/automation/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, config, title })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.batch;
  },

  async getBatches(): Promise<BatchJob[]> {
    const res = await fetch(`${API_BASE}/automation/batches`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.batches;
  },

  async getBatch(id: string): Promise<BatchJob> {
    const res = await fetch(`${API_BASE}/automation/batches/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.batch;
  },

  async cancelBatch(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/automation/batches/${id}/cancel`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async deleteBatch(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/automation/batches/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  }
};
