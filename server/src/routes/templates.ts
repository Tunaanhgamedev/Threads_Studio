import { Router } from 'express';
import { db } from '../db.js';
import { TemplateService } from '../services/templateService.js';
import { Project, VideoConfig } from '../types.js';

const router = Router();

// GET /api/templates - list available video studio templates
router.get('/', (req, res) => {
  res.json({
    success: true,
    templates: TemplateService.listTemplates()
  });
});

// POST /api/projects/:id/apply-template/:templateId
router.post('/projects/:id/apply-template/:templateId', (req, res) => {
  try {
    const { id, templateId } = req.params;
    const projectRow = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!projectRow) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const template = TemplateService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const currentConfig: VideoConfig = JSON.parse(projectRow.video_config || '{}');
    const updatedConfig = TemplateService.applyTemplateToConfig(currentConfig, template);

    db.prepare('UPDATE projects SET video_config = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(updatedConfig), new Date().toISOString(), id);

    // Also update scene transitions if specified
    if (template.defaultTransition) {
      db.prepare('UPDATE scenes SET transition = ? WHERE project_id = ?')
        .run(template.defaultTransition, id);
    }

    res.json({
      success: true,
      config: updatedConfig,
      template
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
