import { Router } from 'express';
import { DiscoveryService } from '../services/discoveryService.js';

const router = Router();

// GET /api/discovery/sources - list all monitored sources
router.get('/sources', (req, res) => {
  try {
    const list = DiscoveryService.listMonitoredSources();
    res.json({ success: true, sources: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/discovery/sources - add a new monitored source
router.post('/sources', async (req, res) => {
  try {
    const { username, minLikesFilter, autoQueueToAutomation } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username không được để trống' });
    }
    const source = await DiscoveryService.addMonitoredSource({
      username,
      minLikesFilter: Number(minLikesFilter) || 50,
      autoQueueToAutomation: Boolean(autoQueueToAutomation)
    });
    res.json({ success: true, source });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/discovery/sources/:id/sync - sync a single source
router.post('/sources/:id/sync', async (req, res) => {
  try {
    const result = await DiscoveryService.syncMonitoredSource(req.params.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/discovery/sources/:id - delete a monitored source
router.delete('/sources/:id', (req, res) => {
  try {
    DiscoveryService.deleteMonitoredSource(req.params.id);
    res.json({ success: true, message: 'Đã xóa kênh theo dõi' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/discovery/posts - list discovered viral posts
router.get('/posts', (req, res) => {
  try {
    const { sourceId, status, minLikes, limit } = req.query;
    const posts = DiscoveryService.listDiscoveredPosts({
      sourceId: sourceId ? String(sourceId) : undefined,
      status: status ? String(status) : undefined,
      minLikes: minLikes ? Number(minLikes) : undefined,
      limit: limit ? Number(limit) : 50
    });
    res.json({ success: true, posts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/discovery/posts/:id/create-project - 1-click create studio project
router.post('/posts/:id/create-project', async (req, res) => {
  try {
    const project = await DiscoveryService.convertPostToProject(req.params.id);
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/discovery/posts/:id/queue-batch - 1-click queue into Phase 7 Automation Engine
router.post('/posts/:id/queue-batch', async (req, res) => {
  try {
    const { batchId } = req.body;
    const result = await DiscoveryService.queueDiscoveredPostToBatch(req.params.id, batchId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/discovery/preview-profile - preview creator profile & recent posts
router.post('/preview-profile', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username không được để trống' });
    }
    const data = await DiscoveryService.discoverProfile(username);
    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
