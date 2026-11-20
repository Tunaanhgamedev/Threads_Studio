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

export interface ScriptScene {
  id: string;
  order: number;
  type: SceneType;
  title: string;
  text: string;
  voice: string;
  duration?: number;
  selected: boolean;
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
