import { Router } from 'express';
import { db } from '../db.js';
import { VoiceEngine } from '../services/voiceEngine.js';
import { Project, ThreadPost, ThreadComment, ScriptScene } from '../types.js';

const router = Router();

function getFullProject(id: string): Project | null {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!row) return null;
  const postRow = db.prepare('SELECT * FROM posts WHERE project_id = ?').get(id) as any;
  const commentRows = db.prepare('SELECT * FROM comments WHERE project_id = ? ORDER BY comment_order ASC').all(id) as any[];
  const sceneRows = db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_order ASC').all(id) as any[];

  return {
    id: row.id,
    title: row.title,
    threadsUrl: row.threads_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    post: {
      id: postRow?.id || 'post',
      url: postRow?.url || '',
      username: postRow?.username || 'user',
      displayName: postRow?.display_name || 'User',
      avatar: postRow?.avatar || '',
      content: postRow?.content || '',
      mediaUrls: JSON.parse(postRow?.media_urls || '[]'),
      timestamp: postRow?.timestamp || 'Vừa xong',
      likes: postRow?.likes || 0,
      repliesCount: postRow?.replies_count || 0,
      verified: Boolean(postRow?.verified)
    },
    comments: commentRows.map(c => ({
      id: c.id,
      postId: postRow?.id || '',
      username: c.username,
      displayName: c.display_name,
      avatar: c.avatar,
      content: c.content,
      likes: c.likes,
      timestamp: c.timestamp,
      selected: Boolean(c.selected),
      order: c.comment_order
    })),
    scenes: sceneRows.map(s => ({
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
    })),
    config: JSON.parse(row.video_config || '{}')
  };
}

// GET /api/projects/:id/voice/audios - get all generated audio files
router.get('/:id/voice/audios', (req, res) => {
  try {
    const list = VoiceEngine.listAudios(req.params.id);
    res.json({ success: true, audios: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/voice/generate-scene/:sceneId - generate audio for a single scene
router.post('/:id/voice/generate-scene/:sceneId', async (req, res) => {
  try {
    const project = getFullProject(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const scene = project.scenes.find(s => s.id === req.params.sceneId);
    if (!scene) return res.status(404).json({ success: false, error: 'Scene not found' });

    const audioItem = await VoiceEngine.generateSceneAudio(project, scene);
    res.json({ success: true, audio: audioItem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/voice/generate-all - batch generate audio for all scenes
router.post('/:id/voice/generate-all', async (req, res) => {
  try {
    const project = getFullProject(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const results = await VoiceEngine.generateAllScenes(project);
    res.json({ success: true, count: results.length, audios: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/voice/ai-script - regenerate viral AI script scenes
router.post('/:id/voice/ai-script', async (req, res) => {
  try {
    const project = getFullProject(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const newScenes = await VoiceEngine.generateAIScript(project);

    db.prepare('DELETE FROM scenes WHERE project_id = ?').run(project.id);
    for (const sc of newScenes) {
      db.prepare(`
        INSERT INTO scenes (id, project_id, scene_order, type, title, text, voice, duration, selected, transition, transition_duration, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        sc.id,
        project.id,
        sc.order,
        sc.type,
        sc.title,
        sc.text,
        sc.voice,
        sc.duration ?? null,
        sc.selected ? 1 : 0,
        sc.transition || 'fade',
        sc.transitionDuration ?? 0.5,
        sc.volume ?? 100
      );
    }

    res.json({ success: true, scenes: newScenes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
