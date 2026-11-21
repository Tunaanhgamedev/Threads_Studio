import { Router, Request, Response } from 'express';
import { ReliabilityService } from '../services/reliabilityService.js';

export const reliabilityRouter = Router();
const service = ReliabilityService.getInstance();

// 1. Health Checks
reliabilityRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const report = await service.runHealthChecks();
    res.json({
      success: true,
      data: report
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi kiểm tra tình trạng hệ thống'
    });
  }
});

// 2. Storage Breakdown
reliabilityRouter.get('/storage', (req: Request, res: Response) => {
  try {
    const stats = service.getStorageStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi lấy thông tin lưu trữ'
    });
  }
});

// 3. Clean Temp Files
reliabilityRouter.post('/clean-temp', (req: Request, res: Response) => {
  try {
    const result = service.cleanTempFiles();
    res.json({
      success: result.success,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi dọn dẹp file tạm'
    });
  }
});

// 4. Backups List
reliabilityRouter.get('/backups', (req: Request, res: Response) => {
  try {
    const backups = service.getBackups();
    res.json({
      success: true,
      data: backups
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi tải danh sách sao lưu'
    });
  }
});

// 5. Create Backup
reliabilityRouter.post('/backups', async (req: Request, res: Response) => {
  try {
    const { backupType, includeDatabase, includeMedia, includeEnv, notes } = req.body;
    const backup = await service.createBackup({
      backupType,
      includeDatabase,
      includeMedia,
      includeEnv,
      notes
    });

    res.json({
      success: true,
      data: backup
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi tạo bản sao lưu'
    });
  }
});

// 6. Delete Backup
reliabilityRouter.delete('/backups/:id', (req: Request, res: Response) => {
  try {
    const backupId = String(req.params.id);
    const success = service.deleteBackup(backupId);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy bản sao lưu hoặc không thể xóa'
      });
    }

    res.json({
      success: true,
      message: 'Đã xóa bản sao lưu thành công'
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi xóa bản sao lưu'
    });
  }
});

// 7. Restore Backup
reliabilityRouter.post('/backups/:id/restore', async (req: Request, res: Response) => {
  try {
    const backupId = String(req.params.id);
    const result = await service.restoreBackup(backupId);
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi phục hồi dữ liệu từ bản sao lưu'
    });
  }
});

// 8. Schedule Configuration
reliabilityRouter.get('/schedule', (req: Request, res: Response) => {
  try {
    const schedule = service.getScheduleConfig();
    res.json({
      success: true,
      data: schedule
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi lấy cấu hình lịch sao lưu'
    });
  }
});

reliabilityRouter.put('/schedule', (req: Request, res: Response) => {
  try {
    const updated = service.updateScheduleConfig(req.body);
    res.json({
      success: true,
      data: updated
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi cập nhật lịch sao lưu'
    });
  }
});

// 9. Structured Logs
reliabilityRouter.get('/logs', (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 200;
    const level = req.query.level as string | undefined;
    const search = req.query.search as string | undefined;

    const logs = service.getLogs(limit, level, search);
    res.json({
      success: true,
      data: logs
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi đọc nhật ký hệ thống'
    });
  }
});
