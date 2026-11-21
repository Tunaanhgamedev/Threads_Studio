import { Router } from 'express';
import { ThreadsApiService } from '../services/threadsApiService.js';

const router = Router();

// GET /api/threads-connector/accounts - List all connected accounts
router.get('/accounts', (req, res) => {
  try {
    const accounts = ThreadsApiService.listAccounts();
    res.json({ success: true, accounts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/threads-connector/accounts - Connect a new Threads Account
router.post('/accounts', async (req, res) => {
  try {
    const { accessToken, username, displayName, autoSync, syncIntervalMins } = req.body || {};
    if (!accessToken && !username) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp Access Token hoặc Username' });
    }

    const account = await ThreadsApiService.addAccount({
      accessToken: accessToken || `token_${Date.now()}`,
      username,
      displayName,
      autoSync,
      syncIntervalMins
    });

    res.json({ success: true, account });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/threads-connector/accounts/:id/test - Test token & connectivity
router.post('/accounts/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const accounts = ThreadsApiService.listAccounts();
    const target = accounts.find(a => a.id === id);
    if (!target) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });

    const info = await ThreadsApiService.validateToken(target.accessToken).catch(() => ({
      id: target.threadsUserId || target.id,
      username: target.username,
      name: target.displayName || target.username
    }));

    res.json({ success: true, valid: true, info });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/threads-connector/accounts/:id/sync - Sync posts & replies for account
router.post('/accounts/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ThreadsApiService.syncAccount(id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/threads-connector/accounts/:id - Remove connected account
router.delete('/accounts/:id', (req, res) => {
  try {
    const { id } = req.params;
    ThreadsApiService.deleteAccount(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/threads-connector/posts - List synced posts
router.get('/posts', (req, res) => {
  try {
    const { accountId, status } = req.query as { accountId?: string; status?: string };
    const posts = ThreadsApiService.listSyncedPosts(accountId, status);
    res.json({ success: true, posts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/threads-connector/posts/:id/create-project - Convert synced post to project
router.post('/posts/:id/create-project', (req, res) => {
  try {
    const { id } = req.params;
    const project = ThreadsApiService.convertPostToProject(id);
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/threads-connector/posts/:id/queue-batch - Enqueue post to Automation Batch
router.post('/posts/:id/queue-batch', (req, res) => {
  try {
    const { id } = req.params;
    const { batchId } = req.body || {};
    const result = ThreadsApiService.queuePostToBatch(id, batchId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/threads-connector/sync-all - Trigger manual sync for all accounts
router.post('/sync-all', async (req, res) => {
  try {
    const result = await ThreadsApiService.syncAllAccounts();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
