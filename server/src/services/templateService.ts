import { StudioTemplate, VideoConfig } from '../types.js';

export class TemplateService {
  private static templates: StudioTemplate[] = [
    {
      id: 'tiktok_trending',
      name: 'TikTok Trending',
      description: 'Khung hình 9:16 sống động, hiệu ứng chuyển cảnh trượt Slide và phụ đề vàng nổi bật.',
      tag: 'Phổ biến nhất',
      aspectRatio: '9:16',
      cardPosition: {
        x: 50,
        y: 28,
        scale: 115,
        borderRadius: 18,
        bgStyle: 'white'
      },
      subVideoPosition: {
        enabled: true,
        x: 50,
        y: 68,
        scale: 105,
        borderRadius: 16,
        folder: '',
        mute: true,
        loop: true
      },
      watermark: {
        enabled: true,
        text: '@ThreadsStudio',
        position: 'top_right',
        opacity: 0.75,
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
        fontSize: 42,
        primaryColor: '&H0000FFFF', // Yellow in BGR ASS
        outlineColor: '&H00000000',
        position: 'middle'
      }
    },
    {
      id: 'youtube_shorts',
      name: 'YouTube Shorts Story',
      description: 'Phong cách kể chuyện thanh lịch với hiệu ứng mờ Fade và tối ưu giữ chân người xem.',
      tag: 'Kể chuyện',
      aspectRatio: '9:16',
      cardPosition: {
        x: 50,
        y: 30,
        scale: 110,
        borderRadius: 12,
        bgStyle: 'white'
      },
      subVideoPosition: {
        enabled: true,
        x: 50,
        y: 66,
        scale: 100,
        borderRadius: 12,
        folder: '',
        mute: true,
        loop: true
      },
      watermark: {
        enabled: true,
        text: 'Threads Story',
        position: 'top_left',
        opacity: 0.7,
        fontSize: 24
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
        fontSize: 38,
        primaryColor: '&H00FFFFFF', // White
        outlineColor: '&H00000000',
        position: 'bottom'
      }
    },
    {
      id: 'reels_viral',
      name: 'Reels Viral Zoom',
      description: 'Chuyển cảnh Zoom cận cảnh tạo kịch tính kết hợp khung viền bo tròn hiện đại.',
      tag: 'Kịch tính',
      aspectRatio: '9:16',
      cardPosition: {
        x: 50,
        y: 32,
        scale: 118,
        borderRadius: 22,
        bgStyle: 'white'
      },
      subVideoPosition: {
        enabled: true,
        x: 50,
        y: 70,
        scale: 95,
        borderRadius: 18,
        folder: '',
        mute: true,
        loop: true
      },
      watermark: {
        enabled: true,
        text: '@ThreadsReels',
        position: 'bottom_left',
        opacity: 0.65,
        fontSize: 22
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
        fontSize: 40,
        primaryColor: '&H00FFFFFF',
        outlineColor: '&H00000000',
        position: 'middle'
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
