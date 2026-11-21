import { 
  Project, 
  ThreadPost,
  VoiceItem, 
  SystemSettings, 
  RenderJob, 
  StudioTemplate, 
  BatchJob, 
  BatchItem, 
  ThreadsAccount, 
  ThreadsSyncedPost,
  MonitoredSource,
  DiscoveredPost,
  YouTubeAccount,
  YouTubePublishItem,
  AvailableRenderedVideo,
  YouTubePrivacyStatus
} from '../types';

const API_BASE = '/api';

async function fetchJson<T = any>(url: string, init?: RequestInit, retries = 6): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, init);
      const contentType = res.headers.get('content-type') || '';

      if (res.ok) {
        if (contentType.includes('application/json')) {
          return await res.json();
        }
        // If 200 OK but returned HTML (e.g. Vite index.html fallback while proxy/server is still starting)
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 700));
          continue;
        }
        throw new Error('Máy chủ Backend (Port 3210) đang khởi động. Vui lòng bấm Tải lại.');
      }

      if (contentType.includes('application/json')) {
        const errData = await res.json().catch(() => null);
        if (errData?.error) throw new Error(errData.error);
      }

      if (attempt < retries - 1 && (res.status >= 500 || res.status === 404)) {
        await new Promise(r => setTimeout(r, 700));
        continue;
      }
      throw new Error(`Máy chủ phản hồi mã ${res.status}`);
    } catch (err: any) {
      lastErr = err;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 700));
      }
    }
  }
  throw lastErr || new Error('Không thể kết nối máy chủ backend (Port 3210)');
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

  async updateProject(id: string, updates: Partial<Omit<Project, 'post'>> & { post?: Partial<ThreadPost> }): Promise<Project> {
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
  },

  // Phase 8 - Threads API Connector & Real Data Sync
  async getThreadsAccounts(): Promise<ThreadsAccount[]> {
    const data = await fetchJson<{ success: boolean; accounts: ThreadsAccount[]; error?: string }>(`${API_BASE}/threads-connector/accounts`);
    if (!data.success) throw new Error(data.error);
    return data.accounts || [];
  },

  async addThreadsAccount(payload: { accessToken: string; username?: string; displayName?: string; autoSync?: boolean; syncIntervalMins?: number }): Promise<ThreadsAccount> {
    const data = await fetchJson<{ success: boolean; account: ThreadsAccount; error?: string }>(`${API_BASE}/threads-connector/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!data.success) throw new Error(data.error);
    return data.account;
  },

  async testThreadsAccount(id: string): Promise<{ valid: boolean; info: any }> {
    const data = await fetchJson<{ success: boolean; valid: boolean; info: any; error?: string }>(`${API_BASE}/threads-connector/accounts/${id}/test`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return { valid: data.valid, info: data.info };
  },

  async syncThreadsAccount(id: string): Promise<{ syncedCount: number; errors: string[] }> {
    const data = await fetchJson<{ success: boolean; syncedCount: number; errors: string[]; error?: string }>(`${API_BASE}/threads-connector/accounts/${id}/sync`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return { syncedCount: data.syncedCount, errors: data.errors };
  },

  async deleteThreadsAccount(id: string): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/threads-connector/accounts/${id}`, {
      method: 'DELETE'
    });
    if (!data.success) throw new Error(data.error);
  },

  async getSyncedThreadsPosts(accountId?: string, status?: string): Promise<ThreadsSyncedPost[]> {
    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);
    if (status) params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await fetchJson<{ success: boolean; posts: ThreadsSyncedPost[]; error?: string }>(`${API_BASE}/threads-connector/posts${query}`);
    if (!data.success) throw new Error(data.error);
    return data.posts || [];
  },

  async convertPostToProject(syncedPostId: string): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/threads-connector/posts/${syncedPostId}/create-project`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async queuePostToBatch(syncedPostId: string, batchId?: string): Promise<{ batchId: string; batchItemId: string }> {
    const data = await fetchJson<{ success: boolean; batchId: string; batchItemId: string; error?: string }>(`${API_BASE}/threads-connector/posts/${syncedPostId}/queue-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId })
    });
    if (!data.success) throw new Error(data.error);
    return { batchId: data.batchId, batchItemId: data.batchItemId };
  },

  async syncAllThreadsAccounts(): Promise<{ totalSynced: number; accountResults: Record<string, any> }> {
    const data = await fetchJson<{ success: boolean; totalSynced: number; accountResults: Record<string, any>; error?: string }>(`${API_BASE}/threads-connector/sync-all`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return { totalSynced: data.totalSynced, accountResults: data.accountResults };
  },

  // Media sample loader
  async getSampleMedia(): Promise<{ subVideo: string | null; backgroundVideo: string | null; backgroundMusic: string | null }> {
    const data = await fetchJson<{ success: boolean; subVideo: string | null; backgroundVideo: string | null; backgroundMusic: string | null }>(`${API_BASE}/media/sample-media`);
    return {
      subVideo: data.subVideo,
      backgroundVideo: data.backgroundVideo,
      backgroundMusic: data.backgroundMusic
    };
  },

  // Phase 9: Public Discovery & Monitored Sources
  async getMonitoredSources(): Promise<MonitoredSource[]> {
    const data = await fetchJson<{ success: boolean; sources: MonitoredSource[]; error?: string }>(`${API_BASE}/discovery/sources`);
    if (!data.success) throw new Error(data.error);
    return data.sources || [];
  },

  async addMonitoredSource(payload: {
    sourceType?: 'PROFILE' | 'KEYWORD' | 'TAG';
    target: string;
    username?: string;
    searchMode?: 'TOP' | 'RECENT';
    mediaType?: 'ALL' | 'TEXT' | 'IMAGE' | 'VIDEO';
    limitPerSync?: number;
    syncIntervalMinutes?: number;
    fetchReplies?: boolean;
    minLikesFilter?: number;
    autoQueueToAutomation?: boolean;
  }): Promise<MonitoredSource> {
    const data = await fetchJson<{ success: boolean; source: MonitoredSource; error?: string }>(`${API_BASE}/discovery/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!data.success) throw new Error(data.error);
    return data.source;
  },

  async syncMonitoredSource(id: string): Promise<{ discoveredCount: number; queuedCount: number }> {
    const data = await fetchJson<{ success: boolean; discoveredCount: number; queuedCount: number; error?: string }>(`${API_BASE}/discovery/sources/${id}/sync`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return { discoveredCount: data.discoveredCount, queuedCount: data.queuedCount };
  },

  async toggleMonitoredSource(id: string, isActive: boolean): Promise<void> {
    const data = await fetchJson<{ success: boolean; message: string; error?: string }>(`${API_BASE}/discovery/sources/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    });
    if (!data.success) throw new Error(data.error);
  },

  async deleteMonitoredSource(id: string): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/discovery/sources/${id}`, {
      method: 'DELETE'
    });
    if (!data.success) throw new Error(data.error);
  },

  async getDiscoveredPosts(filters?: { sourceId?: string; status?: string; mediaType?: string; minLikes?: number; limit?: number }): Promise<DiscoveredPost[]> {
    const params = new URLSearchParams();
    if (filters?.sourceId) params.set('sourceId', filters.sourceId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.mediaType) params.set('mediaType', filters.mediaType);
    if (filters?.minLikes) params.set('minLikes', String(filters.minLikes));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await fetchJson<{ success: boolean; posts: DiscoveredPost[]; error?: string }>(`${API_BASE}/discovery/posts${query}`);
    if (!data.success) throw new Error(data.error);
    return data.posts || [];
  },

  async convertDiscoveredPostToProject(postId: string): Promise<Project> {
    const data = await fetchJson<{ success: boolean; project: Project; error?: string }>(`${API_BASE}/discovery/posts/${postId}/create-project`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return data.project;
  },

  async queueDiscoveredPostToBatch(postId: string, batchId?: string): Promise<{ batchId: string; batchItemId: string }> {
    const data = await fetchJson<{ success: boolean; batchId: string; batchItemId: string; error?: string }>(`${API_BASE}/discovery/posts/${postId}/queue-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId })
    });
    if (!data.success) throw new Error(data.error);
    return { batchId: data.batchId, batchItemId: data.batchItemId };
  },

  async searchPublic(params: {
    type: 'PROFILE' | 'KEYWORD' | 'TAG';
    query: string;
    searchMode?: 'TOP' | 'RECENT';
    mediaType?: 'ALL' | 'TEXT' | 'IMAGE' | 'VIDEO';
    limit?: number;
  }): Promise<{ profile?: any; posts: any[] }> {
    const data = await fetchJson<{ success: boolean; profile?: any; posts: any[]; error?: string }>(`${API_BASE}/discovery/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!data.success) throw new Error(data.error);
    return { profile: data.profile, posts: data.posts || [] };
  },

  async getDiscoveryLogs(limit = 50): Promise<any[]> {
    const data = await fetchJson<{ success: boolean; logs: any[]; error?: string }>(`${API_BASE}/discovery/logs?limit=${limit}`);
    if (!data.success) throw new Error(data.error);
    return data.logs || [];
  },

  async getDiscoveryRateLimits(): Promise<any> {
    const data = await fetchJson<{ success: boolean; rateLimits: any; error?: string }>(`${API_BASE}/discovery/rate-limits`);
    if (!data.success) throw new Error(data.error);
    return data.rateLimits;
  },

  async previewProfile(username: string): Promise<any> {
    const data = await fetchJson<{ success: boolean; profile: any; recentPosts: any[]; error?: string }>(`${API_BASE}/discovery/preview-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!data.success) throw new Error(data.error);
    return data;
  },

  // Phase 10 - YouTube Publishing & Social Automation
  async getYouTubeAuthUrl(redirectUri?: string): Promise<{ url: string; clientIdSet: boolean }> {
    const query = redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : '';
    const data = await fetchJson<{ success: boolean; url: string; clientIdSet: boolean; error?: string }>(`${API_BASE}/youtube/auth-url${query}`);
    if (!data.success) throw new Error(data.error);
    return { url: data.url, clientIdSet: data.clientIdSet };
  },

  async getYouTubeAccounts(): Promise<YouTubeAccount[]> {
    const data = await fetchJson<{ success: boolean; accounts: YouTubeAccount[]; error?: string }>(`${API_BASE}/youtube/accounts`);
    if (!data.success) throw new Error(data.error);
    return data.accounts || [];
  },

  async addManualYouTubeAccount(payload: { channelTitle: string; channelHandle?: string; avatarUrl?: string; accessToken?: string }): Promise<YouTubeAccount> {
    const data = await fetchJson<{ success: boolean; account: YouTubeAccount; error?: string }>(`${API_BASE}/youtube/accounts/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!data.success) throw new Error(data.error);
    return data.account;
  },

  async deleteYouTubeAccount(id: string): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/youtube/accounts/${id}`, {
      method: 'DELETE'
    });
    if (!data.success) throw new Error(data.error);
  },

  async getAvailableVideosForYouTube(): Promise<AvailableRenderedVideo[]> {
    const data = await fetchJson<{ success: boolean; videos: AvailableRenderedVideo[]; error?: string }>(`${API_BASE}/youtube/videos/available`);
    if (!data.success) throw new Error(data.error);
    return data.videos || [];
  },

  async generateYouTubeMetadata(projectId?: string, customTitle?: string): Promise<{
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacyStatus: YouTubePrivacyStatus;
  }> {
    const data = await fetchJson<{
      success: boolean;
      title: string;
      description: string;
      tags: string[];
      categoryId: string;
      privacyStatus: YouTubePrivacyStatus;
      error?: string;
    }>(`${API_BASE}/youtube/metadata/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, customTitle })
    });
    if (!data.success) throw new Error(data.error);
    return {
      title: data.title,
      description: data.description,
      tags: data.tags,
      categoryId: data.categoryId,
      privacyStatus: data.privacyStatus
    };
  },

  async getYouTubePublishes(): Promise<YouTubePublishItem[]> {
    const data = await fetchJson<{ success: boolean; publishes: YouTubePublishItem[]; error?: string }>(`${API_BASE}/youtube/publishes`);
    if (!data.success) throw new Error(data.error);
    return data.publishes || [];
  },

  async createYouTubePublish(payload: Partial<YouTubePublishItem>): Promise<YouTubePublishItem> {
    const data = await fetchJson<{ success: boolean; publish: YouTubePublishItem; error?: string }>(`${API_BASE}/youtube/publishes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!data.success) throw new Error(data.error);
    return data.publish;
  },

  async updateYouTubePublish(id: string, updates: Partial<YouTubePublishItem>): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/youtube/publishes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!data.success) throw new Error(data.error);
  },

  async deleteYouTubePublish(id: string): Promise<void> {
    const data = await fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/youtube/publishes/${id}`, {
      method: 'DELETE'
    });
    if (!data.success) throw new Error(data.error);
  },

  async uploadToYouTube(id: string): Promise<{ success: boolean; videoId?: string; error?: string }> {
    const data = await fetchJson<{ success: boolean; videoId?: string; error?: string }>(`${API_BASE}/youtube/publishes/${id}/upload`, {
      method: 'POST'
    });
    if (!data.success) throw new Error(data.error);
    return data;
  },

  async checkYouTubeProcessingStatus(id: string): Promise<{ status: string; processingDetails?: any; embedUrl?: string }> {
    const data = await fetchJson<{ success: boolean; status: string; processingDetails?: any; embedUrl?: string; error?: string }>(`${API_BASE}/youtube/publishes/${id}/status`);
    if (!data.success) throw new Error(data.error);
    return data;
  }
};
