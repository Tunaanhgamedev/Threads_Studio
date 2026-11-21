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

  -- Phase 8: Threads API Connector & Real Data Sync
  CREATE TABLE IF NOT EXISTS threads_accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    display_name TEXT,
    threads_user_id TEXT,
    avatar_url TEXT,
    access_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'bearer',
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    auto_sync INTEGER NOT NULL DEFAULT 1,
    sync_interval_mins INTEGER NOT NULL DEFAULT 60,
    last_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS threads_synced_posts (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    threads_id TEXT NOT NULL UNIQUE,
    permalink TEXT NOT NULL,
    author_username TEXT NOT NULL,
    author_name TEXT,
    author_avatar TEXT,
    text TEXT NOT NULL,
    media_type TEXT,
    media_url TEXT,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    raw_replies TEXT,
    timestamp TEXT NOT NULL,
    status TEXT DEFAULT 'synced',
    project_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(account_id) REFERENCES threads_accounts(id) ON DELETE SET NULL
  );

  -- Phase 9: Public Threads Discovery & Source Monitoring
  CREATE TABLE IF NOT EXISTS monitored_sources (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    follower_count INTEGER DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    min_likes_filter INTEGER NOT NULL DEFAULT 50,
    auto_queue_to_automation INTEGER NOT NULL DEFAULT 0,
    last_scraped_at TEXT,
    total_posts_discovered INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS discovered_posts (
    id TEXT PRIMARY KEY,
    source_id TEXT,
    threads_id TEXT NOT NULL,
    permalink TEXT NOT NULL UNIQUE,
    author_username TEXT NOT NULL,
    author_name TEXT,
    author_avatar TEXT,
    content TEXT NOT NULL,
    media_url TEXT,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    raw_comments TEXT,
    duplicate_hash TEXT NOT NULL,
    status TEXT DEFAULT 'discovered',
    project_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(source_id) REFERENCES monitored_sources(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS discovery_sync_logs (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_target TEXT NOT NULL,
    source_type TEXT NOT NULL,
    posts_found INTEGER NOT NULL DEFAULT 0,
    new_posts_saved INTEGER NOT NULL DEFAULT 0,
    queued_to_batch INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    message TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS discovery_rate_limits (
    type TEXT PRIMARY KEY,
    count_24h INTEGER NOT NULL DEFAULT 0,
    window_start TEXT NOT NULL
  );

  -- Phase 10: YouTube Publishing & Social Media Automation
  CREATE TABLE IF NOT EXISTS youtube_accounts (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL UNIQUE,
    channel_title TEXT NOT NULL,
    channel_handle TEXT,
    avatar_url TEXT,
    subscriber_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS youtube_publishes (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    channel_title TEXT,
    project_id TEXT,
    project_title TEXT,
    video_path TEXT NOT NULL,
    video_url TEXT,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    category_id TEXT DEFAULT '22',
    privacy_status TEXT DEFAULT 'private',
    publish_at TEXT,
    thumbnail_path TEXT,
    thumbnail_url TEXT,
    youtube_video_id TEXT,
    status TEXT DEFAULT 'draft',
    upload_progress INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT,
    FOREIGN KEY(account_id) REFERENCES youtube_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
  );

  -- Phase 11: YouTube Analytics & Content Performance
  CREATE TABLE IF NOT EXISTS youtube_analytics_reports (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    period_days INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    summary_metrics TEXT NOT NULL,
    daily_data TEXT NOT NULL,
    top_videos TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'live_youtube_api',
    synced_at TEXT NOT NULL,
    FOREIGN KEY(account_id) REFERENCES youtube_accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS youtube_video_analytics (
    id TEXT PRIMARY KEY,
    youtube_video_id TEXT NOT NULL UNIQUE,
    publish_id TEXT,
    title TEXT,
    thumbnail_url TEXT,
    views INTEGER DEFAULT 0,
    estimated_minutes_watched REAL DEFAULT 0,
    average_view_duration_seconds REAL DEFAULT 0,
    average_view_percentage REAL DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    subscribers_gained INTEGER DEFAULT 0,
    retention_rate REAL DEFAULT 0,
    synced_at TEXT NOT NULL,
    FOREIGN KEY(publish_id) REFERENCES youtube_publishes(id) ON DELETE SET NULL
  );

  -- Phase 12: AI Content Intelligence
  CREATE TABLE IF NOT EXISTS ai_content_reports (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    report_title TEXT NOT NULL,
    summary_narrative TEXT NOT NULL,
    performance_insights TEXT NOT NULL,
    content_ideas TEXT NOT NULL,
    title_suggestions TEXT NOT NULL,
    thumbnail_concepts TEXT NOT NULL,
    action_plan TEXT NOT NULL,
    markdown_report TEXT NOT NULL,
    ai_model_used TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'smart_heuristic',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    FOREIGN KEY(account_id) REFERENCES youtube_accounts(id) ON DELETE CASCADE
  );

  -- Phase 13: Content Experiment & A/B Testing
  CREATE TABLE IF NOT EXISTS content_experiments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    video_id TEXT NOT NULL,
    video_title TEXT NOT NULL,
    video_thumbnail_url TEXT,
    account_id TEXT,
    channel_title TEXT,
    experiment_type TEXT NOT NULL DEFAULT 'title',
    test_mode TEXT NOT NULL DEFAULT 'sequential',
    status TEXT NOT NULL DEFAULT 'draft',
    current_variant_id TEXT,
    winner_variant_id TEXT,
    winner_declared_at TEXT,
    hypothesis TEXT,
    conclusion TEXT,
    variants TEXT NOT NULL,
    target_metric TEXT DEFAULT 'watch_time_per_day',
    uplift_percent REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(account_id) REFERENCES youtube_accounts(id) ON DELETE SET NULL
  );

  -- Phase 14: Multi-Channel Management & Project Mappings
  CREATE TABLE IF NOT EXISTS project_channel_mappings (
    project_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES youtube_accounts(id) ON DELETE CASCADE
  );
`);

// Migrations for Phase 14 - Multi-Channel Management
try { db.exec("ALTER TABLE youtube_accounts ADD COLUMN internal_name TEXT"); } catch {}
try { db.exec("ALTER TABLE youtube_accounts ADD COLUMN timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh'"); } catch {}
try { db.exec("ALTER TABLE youtube_accounts ADD COLUMN daily_upload_limit INTEGER DEFAULT 10"); } catch {}
try { db.exec("ALTER TABLE youtube_accounts ADD COLUMN is_default INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE youtube_accounts ADD COLUMN quota_used_today INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE youtube_accounts ADD COLUMN quota_reset_at TEXT"); } catch {}

// Migrations for Phase 10 - YouTube Publishing
try { db.exec("ALTER TABLE youtube_publishes ADD COLUMN upload_progress INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE youtube_publishes ADD COLUMN youtube_video_id TEXT"); } catch {}
try { db.exec("ALTER TABLE youtube_publishes ADD COLUMN publish_at TEXT"); } catch {}

// Migrations for Phase 9 - Enhanced Monitored Sources & Rate Limits
try { db.exec("ALTER TABLE monitored_sources ADD COLUMN source_type TEXT DEFAULT 'PROFILE'"); } catch {}
try { db.exec("ALTER TABLE monitored_sources ADD COLUMN target TEXT"); } catch {}
try { db.exec("ALTER TABLE monitored_sources ADD COLUMN search_mode TEXT DEFAULT 'TOP'"); } catch {}
try { db.exec("ALTER TABLE monitored_sources ADD COLUMN media_type TEXT DEFAULT 'ALL'"); } catch {}
try { db.exec("ALTER TABLE monitored_sources ADD COLUMN limit_per_sync INTEGER DEFAULT 20"); } catch {}
try { db.exec("ALTER TABLE monitored_sources ADD COLUMN sync_interval_minutes INTEGER DEFAULT 60"); } catch {}
try { db.exec("ALTER TABLE monitored_sources ADD COLUMN fetch_replies INTEGER DEFAULT 1"); } catch {}
try { db.exec("ALTER TABLE monitored_sources ADD COLUMN next_sync_at TEXT"); } catch {}
try { db.exec("ALTER TABLE discovered_posts ADD COLUMN media_type TEXT DEFAULT 'TEXT'"); } catch {}
try { db.exec("ALTER TABLE discovered_posts ADD COLUMN batch_id TEXT"); } catch {}

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
      y: 40.0,
      scale: 92.0,
      borderRadius: 18,
      bgStyle: 'white'
    },
    subVideoPosition: {
      enabled: true,
      layoutMode: 'fullscreen',
      x: 50.0,
      y: 50.0,
      scale: 100.0,
      borderRadius: 0,
      folder: '',
      mute: true,
      loop: true,
      brightness: 80
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
    },
    watermark: {
      enabled: true,
      text: 'CRE: THUI NAO 🐾',
      position: 'top_center',
      opacity: 0.90,
      fontSize: 26
    },
    subtitleStyle: {
      enabled: true,
      fontSize: 44,
      primaryColor: '&H0000E6FF',
      outlineColor: '&H00000000',
      position: 'bottom'
    },
    effects: {
      zoomPan: true,
      blurBackground: false,
      vignette: false,
      kenBurns: false
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
