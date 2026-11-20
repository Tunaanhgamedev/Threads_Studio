import { Router } from 'express';
import { AutomationService } from '../services/automationService.js';

const router = Router();

// POST /api/automation/extract-urls - Parse text to detect valid Threads URLs
router.post('/extract-urls', (req, res) => {
  try {
    const { text } = req.body;
    const urls = AutomationService.extractThreadsUrls(text || '');
    res.json({
      success: true,
      count: urls.length,
      urls
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/automation/batches - Create and launch new batch automation run
router.post('/batches', (req, res) => {
  try {
    const { urls, config, title } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp ít nhất 1 đường dẫn Threads' });
    }

    const batch = AutomationService.createBatch(urls, config || {}, title);
    res.json({ success: true, batch });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/automation/batches - List all batch automation jobs
router.get('/batches', (req, res) => {
  try {
    const batches = AutomationService.listBatches();
    res.json({ success: true, batches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/automation/batches/:id - Get details of a single batch with items
router.get('/batches/:id', (req, res) => {
  try {
    const batch = AutomationService.getBatch(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy mẻ tự động này' });
    }
    res.json({ success: true, batch });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/automation/batches/:id/cancel - Cancel active batch
router.post('/batches/:id/cancel', (req, res) => {
  try {
    AutomationService.cancelBatch(req.params.id);
    res.json({ success: true, message: 'Đã gửi yêu cầu hủy mẻ tự động' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/automation/batches/:id - Delete batch history
router.delete('/batches/:id', (req, res) => {
  try {
    AutomationService.deleteBatch(req.params.id);
    res.json({ success: true, message: 'Đã xóa mẻ tự động' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
