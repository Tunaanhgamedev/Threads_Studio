export interface OllamaStatus {
  available: boolean;
  model?: string;
  availableModels: string[];
  error?: string;
}

export interface GeneratedScript {
  hook: string;
  postNarration: string;
  commentIntros: string[];
  outro: string;
}

export class OllamaService {
  private static getBaseUrl(): string {
    return process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  }

  private static getModel(): string {
    return process.env.OLLAMA_MODEL || 'llama3.2';
  }

  /**
   * Check if Ollama is running and retrieve list of available models
   */
  static async isAvailable(): Promise<OllamaStatus> {
    const baseUrl = this.getBaseUrl();
    const targetModel = this.getModel();

    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (!res.ok) {
        return {
          available: false,
          availableModels: [],
          error: `Ollama HTTP error ${res.status}`
        };
      }

      const data = await res.json() as { models?: Array<{ name: string }> };
      const modelList = (data.models || []).map(m => m.name);

      const matchedModel = modelList.find(m => m.startsWith(targetModel) || m === targetModel) || modelList[0];

      return {
        available: true,
        model: matchedModel || targetModel,
        availableModels: modelList
      };
    } catch (err: any) {
      return {
        available: false,
        availableModels: [],
        error: err.message || 'Cannot connect to Ollama'
      };
    }
  }

  /**
   * Helper: call Ollama /api/generate
   */
  private static async queryOllama(prompt: string, modelOverride?: string): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const model = modelOverride || this.getModel();

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9
        }
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (!response.ok) {
      throw new Error(`Ollama generation failed: HTTP ${response.status}`);
    }

    const data = await response.json() as { response?: string };
    const raw = (data.response || '').trim();

    // Clean up surrounding quotes or introductory words
    return raw.replace(/^["']|["']$/g, '').trim();
  }

  /**
   * Generate a viral Hook from a Threads post
   */
  static async generateViralHook(postContent: string, authorName: string): Promise<string> {
    const status = await this.isAvailable();
    if (!status.available) {
      return this.fallbackHook(postContent);
    }

    const prompt = `Bạn là một biên kịch video viral hàng đầu trên TikTok và Threads.
Hãy tạo MỘT câu mở đầu (Hook) cực kỳ tò mò, giật gân, cuốn hút người xem trong 3 giây đầu tiên (khoảng 15 đến 25 từ) bằng tiếng Việt cho bài viết Threads sau của tác giả ${authorName}:
"${postContent}"

Quy tắc bắt buộc:
1. Chỉ viết đúng MỘT câu mở đầu bằng tiếng Việt.
2. Không thêm lời chào, không giải thích, không để trong dấu ngoặc kép.`;

    try {
      const result = await this.queryOllama(prompt, status.model);
      if (result && result.length > 10) {
        return result;
      }
    } catch (err) {
      console.warn('[Ollama AI] Hook generation failed, using fallback:', err);
    }

    return this.fallbackHook(postContent);
  }

  /**
   * Generate an engaging commentary or intro for a comment
   */
  static async generateCommentIntro(comment: { displayName: string; content: string; likes: number }, index: number): Promise<string> {
    const status = await this.isAvailable();
    if (!status.available) {
      return `Người dùng ${comment.displayName} để lại ý kiến nhận được ${comment.likes} tim: "${comment.content}"`;
    }

    const prompt = `Bạn là biên kịch video ngắn. Hãy viết một câu dẫn dắt tự nhiên bằng tiếng Việt để giới thiệu bình luận thứ ${index + 1} có ${comment.likes} lượt thích của ${comment.displayName}:
Nội dung bình luận: "${comment.content}"

Quy tắc:
1. Giữ nguyên ý chính bình luận và tạo cảm xúc tò mò/thú vị/hài hước.
2. Viết ngắn gọn 1-2 câu, sẵn sàng để đọc thành tiếng.
3. Không thêm giải thích gì khác.`;

    try {
      const result = await this.queryOllama(prompt, status.model);
      if (result && result.length > 10) {
        return result;
      }
    } catch (err) {
      console.warn('[Ollama AI] Comment intro generation failed, using fallback:', err);
    }

    return `Người dùng ${comment.displayName} để lại ý kiến: "${comment.content}"`;
  }

  /**
   * Full AI Script Generation with fallback
   */
  static async generateFullScript(
    post: { displayName: string; content: string },
    comments: { displayName: string; content: string; likes: number }[]
  ): Promise<GeneratedScript> {
    const status = await this.isAvailable();
    console.log(`[Ollama AI] Script generation started. Ollama available: ${status.available} (${status.model || 'none'})`);

    const hook = await this.generateViralHook(post.content, post.displayName);

    const postNarration = `Tác giả ${post.displayName} vừa chia sẻ một câu chuyện gây sốt: "${post.content}"`;

    const commentIntros: string[] = [];
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      if (status.available && i < 3) {
        const intro = await this.generateCommentIntro(c, i);
        commentIntros.push(intro);
      } else {
        commentIntros.push(`Bình luận từ ${c.displayName}: "${c.content}"`);
      }
    }

    const outros = [
      'Còn bạn, bạn nghĩ sao về câu chuyện và các bình luận trên? Hãy để lại ý kiến của mình và follow kênh để không bỏ lỡ video thú vị tiếp theo nhé!',
      'Liệu góc nhìn của bạn có giống cộng đồng mạng không? Hãy comment ngay bên dưới và thả tim nếu thấy câu chuyện này hữu ích nhé!',
      'Đừng quên bấm theo dõi kênh để cập nhật những câu chuyện hot nhất trên Threads mỗi ngày!'
    ];
    const outro = outros[Math.floor(Math.random() * outros.length)];

    return {
      hook,
      postNarration,
      commentIntros,
      outro
    };
  }

  private static fallbackHook(content: string): string {
    const hooks = [
      `Một bài viết trên Threads đang khiến cộng đồng mạng xôn xao với hàng nghìn lượt tương tác. Hãy xem chuyện gì đã xảy ra nhé!`,
      `Đừng lướt qua nếu bạn chưa nghe câu chuyện cực kỳ thú vị vừa được chia sẻ trên Threads ngày hôm nay.`,
      `Câu chuyện này đang nhận được vô số bình luận tranh cãi và đồng cảm từ cư dân mạng. Xem ngay để biết lý do!`
    ];
    return hooks[Math.floor(Math.random() * hooks.length)];
  }
}
