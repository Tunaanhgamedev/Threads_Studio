import { Router } from 'express';
import { YouTubeService } from '../services/youtubeService.js';
import { YouTubeAnalyticsService } from '../services/youtubeAnalyticsService.js';

const router = Router();

// GET /api/youtube/auth-url - Generate Google OAuth URL
router.get('/auth-url', (req, res) => {
  try {
    const { redirectUri } = req.query as { redirectUri?: string };
    const auth = YouTubeService.getAuthUrl(redirectUri);
    res.json({ success: true, ...auth });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/youtube/oauth/callback - Google OAuth callback endpoint
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, error, state } = req.query as { code?: string; error?: string; state?: string };

    if (error) {
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; background: #070d19; color: #f87171; display: flex; align-items: center; justify-content: center; height: 100vh;">
            <div style="background: #111e33; padding: 30px; border-radius: 16px; border: 1px solid #243b60; text-align: center; max-width: 480px;">
              <h2>Lỗi xác thực Google OAuth</h2>
              <p>${error}</p>
              <button onclick="window.close()" style="margin-top: 15px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer;">Đóng cửa sổ</button>
            </div>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send('Không nhận được authorization code từ Google.');
    }

    const account = await YouTubeService.handleOAuthCallback(code);

    res.send(`
      <html>
        <head><title>Kết nối YouTube thành công</title></head>
        <body style="font-family: sans-serif; background: #070d19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh;">
          <div style="background: #111e33; padding: 36px; border-radius: 20px; border: 1px solid #243b60; text-align: center; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
            <h2 style="color: #38bdf8; margin-bottom: 8px;">Đã kết nối YouTube thành công!</h2>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
              Kênh <strong>${account.channelTitle}</strong> (${account.channelHandle || ''}) đã sẵn sàng để xuất bản video.
            </p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'YOUTUBE_CONNECTED', accountId: '${account.id}' }, '*');
                setTimeout(() => window.close(), 1200);
              } else {
                setTimeout(() => window.location.href = 'http://localhost:5173/?tab=youtube', 1500);
              }
            </script>
            <p style="font-size: 12px; color: #64748b;">Cửa sổ sẽ tự đóng trong giây lát...</p>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; background: #070d19; color: #f87171; display: flex; align-items: center; justify-content: center; height: 100vh;">
          <div style="background: #111e33; padding: 30px; border-radius: 16px; border: 1px solid #243b60; text-align: center; max-width: 480px;">
            <h2>Kết nối thất bại</h2>
            <p style="font-size: 13px; color: #cbd5e1;">${err.message}</p>
            <button onclick="window.close()" style="margin-top: 15px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer;">Đóng cửa sổ</button>
          </div>
        </body>
      </html>
    `);
  }
});

// GET /api/youtube/accounts - List all connected YouTube accounts
router.get('/accounts', (req, res) => {
  try {
    const accounts = YouTubeService.listAccounts();
    res.json({ success: true, accounts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/youtube/accounts/manual - Add demo/manual channel
router.post('/accounts/manual', (req, res) => {
  try {
    const { channelTitle, channelHandle, avatarUrl, accessToken } = req.body || {};
    const account = YouTubeService.addManualAccount({
      channelTitle: channelTitle || 'Kênh Sáng Tạo Video',
      channelHandle,
      avatarUrl,
      accessToken
    });
    res.json({ success: true, account });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/youtube/accounts/:id - Disconnect account
router.delete('/accounts/:id', (req, res) => {
  try {
    const { id } = req.params;
    YouTubeService.deleteAccount(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/youtube/videos/available - List rendered MP4s ready for upload
router.get('/videos/available', (req, res) => {
  try {
    const videos = YouTubeService.listAvailableVideos();
    res.json({ success: true, videos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/youtube/metadata/generate - Generate title, description & tags
router.post('/metadata/generate', (req, res) => {
  try {
    const { projectId, customTitle } = req.body || {};
    const metadata = YouTubeService.generateMetadata(projectId, customTitle);
    res.json({ success: true, ...metadata });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/youtube/publishes - List all publish tasks / history
router.get('/publishes', (req, res) => {
  try {
    const publishes = YouTubeService.listPublishes();
    res.json({ success: true, publishes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/youtube/publishes - Create a new publish task
router.post('/publishes', (req, res) => {
  try {
    const publish = YouTubeService.createPublishDraft(req.body);
    res.json({ success: true, publish });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/youtube/publishes/:id - Update publish task
router.put('/publishes/:id', (req, res) => {
  try {
    const { id } = req.params;
    YouTubeService.updatePublish(id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/youtube/publishes/:id - Delete publish task
router.delete('/publishes/:id', (req, res) => {
  try {
    const { id } = req.params;
    YouTubeService.deletePublish(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/youtube/publishes/:id/upload - Trigger upload process
router.post('/publishes/:id/upload', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await YouTubeService.uploadVideo(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/youtube/publishes/:id/status - Check video processing status on YouTube
router.get('/publishes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const status = await YouTubeService.checkProcessingStatus(id);
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/youtube/analytics/overview - Fetch channel analytics (views, watch time, retention, top videos)
router.get('/analytics/overview', async (req, res) => {
  try {
    const { accountId, days, forceRefresh } = req.query as { accountId?: string; days?: string; forceRefresh?: string };
    const periodDays = Number(days) || 28;
    const isForce = forceRefresh === 'true' || forceRefresh === '1';
    
    const overview = await YouTubeAnalyticsService.getOverview(accountId || '', periodDays, isForce);
    res.json({ success: true, overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/youtube/analytics/sync - Force immediate refresh of analytics
router.post('/analytics/sync', async (req, res) => {
  try {
    const { accountId, days } = req.body || {};
    const periodDays = Number(days) || 28;
    
    const overview = await YouTubeAnalyticsService.getOverview(accountId || '', periodDays, true);
    res.json({ success: true, overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
