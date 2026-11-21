import { Router } from 'express';
import { db } from '../db.js';
import { Project, ThreadPost, ThreadComment, ScriptScene, VideoConfig } from '../types.js';
import { ThreadsExtractor } from '../services/threadsExtractor.js';
import { ScriptService } from '../services/scriptService.js';
import { VideoService } from '../services/videoService.js';
import { CommentFilterService, CommentFilterOptions } from '../services/commentFilter.js';

const router = Router();

const defaultFullConfig: VideoConfig = {
  aspectRatio: '9:16',
  resolution: '1080p',
  fps: 30,
  maskAuthor: false,
  reviewBeforeExport: true,
  commentCount: 5,
  commentFilterMode: 'most_likes',
  cardPosition: {
    x: 50.0,
    y: 35.0,
    scale: 90.0,
    borderRadius: 18,
    bgStyle: 'white'
  },
  subVideoPosition: {
    enabled: true,
    layoutMode: 'fullscreen',
    x: 50.0,
    y: 65.0,
    scale: 100.0,
    borderRadius: 16,
    folder: '',
    mute: true,
    loop: true
  },
  backgroundVideoFolder: '',
  backgroundMusic: {
    folder: '',
    volume: 20,
    enabled: true
  },
  tts: {
    previewVoice: 'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
    speed: 1.20,
    randomVoiceMode: 'random',
    selectedVoices: ['VieNeu - Ngọc Huyền (Nữ miền Bắc)', 'VieNeu - Hải Đăng (Nam miền Nam)'],
    readPost: true,
    readComments: true,
    readAuthorName: true,
    voiceVolume: 85
  },
  watermark: {
    enabled: true,
    text: 'CRE: THUI NAO 🐾',
    position: 'top_center',
    opacity: 0.85,
    fontSize: 26
  },
  effects: {
    zoomPan: true,
    blurBackground: false,
    vignette: false,
    kenBurns: false
  },
  subtitleStyle: {
    enabled: true,
    fontSize: 44,
    primaryColor: '&H0000E6FF',
    outlineColor: '&H00000000',
    position: 'bottom'
  },
  defaultTransition: 'fade',
  selectedTemplateId: 'tiktok_trending'
};

export function formatProject(pRow: any): Project {
  const postRow = db.prepare('SELECT * FROM posts WHERE project_id = ?').get(pRow.id) as any;
  const commentRows = db.prepare('SELECT * FROM comments WHERE project_id = ? ORDER BY comment_order ASC').all(pRow.id) as any[];
  const sceneRows = db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_order ASC').all(pRow.id) as any[];
  const lastJob = VideoService.getLatestProjectJob(pRow.id);

  let post: ThreadPost = {
    id: 'post_empty',
    url: pRow.threads_url,
    username: 'threads_user',
    displayName: 'Người dùng Threads',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=default',
    content: 'Chưa có nội dung bài viết',
    mediaUrls: [],
    timestamp: 'Vừa xong',
    likes: 0,
    repliesCount: 0
  };

  if (postRow) {
    post = {
      id: postRow.id,
      url: postRow.url,
      username: postRow.username,
      displayName: postRow.display_name,
      avatar: postRow.avatar,
      content: postRow.content,
      mediaUrls: JSON.parse(postRow.media_urls || '[]'),
      timestamp: postRow.timestamp,
      likes: postRow.likes,
      repliesCount: postRow.replies_count,
      verified: Boolean(postRow.verified)
    };
  }

  const comments: ThreadComment[] = commentRows.map(c => ({
    id: c.id,
    postId: post.id,
    username: c.username,
    displayName: c.display_name,
    avatar: c.avatar,
    content: c.content,
    likes: c.likes,
    timestamp: c.timestamp,
    selected: Boolean(c.selected),
    order: c.comment_order,
    mediaUrl: c.media_url || undefined
  }));

  const scenes: ScriptScene[] = sceneRows.map(s => ({
    id: s.id,
    order: s.scene_order,
    type: s.type as any,
    title: s.title,
    text: s.text,
    voice: s.voice,
    duration: s.duration,
    selected: Boolean(s.selected),
    transition: (s.transition as any) || 'fade',
    transitionDuration: s.transition_duration ?? 0.5,
    volume: s.volume ?? 100
  }));

  const parsedConfig = JSON.parse(pRow.video_config || '{}');
  const config: VideoConfig = {
    ...defaultFullConfig,
    ...parsedConfig,
    cardPosition: { ...defaultFullConfig.cardPosition, ...(parsedConfig.cardPosition || {}) },
    subVideoPosition: { ...defaultFullConfig.subVideoPosition, ...(parsedConfig.subVideoPosition || {}) },
    backgroundMusic: { ...defaultFullConfig.backgroundMusic, ...(parsedConfig.backgroundMusic || {}) },
    tts: { ...defaultFullConfig.tts, ...(parsedConfig.tts || {}) },
    watermark: { ...defaultFullConfig.watermark, ...(parsedConfig.watermark || {}) },
    effects: { ...defaultFullConfig.effects, ...(parsedConfig.effects || {}) },
    subtitleStyle: { ...defaultFullConfig.subtitleStyle, ...(parsedConfig.subtitleStyle || {}) }
  };

  return {
    id: pRow.id,
    title: pRow.title,
    threadsUrl: pRow.threads_url,
    status: pRow.status,
    createdAt: pRow.created_at,
    updatedAt: pRow.updated_at,
    post,
    comments,
    scenes,
    config,
    lastRenderJob: lastJob || undefined
  };
}

// GET /api/projects - list all projects
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as any[];
    const projects = rows.map(formatProject);
    res.json({ success: true, projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/projects/:id - get single project
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    const project = formatProject(row);
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to create a single project with extractor
export async function createProjectFromUrl(url: string, title?: string, customConfig?: Partial<VideoConfig>) {
  const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const extraction = await ThreadsExtractor.extract(url || 'https://www.threads.net');
  const post = extraction.post;
  const comments = extraction.comments;

  const mergedConfig: VideoConfig = {
    ...defaultFullConfig,
    ...(customConfig || {}),
    cardPosition: { ...defaultFullConfig.cardPosition, ...(customConfig?.cardPosition || {}) },
    subVideoPosition: { ...defaultFullConfig.subVideoPosition, ...(customConfig?.subVideoPosition || {}) },
    backgroundMusic: { ...defaultFullConfig.backgroundMusic, ...(customConfig?.backgroundMusic || {}) },
    tts: { ...defaultFullConfig.tts, ...(customConfig?.tts || {}) },
    watermark: {
      enabled: customConfig?.watermark?.enabled ?? defaultFullConfig.watermark?.enabled ?? true,
      text: customConfig?.watermark?.text ?? defaultFullConfig.watermark?.text ?? '@ThreadsStudio',
      position: customConfig?.watermark?.position ?? defaultFullConfig.watermark?.position ?? 'top_right',
      opacity: customConfig?.watermark?.opacity ?? defaultFullConfig.watermark?.opacity ?? 0.75,
      fontSize: customConfig?.watermark?.fontSize ?? defaultFullConfig.watermark?.fontSize ?? 26
    },
    effects: {
      zoomPan: customConfig?.effects?.zoomPan ?? defaultFullConfig.effects?.zoomPan ?? true,
      blurBackground: customConfig?.effects?.blurBackground ?? defaultFullConfig.effects?.blurBackground ?? false,
      vignette: customConfig?.effects?.vignette ?? defaultFullConfig.effects?.vignette ?? false,
      kenBurns: customConfig?.effects?.kenBurns ?? defaultFullConfig.effects?.kenBurns ?? false
    },
    subtitleStyle: {
      enabled: customConfig?.subtitleStyle?.enabled ?? defaultFullConfig.subtitleStyle?.enabled ?? true,
      fontSize: customConfig?.subtitleStyle?.fontSize ?? defaultFullConfig.subtitleStyle?.fontSize ?? 40,
      primaryColor: customConfig?.subtitleStyle?.primaryColor ?? defaultFullConfig.subtitleStyle?.primaryColor ?? '&H00FFFFFF',
      outlineColor: customConfig?.subtitleStyle?.outlineColor ?? defaultFullConfig.subtitleStyle?.outlineColor ?? '&H00000000',
      position: customConfig?.subtitleStyle?.position ?? defaultFullConfig.subtitleStyle?.position ?? 'middle'
    }
  };

  db.prepare(`
    INSERT INTO projects (id, title, threads_url, status, created_at, updated_at, video_config)
    VALUES (?, ?, ?, 'fetched', ?, ?, ?)
  `).run(
    projectId,
    title || post.content.slice(0, 50) || 'Dự án Threads mới',
    url,
    now,
    now,
    JSON.stringify(mergedConfig)
  );

  db.prepare(`
    INSERT INTO posts (id, project_id, url, username, display_name, avatar, content, media_urls, timestamp, likes, replies_count, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    post.id,
    projectId,
    post.url,
    post.username,
    post.displayName,
    post.avatar,
    post.content,
    JSON.stringify(post.mediaUrls),
    post.timestamp,
    post.likes,
    post.repliesCount,
    post.verified ? 1 : 0
  );

  for (const c of comments) {
    db.prepare(`
      INSERT INTO comments (id, project_id, username, display_name, avatar, content, likes, timestamp, selected, comment_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(c.id, projectId, c.username, c.displayName, c.avatar, c.content, c.likes, c.timestamp, c.selected ? 1 : 0, c.order);
  }

  const scenes = ScriptService.generateScript(post, comments);
  for (const sc of scenes) {
    db.prepare(`
      INSERT INTO scenes (id, project_id, scene_order, type, title, text, voice, duration, selected)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sc.id, projectId, sc.order, sc.type, sc.title, sc.text, sc.voice, sc.duration ?? null, sc.selected ? 1 : 0);
  }

  return formatProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
}

// POST /api/projects - create new project from URL
router.post('/', async (req, res) => {
  try {
    const { url, title } = req.body;
    const project = await createProjectFromUrl(url, title);
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/batch - bulk import URLs
router.post('/batch', async (req, res) => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, error: 'Danh sách URL không hợp lệ' });
    }

    const createdProjects = [];
    for (const u of urls) {
      if (typeof u === 'string' && u.trim().includes('threads.net')) {
        const proj = await createProjectFromUrl(u.trim());
        createdProjects.push(proj);
      }
    }

    res.json({ success: true, count: createdProjects.length, projects: createdProjects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/manual - create custom project manually
router.post('/manual', async (req, res) => {
  try {
    const { title, content, authorName, rawCommentsText } = req.body;
    const { post, comments } = ThreadsExtractor.parseManualInput(content, authorName, rawCommentsText);

    const projectId = `proj_${Date.now()}`;
    const now = new Date().toISOString();

    const defaultConfig: VideoConfig = {
      aspectRatio: '9:16',
      resolution: '1080p',
      fps: 30,
      maskAuthor: false,
      reviewBeforeExport: true,
      commentCount: 5,
      commentFilterMode: 'most_likes',
      cardPosition: {
        x: 50.0,
        y: 28.0,
        scale: 105.0,
        borderRadius: 16,
        bgStyle: 'white'
      },
      subVideoPosition: {
        enabled: true,
        x: 50.0,
        y: 65.0,
        scale: 110.0,
        borderRadius: 12,
        folder: '',
        mute: true,
        loop: true
      },
      backgroundVideoFolder: '',
      backgroundMusic: {
        folder: '',
        volume: 20,
        enabled: true
      },
      tts: {
        previewVoice: 'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
        speed: 1.20,
        randomVoiceMode: 'random',
        selectedVoices: ['VieNeu - Ngọc Huyền (Nữ miền Bắc)', 'VieNeu - Hải Đăng (Nam miền Nam)'],
        readPost: true,
        readComments: true,
        readAuthorName: true,
        voiceVolume: 85
      }
    };

    db.prepare(`
      INSERT INTO projects (id, title, threads_url, status, created_at, updated_at, video_config)
      VALUES (?, ?, ?, 'fetched', ?, ?, ?)
    `).run(projectId, title || content.slice(0, 45) || 'Bài viết tự nhập', post.url, now, now, JSON.stringify(defaultConfig));

    db.prepare(`
      INSERT INTO posts (id, project_id, url, username, display_name, avatar, content, media_urls, timestamp, likes, replies_count, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(post.id, projectId, post.url, post.username, post.displayName, post.avatar, post.content, JSON.stringify(post.mediaUrls), post.timestamp, post.likes, post.repliesCount, 1);

    for (const c of comments) {
      db.prepare(`
        INSERT INTO comments (id, project_id, username, display_name, avatar, content, likes, timestamp, selected, comment_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(c.id, projectId, c.username, c.displayName, c.avatar, c.content, c.likes, c.timestamp, c.selected ? 1 : 0, c.order);
    }

    const scenes = ScriptService.generateScript(post, comments);
    for (const sc of scenes) {
      db.prepare(`
        INSERT INTO scenes (id, project_id, scene_order, type, title, text, voice, duration, selected)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sc.id, projectId, sc.order, sc.type, sc.title, sc.text, sc.voice, sc.duration ?? null, sc.selected ? 1 : 0);
    }

    const created = formatProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
    res.json({ success: true, project: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/projects/:id - update project details or config
router.put('/:id', (req, res) => {
  try {
    const { title, config, comments, scenes, post } = req.body;
    const projectId = req.params.id;
    const now = new Date().toISOString();

    if (title || config) {
      const updates = [];
      const params = [];
      if (title) {
        updates.push('title = ?');
        params.push(title);
      }
      if (config) {
        updates.push('video_config = ?');
        params.push(JSON.stringify(config));
      }
      updates.push('updated_at = ?');
      params.push(now);
      params.push(projectId);

      db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    if (post) {
      const pUpdates = [];
      const pParams = [];
      if (post.content !== undefined) {
        pUpdates.push('content = ?');
        pParams.push(post.content);
      }
      if (post.displayName !== undefined) {
        pUpdates.push('display_name = ?');
        pParams.push(post.displayName);
      }
      if (post.username !== undefined) {
        pUpdates.push('username = ?');
        pParams.push(post.username);
      }
      if (post.avatar !== undefined) {
        pUpdates.push('avatar = ?');
        pParams.push(post.avatar);
      }
      if (Array.isArray(post.mediaUrls)) {
        pUpdates.push('media_urls = ?');
        pParams.push(JSON.stringify(post.mediaUrls));
      }
      if (pUpdates.length > 0) {
        pParams.push(projectId);
        db.prepare(`UPDATE posts SET ${pUpdates.join(', ')} WHERE project_id = ?`).run(...pParams);
      }
    }

    if (Array.isArray(comments)) {
      for (const c of comments) {
        db.prepare(`
          UPDATE comments SET selected = ?, content = ?, comment_order = ? WHERE id = ? AND project_id = ?
        `).run(c.selected ? 1 : 0, c.content, c.order, c.id, projectId);
      }
    }

    if (Array.isArray(scenes)) {
      db.prepare('DELETE FROM scenes WHERE project_id = ?').run(projectId);
      for (const s of scenes) {
        db.prepare(`
          INSERT INTO scenes (id, project_id, scene_order, type, title, text, voice, duration, selected, transition, transition_duration, volume)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          s.id,
          projectId,
          s.order,
          s.type,
          s.title,
          s.text,
          s.voice,
          s.duration ?? null,
          s.selected ? 1 : 0,
          s.transition || 'fade',
          s.transitionDuration ?? 0.5,
          s.volume ?? 100
        );
      }
    }

    const updated = formatProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
    res.json({ success: true, project: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/projects/:id - delete project
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Đã xóa dự án' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/fetch-thread - re-fetch with ThreadsExtractor
router.post('/:id/fetch-thread', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { url } = req.body;
    const targetUrl = url || (db.prepare('SELECT threads_url FROM projects WHERE id = ?').get(projectId) as any)?.threads_url;

    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'Thiếu đường dẫn Threads' });
    }

    db.prepare("UPDATE projects SET status = 'fetching' WHERE id = ?").run(projectId);

    const extraction = await ThreadsExtractor.extract(targetUrl);
    const post = extraction.post;
    const comments = extraction.comments;

    db.prepare('DELETE FROM posts WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM comments WHERE project_id = ?').run(projectId);

    db.prepare(`
      INSERT INTO posts (id, project_id, url, username, display_name, avatar, content, media_urls, timestamp, likes, replies_count, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      post.id,
      projectId,
      post.url,
      post.username,
      post.displayName,
      post.avatar,
      post.content,
      JSON.stringify(post.mediaUrls),
      post.timestamp,
      post.likes,
      post.repliesCount,
      post.verified ? 1 : 0
    );

    for (const c of comments) {
      db.prepare(`
        INSERT INTO comments (id, project_id, username, display_name, avatar, content, likes, timestamp, selected, comment_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(c.id, projectId, c.username, c.displayName, c.avatar, c.content, c.likes, c.timestamp, c.selected ? 1 : 0, c.order);
    }

    db.prepare('UPDATE projects SET threads_url = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(targetUrl, 'fetched', new Date().toISOString(), projectId);

    const project = formatProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
    res.json({ success: true, project, extractionSource: extraction.source });
  } catch (err: any) {
    db.prepare("UPDATE projects SET status = 'error' WHERE id = ?").run(req.params.id);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/comments - add a new comment manually
router.post('/:id/comments', (req, res) => {
  try {
    const projectId = req.params.id;
    const { displayName, username, content, likes } = req.body;
    const commentId = `cmt_${Date.now()}`;
    const commentOrder = (db.prepare('SELECT COUNT(*) as count FROM comments WHERE project_id = ?').get(projectId) as any).count + 1;
    const user = username || displayName?.toLowerCase().replace(/\s+/g, '_') || 'user';

    db.prepare(`
      INSERT INTO comments (id, project_id, username, display_name, avatar, content, likes, timestamp, selected, comment_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Vừa xong', 1, ?)
    `).run(
      commentId,
      projectId,
      user,
      displayName || 'Người dùng mới',
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user}`,
      content,
      likes || 50,
      commentOrder
    );

    const project = formatProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/projects/:id/comments/:commentId - delete a comment
router.delete('/:id/comments/:commentId', (req, res) => {
  try {
    const { id, commentId } = req.params;
    db.prepare('DELETE FROM comments WHERE id = ? AND project_id = ?').run(commentId, id);
    const project = formatProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/comments/filter - batch filter comments
router.post('/:id/comments/filter', (req, res) => {
  try {
    const projectId = req.params.id;
    const filterOptions: CommentFilterOptions = req.body;

    const currentRows = db.prepare('SELECT * FROM comments WHERE project_id = ? ORDER BY comment_order ASC').all(projectId) as any[];
    const allComments: ThreadComment[] = currentRows.map(c => ({
      id: c.id,
      postId: '',
      username: c.username,
      displayName: c.display_name,
      avatar: c.avatar,
      content: c.content,
      likes: c.likes,
      timestamp: c.timestamp,
      selected: Boolean(c.selected),
      order: c.comment_order
    }));

    const filtered = CommentFilterService.applyFilters(allComments, filterOptions);
    const selectedIds = new Set(filtered.map(f => f.id));

    // Update selections in db
    for (const c of allComments) {
      const isSelected = selectedIds.has(c.id);
      db.prepare('UPDATE comments SET selected = ? WHERE id = ? AND project_id = ?').run(isSelected ? 1 : 0, c.id, projectId);
    }

    const project = formatProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/render - start render
router.post('/:id/render', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    const project = formatProject(row);
    const job = VideoService.startRender(project);
    res.json({ success: true, job });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/stop-render - stop active render
router.post('/:id/stop-render', (req, res) => {
  try {
    const stopped = VideoService.stopRender(req.params.id);
    res.json({ success: true, stopped });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/pause-render - Phase 18 pause render
router.post('/:id/pause-render', (req, res) => {
  try {
    const paused = VideoService.pauseRender(req.params.id);
    res.json({ success: true, paused });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/resume-render - Phase 18 resume render
router.post('/:id/resume-render', (req, res) => {
  try {
    const job = VideoService.resumeRender(req.params.id);
    if (!job) {
      return res.status(400).json({ success: false, error: 'Không tìm thấy tiến trình tạm dừng để tiếp tục.' });
    }
    res.json({ success: true, job });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/projects/:id/render-status - check render status
router.get('/:id/render-status', (req, res) => {
  try {
    const job = VideoService.getLatestProjectJob(req.params.id);
    res.json({ success: true, job });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
