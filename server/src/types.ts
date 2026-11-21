export interface ThreadPost {
  id: string;
  url: string;
  username: string;
  displayName: string;
  avatar: string;
  content: string;
  mediaUrls: string[];
  timestamp: string;
  likes: number;
  repliesCount: number;
  verified?: boolean;
}

export interface ThreadComment {
  id: string;
  postId: string;
  username: string;
  displayName: string;
  avatar: string;
  content: string;
  likes: number;
  timestamp: string;
  selected: boolean;
  order: number;
  mediaUrl?: string;
  replyTo?: string;
}

export type SceneType = 'hook' | 'post' | 'comment' | 'outro';
export type TransitionType = 'none' | 'fade' | 'slide_left' | 'slide_right' | 'zoom_in' | 'zoom_out';

export interface ScriptScene {
  id: string;
  order: number;
  type: SceneType;
  title: string;
  text: string;
  voice: string;
  duration?: number;
  selected: boolean;
  transition?: TransitionType;
  transitionDuration?: number; // seconds (0.1 - 1.5)
  volume?: number; // 0 - 100 percentage
}

export interface VideoPositionConfig {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  scale: number; // percentage 50-200
  borderRadius: number; // in pixels
  bgStyle: 'white' | 'dark' | 'transparent';
}

export interface SubVideoConfig {
  enabled: boolean;
  layoutMode?: 'fullscreen' | 'pip' | 'split';
  x: number;
  y: number;
  scale: number;
  borderRadius: number;
  folder: string;
  mute: boolean;
  loop: boolean;
  brightness?: number; // 40 - 100%
  blur?: number;
}

export interface BackgroundMusicConfig {
  folder: string;
  volume: number; // 0-100
  enabled: boolean;
}

export interface TTSConfig {
  previewVoice: string;
  speed: number; // e.g. 1.20
  randomVoiceMode: 'random' | 'fixed' | 'alternate';
  selectedVoices: string[];
  readPost: boolean;
  readComments: boolean;
  readAuthorName: boolean;
  voiceVolume: number; // 0-100
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  position: 'top_left' | 'top_right' | 'top_center' | 'bottom_left' | 'bottom_right';
  opacity: number; // 0.1 - 1.0
  fontSize?: number;
}

export interface VideoEffectsConfig {
  zoomPan: boolean;
  blurBackground: boolean;
  vignette: boolean;
  kenBurns: boolean;
}

export interface SubtitleStyleConfig {
  enabled: boolean;
  fontSize: number;
  primaryColor: string;
  outlineColor: string;
  position: 'bottom' | 'middle' | 'top';
}

export interface VideoConfig {
  aspectRatio: '9:16' | '16:9' | '1:1';
  resolution: '1080p' | '720p';
  fps: 30 | 60;
  maskAuthor: boolean;
  reviewBeforeExport: boolean;
  commentCount: number;
  commentFilterMode: 'most_likes' | 'latest' | 'ai_curated' | 'random';
  cardPosition: VideoPositionConfig;
  subVideoPosition: SubVideoConfig;
  backgroundVideoFolder: string;
  backgroundMusic: BackgroundMusicConfig;
  tts: TTSConfig;
  watermark?: WatermarkConfig;
  effects?: VideoEffectsConfig;
  subtitleStyle?: SubtitleStyleConfig;
  defaultTransition?: TransitionType;
  selectedTemplateId?: string;
}

export interface StudioTemplate {
  id: string;
  name: string;
  description: string;
  tag: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  cardPosition: VideoPositionConfig;
  subVideoPosition: SubVideoConfig;
  watermark: WatermarkConfig;
  effects: VideoEffectsConfig;
  defaultTransition: TransitionType;
  subtitleStyle: SubtitleStyleConfig;
}

export type RenderStatus = 'idle' | 'queued' | 'rendering' | 'completed' | 'failed';

export interface RenderJob {
  id: string;
  projectId: string;
  status: RenderStatus;
  progress: number; // 0 - 100
  currentStep: string;
  stepDetails?: string;
  logs: string[];
  outputVideoPath?: string;
  outputVideoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface Project {
  id: string;
  title: string;
  threadsUrl: string;
  status: 'draft' | 'fetching' | 'fetched' | 'rendering' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
  post: ThreadPost;
  comments: ThreadComment[];
  scenes: ScriptScene[];
  config: VideoConfig;
  lastRenderJob?: RenderJob;
}

export interface SystemSettings {
  ffmpegPath: string;
  ffmpegDetected: boolean;
  storagePath: string;
  defaultVoice: string;
  aiProvider: 'gemini' | 'openai' | 'local';
  apiKey: string;
  autoSave: boolean;
}

export interface ScreenshotItem {
  id: string;
  projectId: string;
  type: 'post' | 'comment';
  refId: string;
  filePath: string;
  fileUrl: string;
  theme: 'light' | 'dark';
  aspectRatio: '9:16' | '16:9' | '1:1';
  width: number;
  height: number;
  createdAt: string;
}

export interface AudioItem {
  id: string;
  projectId: string;
  sceneId: string;
  filePath: string;
  fileUrl: string;
  voice: string;
  duration: number;
  text: string;
  createdAt: string;
}

// Phase 7 - Automation Engine Types
export interface BatchItem {
  id: string;
  batchId: string;
  threadsUrl: string;
  projectId?: string;
  status: 'pending' | 'scraping' | 'screenshotting' | 'voicing' | 'rendering' | 'completed' | 'failed';
  currentStep: string;
  progress: number;
  error?: string;
  outputVideoUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BatchJob {
  id: string;
  title: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  status: 'queued' | 'processing' | 'completed' | 'cancelled' | 'failed';
  config: Partial<VideoConfig>;
  items?: BatchItem[];
  createdAt: string;
  updatedAt: string;
}

// Phase 8 - Threads API Connector & Real Data Sync
export interface ThreadsAccount {
  id: string;
  username: string;
  displayName?: string;
  threadsUserId?: string;
  avatarUrl?: string;
  accessToken: string;
  tokenType?: string;
  expiresAt?: string;
  isActive: boolean;
  autoSync: boolean;
  syncIntervalMins: number;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadsSyncedPost {
  id: string;
  accountId?: string;
  threadsId: string;
  permalink: string;
  authorUsername: string;
  authorName?: string;
  authorAvatar?: string;
  text: string;
  mediaType?: string;
  mediaUrl?: string;
  likesCount: number;
  repliesCount: number;
  rawReplies?: string;
  timestamp: string;
  status: 'synced' | 'imported_to_project' | 'queued_to_batch';
  projectId?: string;
  createdAt: string;
}

// Phase 9 - Public Threads Discovery & Source Monitoring
export type DiscoverySourceType = 'PROFILE' | 'KEYWORD' | 'TAG';
export type DiscoverySearchMode = 'TOP' | 'RECENT';
export type DiscoveryMediaType = 'ALL' | 'TEXT' | 'IMAGE' | 'VIDEO';

export interface MonitoredSource {
  id: string;
  sourceType: DiscoverySourceType;
  target: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  followerCount: number;
  searchMode: DiscoverySearchMode;
  mediaType: DiscoveryMediaType;
  limitPerSync: number;
  syncIntervalMinutes: number;
  fetchReplies: boolean;
  isActive: boolean;
  minLikesFilter: number;
  autoQueueToAutomation: boolean;
  lastScrapedAt?: string;
  nextSyncAt?: string;
  totalPostsDiscovered: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveredPost {
  id: string;
  sourceId?: string;
  threadsId: string;
  permalink: string;
  authorUsername: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: DiscoveryMediaType;
  likesCount: number;
  repliesCount: number;
  rawComments?: string;
  duplicateHash: string;
  status: 'discovered' | 'imported_to_project' | 'queued_to_batch';
  projectId?: string;
  batchId?: string;
  createdAt: string;
}

export interface DiscoverySyncLog {
  id: string;
  sourceId: string;
  sourceTarget: string;
  sourceType: DiscoverySourceType;
  postsFound: number;
  newPostsSaved: number;
  queuedToBatch: number;
  status: 'success' | 'warning' | 'error';
  message: string;
  createdAt: string;
}

export interface DiscoveryRateLimits {
  profileLookups: {
    used24h: number;
    max24h: number;
    remaining: number;
  };
  keywordSearches: {
    used24h: number;
    max24h: number;
    remaining: number;
  };
}

// ==================== Phase 10: YouTube Publishing ====================
export type YouTubePrivacyStatus = 'public' | 'private' | 'unlisted';
export type YouTubePublishStatus = 'draft' | 'queued' | 'uploading' | 'processing' | 'published' | 'failed';

export interface YouTubeAccount {
  id: string;
  channelId: string;
  channelTitle: string;
  channelHandle?: string;
  avatarUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  tokenExpiry?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Phase 14: Multi-Channel management fields
  internalName?: string;
  timezone?: string;
  dailyUploadLimit?: number;
  isDefault?: boolean;
  quotaUsedToday?: number;
  quotaResetAt?: string;
  todayUploadCount?: number;
}

export interface ProjectChannelMappingItem {
  projectId: string;
  projectTitle: string;
  threadsUrl: string;
  accountId?: string;
  channelTitle?: string;
  internalName?: string;
  avatarUrl?: string;
  assignedAt?: string;
}

export interface MultiChannelScheduleItem {
  id: string;
  publishId: string;
  accountId: string;
  channelTitle: string;
  internalName?: string;
  channelAvatar?: string;
  channelTimezone: string;
  projectId?: string;
  projectTitle?: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  publishAt: string;
  publishAtLocal: string;
  privacyStatus: string;
  status: YouTubePublishStatus;
}

export interface YouTubeQuotaStats {
  totalDailyQuota: number;
  usedToday: number;
  remainingUnits: number;
  percentUsed: number;
  estimatedUploadsRemaining: number;
  resetAt: string;
  resetCountdown: string;
  accountsQuota: {
    accountId: string;
    channelTitle: string;
    internalName?: string;
    avatarUrl?: string;
    uploadsToday: number;
    dailyLimit: number;
    quotaUsedUnits: number;
  }[];
}

export interface MultiChannelDashboardSummary {
  totalChannels: number;
  activeChannels: number;
  defaultChannelId?: string;
  defaultChannelName?: string;
  totalSubscribers: number;
  totalVideos: number;
  uploadsTodayTotal: number;
  scheduledCount: number;
  quotaStats: YouTubeQuotaStats;
  recentPublishes: YouTubePublishItem[];
}

export interface YouTubePublishItem {
  id: string;
  accountId?: string;
  channelTitle?: string;
  projectId?: string;
  projectTitle?: string;
  videoPath: string;
  videoUrl?: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: YouTubePrivacyStatus;
  publishAt?: string; // ISO 8601 for scheduled publishing
  thumbnailPath?: string;
  thumbnailUrl?: string;
  youtubeVideoId?: string;
  status: YouTubePublishStatus;
  uploadProgress: number; // 0 - 100
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AvailableRenderedVideo {
  projectId: string;
  projectTitle: string;
  videoPath: string;
  videoUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  authorUsername?: string;
  postContent?: string;
}

// ==================== Phase 11: YouTube Analytics ====================
export interface YouTubeDailyMetric {
  date: string;
  views: number;
  estimatedMinutesWatched: number;
  averageViewDurationSeconds: number;
  subscribersGained: number;
  subscribersLost: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface YouTubeTopVideoMetric {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  views: number;
  estimatedMinutesWatched: number;
  averageViewDurationSeconds: number;
  averageViewPercentage: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  retentionRate: number; // 0 - 100 percentage
}

export interface YouTubeAnalyticsOverview {
  accountId: string;
  channelTitle: string;
  periodDays: number;
  startDate: string;
  endDate: string;
  totalViews: number;
  totalMinutesWatched: number;
  totalHoursWatched: number;
  averageViewDurationSeconds: number;
  averageViewPercentage: number;
  netSubscribers: number;
  subscribersGained: number;
  subscribersLost: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  viewsGrowthPercent?: number;
  watchTimeGrowthPercent?: number;
  dailyData: YouTubeDailyMetric[];
  topVideos: YouTubeTopVideoMetric[];
  lastSyncedAt: string;
  source: 'live_youtube_api' | 'simulated_demo';
}

// ==================== Phase 12: AI Content Intelligence ====================
export interface AIPerformanceInsight {
  metric: string;
  value: string;
  evaluation: 'positive' | 'neutral' | 'warning';
  insightText: string;
}

export interface AIContentIdea {
  id: string;
  topic: string;
  hookPremise: string;
  format: 'Shorts (35-45s)' | 'Video dài (3-5m)';
  targetEmotion: string;
  predictedRetention: string;
  whyItWorks: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface AITitleVariation {
  id: string;
  title: string;
  angle: 'curiosity' | 'drama' | 'relatable' | 'twist';
  angleLabel: string;
  characterCount: number;
  tags: string[];
}

export interface AIThumbnailConcept {
  id: string;
  conceptTitle: string;
  visualLayout: string;
  facialExpression: string;
  textOverlay: string;
  textColor: string;
  contrastElements: string;
}

export interface AIIntelligenceReport {
  id: string;
  accountId: string;
  channelTitle: string;
  reportTitle: string;
  summaryNarrative: string;
  performanceInsights: AIPerformanceInsight[];
  contentIdeas: AIContentIdea[];
  titleSuggestions: AITitleVariation[];
  thumbnailConcepts: AIThumbnailConcept[];
  actionPlan: string[];
  markdownReport: string;
  aiModelUsed: string;
  source: 'ollama_ai' | 'smart_heuristic';
  createdAt: string;
}

// Phase 13 - Content Experiment & A/B Testing
export type ExperimentType = 'title' | 'thumbnail' | 'title_and_thumbnail';
export type ExperimentMode = 'sequential' | 'youtube_native';
export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'cancelled';
export type VariantStatus = 'pending' | 'running' | 'completed';

export interface ExperimentVariant {
  id: string;
  label: 'A' | 'B' | 'C';
  name: string;
  title?: string;
  thumbnailUrl?: string;
  status: VariantStatus;
  startDate?: string;
  endDate?: string;
  daysActive: number;
  views: number;
  watchTimeMinutes: number;
  averageViewPercentage: number;
  averageViewDurationSeconds: number;
  subscribersGained: number;
  likes: number;
  comments: number;
  shares: number;
  viewsPerDay: number;
  watchTimeMinutesPerDay: number;
  nativeWatchTimeShare?: number; // % e.g. 52.4
  nativeImpressionsCtr?: number; // % e.g. 7.5
  isWinner?: boolean;
}

export interface ContentExperiment {
  id: string;
  title: string;
  videoId: string;
  videoTitle: string;
  videoThumbnailUrl?: string;
  accountId?: string;
  channelTitle?: string;
  experimentType: ExperimentType;
  testMode: ExperimentMode;
  status: ExperimentStatus;
  currentVariantId?: string;
  winnerVariantId?: string;
  winnerDeclaredAt?: string;
  hypothesis?: string;
  conclusion?: string;
  variants: ExperimentVariant[];
  targetMetric: 'watch_time_per_day' | 'views_per_day' | 'retention_rate' | 'native_watch_time_share';
  upliftPercent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExperimentDto {
  title: string;
  videoId: string;
  videoTitle: string;
  videoThumbnailUrl?: string;
  accountId?: string;
  channelTitle?: string;
  experimentType: ExperimentType;
  testMode: ExperimentMode;
  hypothesis?: string;
  targetMetric?: 'watch_time_per_day' | 'views_per_day' | 'retention_rate' | 'native_watch_time_share';
  variants: Array<{
    label: 'A' | 'B' | 'C';
    name: string;
    title?: string;
    thumbnailUrl?: string;
  }>;
}

// Phase 15 - Reliability, Security & Backup
export interface ServiceHealthStatus {
  name: string;
  key: string;
  status: 'healthy' | 'degraded' | 'offline';
  version?: string;
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
  lastChecked: string;
}

export interface SystemHealthReport {
  overallStatus: 'healthy' | 'degraded' | 'offline';
  checkedAt: string;
  services: {
    sqlite: ServiceHealthStatus;
    ffmpeg: ServiceHealthStatus;
    piper: ServiceHealthStatus;
    ollama: ServiceHealthStatus;
    playwright: ServiceHealthStatus;
    oauth: ServiceHealthStatus;
    queue: ServiceHealthStatus;
  };
  summary: {
    healthyCount: number;
    degradedCount: number;
    offlineCount: number;
    totalCount: number;
  };
}

export interface StorageBreakdownStats {
  sqliteBytes: number;
  sqliteFormatted: string;
  videosBytes: number;
  videosFormatted: string;
  imagesBytes: number;
  imagesFormatted: string;
  audioBytes: number;
  audioFormatted: string;
  tempBytes: number;
  tempFormatted: string;
  backupsBytes: number;
  backupsFormatted: string;
  logsBytes: number;
  logsFormatted: string;
  totalAppBytes: number;
  totalAppFormatted: string;
  diskFreeBytes?: number;
  diskFreeFormatted?: string;
  diskTotalBytes?: number;
  diskTotalFormatted?: string;
  diskUsagePercent?: number;
}

export interface CleanTempResult {
  success: boolean;
  deletedCount: number;
  bytesFreed: number;
  bytesFreedFormatted: string;
  message: string;
}

export interface SystemBackupItem {
  id: string;
  backupType: 'manual' | 'scheduled' | 'pre-restore';
  filename: string;
  filePath: string;
  fileSize: number;
  fileSizeFormatted: string;
  sha256Hash: string;
  includesDatabase: boolean;
  includesMedia: boolean;
  includesEnv: boolean;
  status: 'completed' | 'failed';
  createdAt: string;
  notes?: string;
}

export interface CreateBackupDto {
  backupType?: 'manual' | 'scheduled' | 'pre-restore';
  includeDatabase?: boolean;
  includeMedia?: boolean;
  includeEnv?: boolean;
  notes?: string;
}

export interface BackupScheduleConfig {
  id: string;
  enabled: boolean;
  intervalHours: number;
  keepCount: number;
  includeMedia: boolean;
  includeEnv: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  updatedAt: string;
}

export interface SystemLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  module: string;
  message: string;
  details?: any;
}

// Phase 16 - Windows Desktop App Management
export interface DesktopStatus {
  platform: string;
  arch: string;
  nodeVersion: string;
  pid: number;
  uptimeSeconds: number;
  port: number;
  storageDir: string;
  isCustomStorageDir: boolean;
  configFilePath: string;
  deepLinkProtocol: string;
  deepLinkActive: boolean;
}

export interface DesktopServicesStatus {
  piper: {
    running: boolean;
    port: number;
    url: string;
    details?: any;
  };
  ollama: {
    running: boolean;
    port: number;
    url: string;
    details?: any;
  };
}

export interface ChangeStorageDirResult {
  success: boolean;
  oldDir: string;
  newDir: string;
  filesCopied: number;
  message: string;
}
