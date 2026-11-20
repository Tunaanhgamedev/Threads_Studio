export interface VoiceItem {
  id: string;
  name: string;
  gender: 'female' | 'male';
  region: 'Bắc' | 'Nam' | 'Trung';
  provider: 'VieNeu' | 'TikTok' | 'Edge' | 'ElevenLabs';
  description: string;
  sampleAudio?: string;
}

export class TTSService {
  private static voices: VoiceItem[] = [
    {
      id: 'vi-VN-NgocHuyen',
      name: 'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
      gender: 'female',
      region: 'Bắc',
      provider: 'VieNeu',
      description: 'Giọng đọc chuẩn Hà Nội, truyền cảm, thích hợp kể chuyện & tổng hợp tin tức'
    },
    {
      id: 'vi-VN-HaiDang',
      name: 'VieNeu - Hải Đăng (Nam miền Nam)',
      gender: 'male',
      region: 'Nam',
      provider: 'VieNeu',
      description: 'Giọng nam miền Nam hào sảng, cuốn hút, rất hợp bình luận sôi nổi'
    },
    {
      id: 'vi-VN-ThienMinh',
      name: 'VieNeu - Thiện Minh (Nam miền Bắc)',
      gender: 'male',
      region: 'Bắc',
      provider: 'VieNeu',
      description: 'Giọng nam trầm ấm, tin cậy, phù hợp đọc bài viết và lời dẫn'
    },
    {
      id: 'vi-VN-TikTok1',
      name: 'TikTok Việt 1 (Nữ viral)',
      gender: 'female',
      region: 'Bắc',
      provider: 'TikTok',
      description: 'Giọng nữ robot TikTok trending quen thuộc trên Shorts và Reels'
    },
    {
      id: 'vi-VN-TikTok2',
      name: 'TikTok Việt 2 (Nam vui vẻ)',
      gender: 'male',
      region: 'Nam',
      provider: 'TikTok',
      description: 'Giọng đọc nhanh, hài hước, kích thích tương tác người xem'
    },
    {
      id: 'vi-VN-AdamBua',
      name: 'Adam bựa - VieNeu',
      gender: 'male',
      region: 'Bắc',
      provider: 'VieNeu',
      description: 'Giọng hài hước, cà khịa, cực kỳ thu hút cho các bình luận bá đạo'
    },
    {
      id: 'vi-VN-MaiLinh',
      name: 'VieNeu - Mai Linh (Nữ miền Trung)',
      gender: 'female',
      region: 'Trung',
      provider: 'VieNeu',
      description: 'Giọng nữ miền Trung nhẹ nhàng, mộc mạc và chân thực'
    }
  ];

  static getAvailableVoices(): VoiceItem[] {
    return this.voices;
  }
}
