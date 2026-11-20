import { Router } from 'express';
import { db } from '../db.js';
import { ScreenshotEngine } from '../services/screenshotEngine.js';

const router = Router();

function getProjectData(id: string) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!row) return null;
  const postRow = db.prepare('SELECT * FROM posts WHERE project_id = ?').get(id) as any;
  const commentRows = db.prepare('SELECT * FROM comments WHERE project_id = ? ORDER BY comment_order ASC').all(id) as any[];

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
    scenes: [],
    config: JSON.parse(row.video_config || '{}')
  };
}

// GET /api/projects/:id/screenshots - list all screenshots
router.get('/:id/screenshots', (req, res) => {
  try {
    const list = ScreenshotEngine.listScreenshots(req.params.id);
    res.json({ success: true, screenshots: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/screenshots/render-post - render single post screenshot
router.post('/:id/screenshots/render-post', async (req, res) => {
  try {
    const project = getProjectData(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const options = req.body || {};
    const item = await ScreenshotEngine.renderPost(project, options);
    res.json({ success: true, screenshot: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/screenshots/render-comment/:commentId - render single comment screenshot
router.post('/:id/screenshots/render-comment/:commentId', async (req, res) => {
  try {
    const project = getProjectData(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const comment = project.comments.find(c => c.id === req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });

    const options = req.body || {};
    const item = await ScreenshotEngine.renderComment(project, comment, options);
    res.json({ success: true, screenshot: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/screenshots/batch - batch render all selected comments + post
router.post('/:id/screenshots/batch', async (req, res) => {
  try {
    const project = getProjectData(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const options = req.body || {};
    const results = await ScreenshotEngine.renderBatch(project, options);
    res.json({ success: true, count: results.length, screenshots: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/projects/:id/screenshots/:screenshotId - delete screenshot
router.delete('/:id/screenshots/:screenshotId', (req, res) => {
  try {
    const ok = ScreenshotEngine.deleteScreenshot(req.params.screenshotId);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
