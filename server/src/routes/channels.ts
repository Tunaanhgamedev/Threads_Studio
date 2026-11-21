import { Router } from 'express';
import { MultiChannelService } from '../services/multiChannelService.js';

export const channelsRouter = Router();

// GET /api/channels - List all connected channels with metrics
channelsRouter.get('/', (req, res) => {
  try {
    const channels = MultiChannelService.listChannels();
    res.json({ success: true, channels });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/channels/dashboard-summary - Multi-Channel aggregated summary
channelsRouter.get('/dashboard-summary', (req, res) => {
  try {
    const summary = MultiChannelService.getMultiDashboardSummary();
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/channels/schedule - Centralized multi-channel schedule
channelsRouter.get('/schedule', (req, res) => {
  try {
    const { accountId, status } = req.query;
    const schedule = MultiChannelService.getMultiChannelSchedule({
      accountId: accountId as string,
      status: status as string
    });
    res.json({ success: true, schedule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/channels/quota - Real-time YouTube API quota & limit tracking
channelsRouter.get('/quota', (req, res) => {
  try {
    const quota = MultiChannelService.getQuotaStats();
    res.json({ success: true, quota });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/channels/project-mappings - List all projects with mapped channels
channelsRouter.get('/project-mappings', (req, res) => {
  try {
    const mappings = MultiChannelService.getProjectMappings();
    res.json({ success: true, mappings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/channels/project-mappings - Assign or unassign project to channel
channelsRouter.post('/project-mappings', (req, res) => {
  try {
    const { projectId, accountId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Thiếu projectId' });
    }
    MultiChannelService.assignProjectChannel(projectId, accountId || null);
    res.json({ success: true, message: 'Đã cập nhật kênh gán cho dự án' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/channels/project-mappings/:projectId - Get channel for a project
channelsRouter.get('/project-mappings/:projectId', (req, res) => {
  try {
    const channel = MultiChannelService.getChannelForProject(req.params.projectId);
    res.json({ success: true, channel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/channels/:id - Update channel details
channelsRouter.patch('/:id', (req, res) => {
  try {
    const updated = MultiChannelService.updateChannel(req.params.id, req.body);
    res.json({ success: true, channel: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/channels/:id/set-default - Set as workspace default channel
channelsRouter.post('/:id/set-default', (req, res) => {
  try {
    MultiChannelService.setDefaultChannel(req.params.id);
    res.json({ success: true, message: 'Đã đặt làm kênh mặc định workspace' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
