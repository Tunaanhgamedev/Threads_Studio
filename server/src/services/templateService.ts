import { StudioTemplate, VideoConfig } from '../types.js';

export class TemplateService {
  private static templates: StudioTemplate[] = [
    {
      id: 'tiktok_trending',
      name: 'TikTok Trending',
      description: 'Khung hình 9:16 sống động, hiệu ứng trượt Slide, video gameplay nền dọc 100% và phụ đề vàng neon.',
      tag: 'Phổ biến nhất',
      aspectRatio: '9:16',
      cardPosition: {
        x: 50,
        y: 35,
        scale: 90,
        borderRadius: 18,
        bgStyle: 'white'
      },
      subVideoPosition: {
        enabled: true,
        layoutMode: 'fullscreen',
        x: 50,
        y: 50,
        scale: 100,
        borderRadius: 0,
        folder: '',
        mute: true,
        loop: true
      },
      watermark: {
        enabled: true,
        text: 'CRE: THUI NAO 🐾',
        position: 'top_center',
        opacity: 0.90,
        fontSize: 26
      },
      effects: {
        zoomPan: true,
        blurBackground: false,
        vignette: false,
        kenBurns: true
      },
      defaultTransition: 'slide_left',
      subtitleStyle: {
        enabled: true,
        fontSize: 44,
        primaryColor: '&H0000E6FF', // Yellow in BGR ASS
        outlineColor: '&H00000000',
        position: 'bottom'
      }
    },
    {
      id: 'youtube_shorts',
      name: 'YouTube Shorts Story',
      description: 'Phong cách kể chuyện thanh lịch với hiệu ứng mờ Fade, nền dọc 100% và phụ đề nổi bật.',
      tag: 'Kể chuyện',
      aspectRatio: '9:16',
      cardPosition: {
        x: 50,
        y: 35,
        scale: 90,
        borderRadius: 18,
        bgStyle: 'white'
      },
      subVideoPosition: {
        enabled: true,
        layoutMode: 'fullscreen',
        x: 50,
        y: 50,
        scale: 100,
        borderRadius: 0,
        folder: '',
        mute: true,
        loop: true
      },
      watermark: {
        enabled: true,
        text: 'CRE: THUI NAO 🐾',
        position: 'top_center',
        opacity: 0.90,
        fontSize: 26
      },
      effects: {
        zoomPan: false,
        blurBackground: false,
        vignette: true,
        kenBurns: false
      },
      defaultTransition: 'fade',
      subtitleStyle: {
        enabled: true,
        fontSize: 44,
        primaryColor: '&H0000E6FF',
        outlineColor: '&H00000000',
        position: 'bottom'
      }
    },
    {
      id: 'reels_viral',
      name: 'Reels Viral Zoom',
      description: 'Chuyển cảnh Zoom kịch tính kết hợp khung viền bo tròn 20px hiện đại và video gameplay dọc 100%.',
      tag: 'Kịch tính',
      aspectRatio: '9:16',
      cardPosition: {
        x: 50,
        y: 35,
        scale: 90,
        borderRadius: 18,
        bgStyle: 'white'
      },
      subVideoPosition: {
        enabled: true,
        layoutMode: 'fullscreen',
        x: 50,
        y: 50,
        scale: 100,
        borderRadius: 0,
        folder: '',
        mute: true,
        loop: true
      },
      watermark: {
        enabled: true,
        text: 'CRE: THUI NAO 🐾',
        position: 'top_center',
        opacity: 0.90,
        fontSize: 26
      },
      effects: {
        zoomPan: true,
        blurBackground: false,
        vignette: true,
        kenBurns: false
      },
      defaultTransition: 'zoom_in',
      subtitleStyle: {
        enabled: true,
        fontSize: 44,
        primaryColor: '&H0000E6FF',
        outlineColor: '&H00000000',
        position: 'bottom'
      }
    },
    {
      id: 'square_community',
      name: 'Square 1:1 Community',
      description: 'Định dạng vuông cổ điển, tập trung toàn diện vào nội dung thảo luận và bình luận.',
      tag: 'Vuông 1:1',
      aspectRatio: '1:1',
      cardPosition: {
        x: 50,
        y: 50,
        scale: 110,
        borderRadius: 16,
        bgStyle: 'dark'
      },
      subVideoPosition: {
        enabled: false,
        x: 50,
        y: 50,
        scale: 100,
        borderRadius: 12,
        folder: '',
        mute: true,
        loop: false
      },
      watermark: {
        enabled: true,
        text: 'Threads Community',
        position: 'bottom_right',
        opacity: 0.6,
        fontSize: 24
      },
      effects: {
        zoomPan: false,
        blurBackground: true,
        vignette: false,
        kenBurns: false
      },
      defaultTransition: 'fade',
      subtitleStyle: {
        enabled: true,
        fontSize: 36,
        primaryColor: '&H00FFFFFF',
        outlineColor: '&H00000000',
        position: 'bottom'
      }
    }
  ];

  static listTemplates(): StudioTemplate[] {
    return this.templates;
  }

  static getTemplate(id: string): StudioTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  static applyTemplateToConfig(currentConfig: VideoConfig, template: StudioTemplate): VideoConfig {
    return {
      ...currentConfig,
      aspectRatio: template.aspectRatio,
      cardPosition: { ...template.cardPosition },
      subVideoPosition: {
        ...template.subVideoPosition,
        folder: currentConfig.subVideoPosition?.folder || template.subVideoPosition.folder
      },
      watermark: { ...template.watermark },
      effects: { ...template.effects },
      defaultTransition: template.defaultTransition,
      subtitleStyle: { ...template.subtitleStyle },
      selectedTemplateId: template.id
    };
  }
}
