import { ThreadPost, ThreadComment, ScriptScene } from '../types.js';

export class ScriptService {
  static generateScript(
    post: ThreadPost,
    comments: ThreadComment[],
    options: {
      mode?: 'full' | 'comments_only' | 'storytelling';
      readAuthorName?: boolean;
      primaryVoice?: string;
      secondaryVoice?: string;
      selectedVoices?: string[];
      randomVoiceMode?: 'random' | 'fixed' | 'alternate';
    } = {}
  ): ScriptScene[] {
    const primaryVoice = options.primaryVoice || 'VieNeu - Ngọc Huyền (Nữ miền Bắc)';
    const selectedList = options.selectedVoices && options.selectedVoices.length > 0 ? options.selectedVoices : [primaryVoice, options.secondaryVoice || 'VieNeu - Hải Đăng (Nam miền Nam)'];
    const voiceMode = options.randomVoiceMode || 'alternate';
    const readAuthorName = options.readAuthorName ?? true;
    const mode = options.mode || 'full';

    const scenes: ScriptScene[] = [];
    let order = 0;

    // 1. Hook
    scenes.push({
      id: `sc_hook_${Date.now()}`,
      order: order++,
      type: 'hook',
      title: 'Phần 1: Mở đầu (Hook)',
      text: `Một câu chuyện cực hot trên Threads đang nhận được rất nhiều sự quan tâm từ cộng đồng mạng. Cùng xem điều bất ngờ gì đã xảy ra nhé!`,
      voice: primaryVoice,
      duration: 4.2,
      selected: true,
      transition: 'fade',
      transitionDuration: 0.5,
      volume: 100
    });

    // 2. Post Content (if not comments_only)
    if (mode !== 'comments_only') {
      const authorPrefix = readAuthorName ? `Tài khoản ${post.displayName} chia sẻ: ` : '';
      scenes.push({
        id: `sc_post_${Date.now()}`,
        order: order++,
        type: 'post',
        title: 'Phần 2: Nội dung bài viết',
        text: `${authorPrefix}${post.content}`,
        voice: primaryVoice,
        duration: Math.max(5.0, Math.min(15.0, post.content.split(' ').length * 0.4)),
        selected: true,
        transition: 'fade',
        transitionDuration: 0.5,
        volume: 100
      });
    }

    // 3. Comments (selected comments only)
    const selectedComments = comments.filter(c => c.selected);
    selectedComments.forEach((cmt, idx) => {
      let voice: string;
      if (voiceMode === 'fixed') {
        voice = primaryVoice;
      } else if (voiceMode === 'random') {
        voice = selectedList[Math.floor(Math.random() * selectedList.length)];
      } else {
        voice = selectedList[(idx + 1) % selectedList.length] || primaryVoice;
      }
      const authorText = readAuthorName ? `Bình luận từ ${cmt.displayName}: ` : '';
      scenes.push({
        id: `sc_cmt_${cmt.id}`,
        order: order++,
        type: 'comment',
        title: `Phần 3: Bình luận #${idx + 1} (${cmt.likes} tim)`,
        text: `${authorText}${cmt.content}`,
        voice,
        duration: Math.max(3.5, Math.min(10.0, cmt.content.split(' ').length * 0.45)),
        selected: true,
        transition: idx % 2 === 0 ? 'slide_left' : 'fade',
        transitionDuration: 0.5,
        volume: 100
      });
    });

    // 4. Outro
    scenes.push({
      id: `sc_outro_${Date.now()}`,
      order: order++,
      type: 'outro',
      title: 'Phần 4: Kết thúc (Outro)',
      text: 'Bạn nghĩ sao về câu chuyện và những ý kiến trên? Hãy để lại bình luận phía dưới và đừng quên nhấn theo dõi để xem thêm nhiều câu chuyện hay nhé!',
      voice: primaryVoice,
      duration: 4.8,
      selected: true,
      transition: 'fade',
      transitionDuration: 0.5,
      volume: 100
    });

    return scenes;
  }
}
