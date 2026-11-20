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
  x: number;
  y: number;
  scale: number;
  borderRadius: number;
  folder: string;
  mute: boolean;
  loop: boolean;
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
  position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
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
