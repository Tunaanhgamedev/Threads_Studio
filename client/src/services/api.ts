import { Project, VoiceItem, SystemSettings, RenderJob, StudioTemplate, BatchJob, BatchItem } from '../types';

const API_BASE = '/api';

async function fetchJson<T = any>(url: string, init?: RequestInit, retries = 3): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, init);
      const contentType = res.headers.get('content-type') || '';

      if (res.ok) {
        if (contentType.includes('application/json')) {
          return await res.json();
        }
        // If 200 OK but returned HTML (e.g. Vite index.html fallback for proxy/server still starting)
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        throw new Error('Máy chủ đang khởi động, vui lòng thử lại sau giây lát.');
      }

      if (contentType.includes('application/json')) {
        const errData = await res.json().catch(() => null);
        if (errData?.error) throw new Error(errData.error);
      }

      if (attempt < retries - 1 && (res.status >= 500 || res.status === 404)) {
        await new Promise(r => setTimeout(r, 600));
        continue;
      }
      throw new Error(`Máy chủ phản hồi mã ${res.status}`);
    } catch (err: any) {
      lastErr = err;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 600));
      }
    }
  }
  throw lastErr || new Error('Không thể kết nối máy chủ backend');
}

export const api = {
  async getProjects(): Promise<Project[]> {
    const data = await fetchJson<{ success: boolean; projects: Project[]; error?: string }>(`${API_BASE}/projects`);
    if (!data.success) throw new Error(data.error);
    return data.projects || [];
  },

  async getProject(id: string): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/projects/${id}`);
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async createProject(url: string, title?: string): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title })
    });
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async createProjectBatch(urls: string[]): Promise<Project[]> {
    const data = await fetchJson<{ success: boolean; projects: Project[]; error?: string }>(`${API_BASE}/projects/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls })
    });
    if (!data.success) throw new Error(data.error);
    return data.projects || [];
  },

  async createProjectManual(payload: { title?: string; content: string; authorName?: string; rawCommentsText?: string }): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/projects/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async deleteProject(id: string): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/projects/${id}`, {
      method: 'DELETE'
    });
    if (!data.success) throw new Error(data.error);
  },

  async addComment(projectId: string, comment: { displayName: string; username?: string; content: string; likes?: number }): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/projects/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async deleteComment(projectId: string, commentId: string): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/projects/${projectId}/comments/${commentId}`, {
      method: 'DELETE'
    });
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async filterComments(projectId: string, options: any): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/projects/${projectId}/comments/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  // Phase 3 - Screenshot Engine
  async getScreenshots(projectId: string): Promise<any[]> {
    const data = await fetchJson<{ success: boolean; screenshots: any[]; error?: string }>(`${API_BASE}/projects/${projectId}/screenshots`);
    if (!data.success) throw new Error(data.error);
    return data.screenshots || [];
  },

  async renderPostScreenshot(projectId: string, options: any = {}): Promise<any> {
    const data = await fetchJson<{ success: boolean; screenshot: any; error?: string }>(`${API_BASE}/projects/${projectId}/screenshots/render-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    if (!data.success) throw new Error(data.error);
    return data.screenshot;
  },

  async renderCommentScreenshot(projectId: string, commentId: string, options: any = {}): Promise<any> {
    const data = await fetchJson<{ success: boolean; screenshot: any; error?: string }>(`${API_BASE}/projects/${projectId}/screenshots/render-comment/${commentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    if (!data.success) throw new Error(data.error);
    return data.screenshot;
  },

  async renderBatchScreenshots(projectId: string, options: any = {}): Promise<any[]> {
    const data = await fetchJson<{ success: boolean; screenshots: any[]; error?: string }>(`${API_BASE}/projects/${projectId}/screenshots/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    if (!data.success) throw new Error(data.error);
    return data.screenshots || [];
  },

  async deleteScreenshot(projectId: string, screenshotId: string): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/projects/${projectId}/screenshots/${screenshotId}`, {
      method: 'DELETE'
    });
    if (!data.success) throw new Error(data.error);
  },

  // Phase 4 - Voice & AI Audio Engine
  async getAudios(projectId: string): Promise<any[]> {
    const data = await fetchJson<{ success: boolean; audios: any[]; error?: string }>(`${API_BASE}/projects/${projectId}/voice/audios`);
    if (!data.success) throw new Error(data.error);
    return data.audios || [];
  },

  async generateSceneAudio(projectId: string, sceneId: string): Promise<any> {
    const data = await fetchJson<{ success: boolean; audio: any; error?: string }>(`${API_BASE}/projects/${projectId}/voice/generate-scene/${sceneId}`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return data.audio;
  },

  async generateAllAudios(projectId: string): Promise<any[]> {
    const data = await fetchJson<{ success: boolean; audios: any[]; error?: string }>(`${API_BASE}/projects/${projectId}/voice/generate-all`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return data.audios || [];
  },

  async generateAIScript(projectId: string): Promise<any[]> {
    const data = await fetchJson<{ success: boolean; scenes: any[]; error?: string }>(`${API_BASE}/projects/${projectId}/voice/ai-script`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return data.scenes || [];
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async fetchThread(id: string, url?: string): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/projects/${id}/fetch-thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async startRender(id: string): Promise<RenderJob> {
    const data = await fetchJson<{ success: boolean; job: RenderJob; error?: string }>(`${API_BASE}/projects/${id}/render`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return data.job;
  },

  async stopRender(id: string): Promise<boolean> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/projects/${id}/stop-render`, {
      method: 'POST'
    });
    return data.success;
  },

  async getRenderStatus(id: string): Promise<RenderJob | null> {
    try {
      const data = await fetchJson<{ success: boolean; job: RenderJob }>(`${API_BASE}/projects/${id}/render-status`);
      return data.job || null;
    } catch {
      return null;
    }
  },

  async getVoices(): Promise<VoiceItem[]> {
    const data = await fetchJson<{ success: boolean; voices: VoiceItem[]; error?: string }>(`${API_BASE}/tts/voices`);
    return data.voices || [];
  },

  async previewVoice(params: { voiceName?: string; voiceId?: string; speed?: number; text?: string }): Promise<{ audioUrl: string; duration: number; provider: string }> {
    const data = await fetchJson<{ success: boolean; audioUrl: string; duration: number; provider: string; error?: string }>(`${API_BASE}/tts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!data.success) throw new Error(data.error);
    return data;
  },

  async getServiceStatus(): Promise<{
    tts: { activeProvider: string; piperAvailable: boolean; piperUrl: string };
    ai: { available: boolean; model?: string; availableModels: string[]; baseUrl: string; error?: string };
  }> {
    const data = await fetchJson<{
      success: boolean;
      tts: { activeProvider: string; piperAvailable: boolean; piperUrl: string };
      ai: { available: boolean; model?: string; availableModels: string[]; baseUrl: string; error?: string };
      error?: string;
    }>(`${API_BASE}/tts/status`);
    if (!data.success) throw new Error(data.error);
    return data;
  },

  async getSettings(): Promise<SystemSettings> {
    const data = await fetchJson<{ success: boolean; settings: SystemSettings; error?: string }>(`${API_BASE}/settings`);
    return data.settings;
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!data.success) throw new Error(data.error);
  },

  // Phase 6 - Studio Templates
  async getTemplates(): Promise<StudioTemplate[]> {
    const data = await fetchJson<{ success: boolean; templates: StudioTemplate[]; error?: string }>(`${API_BASE}/templates`);
    if (!data.success) throw new Error(data.error);
    return data.templates || [];
  },

  async applyTemplate(projectId: string, templateId: string): Promise<any> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/templates/projects/${projectId}/apply-template/${templateId}`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return data;
  },

  // Media & Native Windows Folder / File Browser
  async browseFolder(initialPath?: string, title?: string): Promise<string | null> {
    try {
      const data = await fetchJson<{ success: boolean; path: string | null }>(`${API_BASE}/media/browse-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialPath, title })
      });
      return data.path || null;
    } catch (err) {
      console.warn('[browseFolder error]:', err);
      return null;
    }
  },

  async browseFile(initialPath?: string, title?: string, fileType: 'video' | 'audio' = 'video'): Promise<string | null> {
    try {
      const data = await fetchJson<{ success: boolean; path: string | null }>(`${API_BASE}/media/browse-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialPath, title, fileType })
      });
      return data.path || null;
    } catch (err) {
      console.warn('[browseFile error]:', err);
      return null;
    }
  },

  async scanFolder(folder: string): Promise<{ success: boolean; exists: boolean; isFile?: boolean; path: string; videoCount: number; audioCount: number; videoFiles?: string[]; audioFiles?: string[] }> {
    try {
      return await fetchJson(`${API_BASE}/media/scan-folder?folder=${encodeURIComponent(folder)}`);
    } catch {
      return { success: false, exists: false, isFile: false, path: folder, videoCount: 0, audioCount: 0 };
    }
  },

  // Phase 7 - Automation Engine
  async extractThreadsUrls(text: string): Promise<{ success: boolean; count: number; urls: string[] }> {
    return await fetchJson(`${API_BASE}/automation/extract-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
  },

  async createBatch(urls: string[], config?: any, title?: string): Promise<BatchJob> {
    const data = await fetchJson<{ success: boolean; batch: BatchJob; error?: string }>(`${API_BASE}/automation/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, config, title })
    });
    if (!data.success) throw new Error(data.error);
    return data.batch;
  },

  async getBatches(): Promise<BatchJob[]> {
    const data = await fetchJson<{ success: boolean; batches: BatchJob[]; error?: string }>(`${API_BASE}/automation/batches`);
    if (!data.success) throw new Error(data.error);
    return data.batches || [];
  },

  async getBatch(id: string): Promise<BatchJob> {
    const data = await fetchJson<{ success: boolean; batch: BatchJob; error?: string }>(`${API_BASE}/automation/batches/${id}`);
    if (!data.success) throw new Error(data.error);
    return data.batch;
  },

  async cancelBatch(id: string): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/automation/batches/${id}/cancel`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
  },

  async deleteBatch(id: string): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/automation/batches/${id}`, {
      method: 'DELETE'
    });
    if (!data.success) throw new Error(data.error);
  }
};
