import { Router } from 'express';
import { ExperimentService } from '../services/experimentService.js';
import { CreateExperimentDto } from '../types.js';

const router = Router();

// GET /api/experiments - List experiments
router.get('/', (req, res) => {
  try {
    const { status, videoId, accountId } = req.query as {
      status?: string;
      videoId?: string;
      accountId?: string;
    };
    const experiments = ExperimentService.listExperiments({ status, videoId, accountId });
    res.json({ success: true, experiments });
  } catch (err: any) {
    console.error('[experiments:list] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/experiments/:id - Get single experiment
router.get('/:id', (req, res) => {
  try {
    const experiment = ExperimentService.getExperiment(req.params.id);
    if (!experiment) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy cuộc thử nghiệm' });
    }
    res.json({ success: true, experiment });
  } catch (err: any) {
    console.error('[experiments:get] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/experiments - Create new experiment
router.post('/', (req, res) => {
  try {
    const dto = req.body as CreateExperimentDto;
    if (!dto.title || !dto.videoId || !dto.videoTitle || !Array.isArray(dto.variants) || dto.variants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập tên cuộc thử nghiệm, Video ID và tối thiểu 2 biến thể (A, B).'
      });
    }

    const experiment = ExperimentService.createExperiment(dto);
    res.json({ success: true, experiment });
  } catch (err: any) {
    console.error('[experiments:create] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/experiments/:id/variants/:variantId/start - Start a variant in sequential mode
router.post('/:id/variants/:variantId/start', (req, res) => {
  try {
    const { id, variantId } = req.params;
    const experiment = ExperimentService.startVariant(id, variantId);
    res.json({ success: true, experiment });
  } catch (err: any) {
    console.error('[experiments:startVariant] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/experiments/:id/variants/:variantId/end - End a variant in sequential mode & sync analytics
router.post('/:id/variants/:variantId/end', async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const experiment = await ExperimentService.endVariant(id, variantId);
    res.json({ success: true, experiment });
  } catch (err: any) {
    console.error('[experiments:endVariant] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/experiments/:id/variants/:variantId/sync - Re-sync analytics for a variant
router.post('/:id/variants/:variantId/sync', async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const experiment = await ExperimentService.syncVariantAnalytics(id, variantId);
    res.json({ success: true, experiment });
  } catch (err: any) {
    console.error('[experiments:syncVariant] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/experiments/:id/native-result - Record YouTube Studio native test result
router.post('/:id/native-result', (req, res) => {
  try {
    const { id } = req.params;
    const { results } = req.body as {
      results: Array<{ variantId: string; watchTimeShare: number; impressionsCtr?: number }>;
    };

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu kết quả của các biến thể.' });
    }

    const experiment = ExperimentService.recordNativeResult(id, results);
    res.json({ success: true, experiment });
  } catch (err: any) {
    console.error('[experiments:recordNativeResult] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/experiments/:id/set-winner - Manually declare winner
router.post('/:id/set-winner', (req, res) => {
  try {
    const { id } = req.params;
    const { winnerVariantId, conclusion } = req.body as {
      winnerVariantId: string;
      conclusion?: string;
    };

    if (!winnerVariantId) {
      return res.status(400).json({ success: false, error: 'Thiếu ID biến thể chiến thắng.' });
    }

    const experiment = ExperimentService.declareWinner(id, winnerVariantId, conclusion);
    res.json({ success: true, experiment });
  } catch (err: any) {
    console.error('[experiments:setWinner] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/experiments/:id - Delete experiment
router.delete('/:id', (req, res) => {
  try {
    const success = ExperimentService.deleteExperiment(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy cuộc thử nghiệm' });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('[experiments:delete] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
