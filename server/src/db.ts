import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { Project, ThreadPost, ThreadComment, ScriptScene, VideoConfig } from './types.js';
import { getStorageDir } from './storagePath.js';

const storageDir = getStorageDir();
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const dbPath = path.join(storageDir, 'threads_studio.sqlite');
console.log(`[Database] Initializing SQLite at: ${dbPath}`);

export const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    threads_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    video_config TEXT
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    url TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    replies_count INTEGER NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL,
    selected INTEGER NOT NULL DEFAULT 1,
    comment_order INTEGER NOT NULL DEFAULT 0,
    media_url TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scene_order INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    voice TEXT NOT NULL,
    duration REAL,
    selected INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS render_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    current_step TEXT NOT NULL,
    step_details TEXT,
    logs TEXT NOT NULL,
    output_video_path TEXT,
    output_video_url TEXT,
    thumbnail_url TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    error TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'light',
    aspect_ratio TEXT NOT NULL DEFAULT '9:16',
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audios (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scene_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    voice TEXT NOT NULL,
    duration REAL NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS batch_jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    completed_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'queued',
    config TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS batch_items (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    threads_url TEXT NOT NULL,
    project_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    current_step TEXT NOT NULL DEFAULT 'Chờ xử lý',
    progress INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    output_video_url TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY(batch_id) REFERENCES batch_jobs(id) ON DELETE CASCADE
  );
`);

// Migrations for Phase 6 - Advanced Video Studio
try { db.exec("ALTER TABLE scenes ADD COLUMN transition TEXT DEFAULT 'fade'"); } catch {}
try { db.exec("ALTER TABLE scenes ADD COLUMN transition_duration REAL DEFAULT 0.5"); } catch {}
try { db.exec("ALTER TABLE scenes ADD COLUMN volume REAL DEFAULT 100"); } catch {}

// Check if default project exists, if not seed it with the exact data matching user's image
const existingProjectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };

if (existingProjectCount.count === 0) {
  console.log('[Database] Seeding initial project inspired by Threads Studio mockup...');
  const initialProjectId = 'proj_threads_studio_demo';
  const now = new Date().toISOString();

  const defaultConfig: VideoConfig = {
    aspectRatio: '9:16',
    resolution: '1080p',
    fps: 30,
    maskAuthor: false,
    reviewBeforeExport: true,
    commentCount: 5,
    commentFilterMode: 'most_likes',
    cardPosition: {
      x: 50.0,
      y: 28.0,
      scale: 105.0,
      borderRadius: 16,
      bgStyle: 'white'
    },
    subVideoPosition: {
      enabled: true,
      x: 50.0,
      y: 65.0,
      scale: 110.0,
      borderRadius: 12,
      folder: '',
      mute: true,
      loop: true
    },
    backgroundVideoFolder: '',
    backgroundMusic: {
      folder: '',
      volume: 20,
      enabled: true
    },
    tts: {
      previewVoice: 'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
      speed: 1.20,
      randomVoiceMode: 'random',
      selectedVoices: ['VieNeu - Ngọc Huyền (Nữ miền Bắc)', 'VieNeu - Hải Đăng (Nam miền Nam)'],
      readPost: true,
      readComments: true,
      readAuthorName: true,
      voiceVolume: 85
    }
  };

  db.prepare(`
    INSERT INTO projects (id, title, threads_url, status, created_at, updated_at, video_config)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    initialProjectId,
    'Một câu chuyện hay bắt đầu từ những điều rất nhỏ',
    'https://www.threads.net/share/Bp3XJQNdMh',
    'fetched',
    now,
    now,
    JSON.stringify(defaultConfig)
  );

  db.prepare(`
    INSERT INTO posts (id, project_id, url, username, display_name, avatar, content, media_urls, timestamp, likes, replies_count, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'post_demo_01',
    initialProjectId,
    'https://www.threads.net/share/Bp3XJQNdMh',
    'viet_story',
    'Việt Storyteller',
    'https://api.dicebear.com/7.x/bottts/svg?seed=viet_story',
    'Một câu chuyện hay bắt đầu từ những điều rất nhỏ. Bạn có bao giờ tự hỏi liệu một quyết định bất ngờ trong quá khứ đã thay đổi hoàn toàn tương lai của bạn như thế nào chưa?',
    JSON.stringify(['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800']),
    '3 giờ',
    2150,
    128,
    1
  );

  const demoComments = [
    {
      id: 'cmt_01',
      username: 'user_01',
      displayName: 'Minh Tuấn',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user_01',
      content: 'Không ngờ câu chuyện này lại có kết quả như vậy 😂 Đúng là người tính không bằng trời tính!',
      likes: 542,
      timestamp: '2 giờ',
      order: 1
    },
    {
      id: 'cmt_02',
      username: 'linh_dan_99',
      displayName: 'Linh Đan',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=linh_dan',
      content: 'Đọc mà nổi hết cả da gà, hồi năm 2020 mình cũng từng có một lựa chọn tương tự và cuộc đời rẽ hẳn sang hướng khác.',
      likes: 389,
      timestamp: '2 giờ',
      order: 2
    },
    {
      id: 'cmt_03',
      username: 'hai_dang_coder',
      displayName: 'Hải Đăng',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hai_dang',
      content: 'Chính xác luôn, lúc đó tưởng là thất bại lớn nhất nhưng hóa ra lại là bước đệm đưa mình tới thành công.',
      likes: 215,
      timestamp: '1 giờ',
      order: 3
    },
    {
      id: 'cmt_04',
      username: 'mai_hoa_travel',
      displayName: 'Mai Hoa',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mai_hoa',
      content: 'Xin vía thành công từ tác giả ạ, câu chuyện truyền cảm hứng quá!',
      likes: 184,
      timestamp: '45 phút',
      order: 4
    },
    {
      id: 'cmt_05',
      username: 'quoc_bao_audio',
      displayName: 'Quốc Bảo',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=quoc_bao',
      content: 'Nghe giọng đọc video này lôi cuốn ghê, hóng phần tiếp theo!',
      likes: 120,
      timestamp: '30 phút',
      order: 5
    }
  ];

  for (const c of demoComments) {
    db.prepare(`
      INSERT INTO comments (id, project_id, username, display_name, avatar, content, likes, timestamp, selected, comment_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(c.id, initialProjectId, c.username, c.displayName, c.avatar, c.content, c.likes, c.timestamp, c.order);
  }

  // Demo scenes
  const scenes = [
    {
      id: 'sc_hook',
      order: 0,
      type: 'hook',
      title: 'Mở đầu (Hook)',
      text: 'Một câu chuyện cực kỳ thú vị trên Threads đang khiến cộng đồng mạng xôn xao bàn tán.',
      voice: 'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
      duration: 3.5
    },
    {
      id: 'sc_post',
      order: 1,
      type: 'post',
      title: 'Bài viết chính',
      text: 'Tác giả chia sẻ: Một câu chuyện hay bắt đầu từ những điều rất nhỏ. Bạn có bao giờ tự hỏi liệu một quyết định bất ngờ trong quá khứ đã thay đổi tương lai chưa?',
      voice: 'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
      duration: 6.2
    },
    {
      id: 'sc_cmt_1',
      order: 2,
      type: 'comment',
      title: 'Bình luận 1',
      text: 'Người dùng Minh Tuấn để lại bình luận: Không ngờ câu chuyện này lại có kết quả như vậy! Đúng là người tính không bằng trời tính.',
      voice: 'VieNeu - Hải Đăng (Nam miền Nam)',
      duration: 4.8
    },
    {
      id: 'sc_cmt_2',
      order: 3,
      type: 'comment',
      title: 'Bình luận 2',
      text: 'Bạn Linh Đan nhận xét: Đọc mà nổi hết cả da gà, năm 2020 mình cũng từng có lựa chọn tương tự và cuộc đời rẽ sang hướng khác.',
      voice: 'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
      duration: 5.1
    },
    {
      id: 'sc_outro',
      order: 4,
      type: 'outro',
      title: 'Kết thúc (Outro)',
      text: 'Còn bạn, bạn nghĩ sao về câu chuyện này? Hãy để lại ý kiến dưới phần bình luận nhé!',
      voice: 'VieNeu - Hải Đăng (Nam miền Nam)',
      duration: 3.8
    }
  ];

  for (const sc of scenes) {
    db.prepare(`
      INSERT INTO scenes (id, project_id, scene_order, type, title, text, voice, duration, selected)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(sc.id, initialProjectId, sc.order, sc.type, sc.title, sc.text, sc.voice, sc.duration);
  }
}
