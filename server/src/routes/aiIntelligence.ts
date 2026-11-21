import { Router } from 'express';
import { AIIntelligenceService } from '../services/aiIntelligenceService.js';

const router = Router();

// POST /api/intelligence/generate - Generate a new AI Content Intelligence report
router.post('/generate', async (req, res) => {
  try {
    const { accountId, periodDays } = req.body || {};
    const report = await AIIntelligenceService.generateReport(accountId, Number(periodDays) || 28);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/intelligence/reports - List all reports
router.get('/reports', (req, res) => {
  try {
    const { accountId } = req.query as { accountId?: string };
    const reports = AIIntelligenceService.listReports(accountId);
    res.json({ success: true, reports });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/intelligence/reports/:id - Get a single report
router.get('/reports/:id', (req, res) => {
  try {
    const { id } = req.params;
    const report = AIIntelligenceService.getReport(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy báo cáo' });
    }
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/intelligence/reports/:id - Delete a report
router.delete('/reports/:id', (req, res) => {
  try {
    const { id } = req.params;
    AIIntelligenceService.deleteReport(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/intelligence/reports/:reportId/ideas/:ideaId - Update idea status (accept/dismiss)
router.patch('/reports/:reportId/ideas/:ideaId', (req, res) => {
  try {
    const { reportId, ideaId } = req.params;
    const { status } = req.body as { status: 'accepted' | 'dismissed' };
    AIIntelligenceService.updateIdeaStatus(reportId, ideaId, status);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/intelligence/optimize-title - Generate title variations for any text
router.post('/optimize-title', (req, res) => {
  try {
    const { title } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp tiêu đề gốc' });
    }
    const variations = AIIntelligenceService.optimizeTitle(title.trim());
    res.json({ success: true, variations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/intelligence/export-markdown/:id - Download or get raw markdown
router.get('/export-markdown/:id', (req, res) => {
  try {
    const { id } = req.params;
    const report = AIIntelligenceService.getReport(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy báo cáo' });
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="AI_Report_${report.id}.md"`);
    res.send(report.markdownReport);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
