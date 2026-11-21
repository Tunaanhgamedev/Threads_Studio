import { Router } from 'express';
import { DiscoveryService } from '../services/discoveryService.js';
import { DiscoverySourceType, DiscoverySearchMode, DiscoveryMediaType } from '../types.js';

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

// POST /api/discovery/sources - add a new monitored source (PROFILE, KEYWORD, or TAG)
router.post('/sources', async (req, res) => {
  try {
    const { 
      sourceType, 
      target, 
      username, 
      searchMode, 
      mediaType, 
      limitPerSync, 
      syncIntervalMinutes, 
      fetchReplies, 
      minLikesFilter, 
      autoQueueToAutomation 
    } = req.body;

    const chosenTarget = target || username;
    if (!chosenTarget) {
      return res.status(400).json({ success: false, error: 'Mục tiêu theo dõi (Username, Từ khóa hoặc Tag) không được để trống' });
    }

    const source = await DiscoveryService.addMonitoredSource({
      sourceType: (sourceType as DiscoverySourceType) || 'PROFILE',
      target: chosenTarget,
      searchMode: (searchMode as DiscoverySearchMode) || 'TOP',
      mediaType: (mediaType as DiscoveryMediaType) || 'ALL',
      limitPerSync: Number(limitPerSync) || 20,
      syncIntervalMinutes: Number(syncIntervalMinutes) || 60,
      fetchReplies: fetchReplies !== false,
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

// PATCH /api/discovery/sources/:id/toggle - pause/resume a monitored source
router.patch('/sources/:id/toggle', (req, res) => {
  try {
    const { isActive } = req.body;
    DiscoveryService.toggleSourceActive(req.params.id, Boolean(isActive));
    res.json({ success: true, message: isActive ? 'Đã bật nguồn theo dõi' : 'Đã tạm dừng nguồn theo dõi' });
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
    const { sourceId, status, mediaType, minLikes, limit } = req.query;
    const posts = DiscoveryService.listDiscoveredPosts({
      sourceId: sourceId ? String(sourceId) : undefined,
      status: status ? String(status) : undefined,
      mediaType: mediaType ? String(mediaType) : undefined,
      minLikes: minLikes ? Number(minLikes) : undefined,
      limit: limit ? Number(limit) : 100
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

// POST /api/discovery/search - search public threads (PROFILE, KEYWORD, or TAG)
router.post('/search', async (req, res) => {
  try {
    const { type, query, searchMode, mediaType, limit } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Truy vấn tìm kiếm không được để trống' });
    }
    const result = await DiscoveryService.searchPublic({
      type: (type as DiscoverySourceType) || 'PROFILE',
      query,
      searchMode: (searchMode as DiscoverySearchMode) || 'TOP',
      mediaType: (mediaType as DiscoveryMediaType) || 'ALL',
      limit: Number(limit) || 20
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/discovery/logs - get sync history logs
router.get('/logs', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const logs = DiscoveryService.getSyncLogs(limit);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/discovery/rate-limits - get 24-hour rate limit status
router.get('/rate-limits', (req, res) => {
  try {
    const limits = DiscoveryService.getRateLimits();
    res.json({ success: true, rateLimits: limits });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
