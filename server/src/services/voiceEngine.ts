import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { Project, ScriptScene, AudioItem } from '../types.js';
import { getStorageDir } from '../storagePath.js';
import { getTTSProvider, EdgeTTSProvider, GoogleTTSProvider, SyntheticProvider } from './ttsProviders/index.js';
import { OllamaService } from './ollamaService.js';

export class VoiceEngine {
  /**
   * Generate audio for a single scene using active TTS Provider (Edge, Piper, Google, or Synthetic)
   * and save to storage/audio/
   */
  static async generateSceneAudio(project: Project, scene: ScriptScene): Promise<AudioItem> {
    const storageDir = getStorageDir();
    const audioDir = path.join(storageDir, 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const speed = project.config.tts?.speed || 1.2;
    const provider = await getTTSProvider();

    console.log(`[VoiceEngine] Synthesizing scene "${scene.title}" (${scene.id}) using ${provider.name}...`);
    
    let buffer: Buffer;
    let duration: number;

    try {
      const res = await provider.synthesize(scene.text, {
        voice: scene.voice,
        speed
      });
      buffer = res.buffer;
      duration = res.duration;
    } catch (err: any) {
      console.warn(`[VoiceEngine] Primary provider failed for scene ${scene.id}: ${err.message}. Trying Google TTS...`);
      try {
        const google = new GoogleTTSProvider();
        const res = await google.synthesize(scene.text, { voice: scene.voice, speed });
        buffer = res.buffer;
        duration = res.duration;
      } catch (gErr: any) {
        console.warn(`[VoiceEngine] Google TTS failed: ${gErr.message}. Falling back to synthetic audio...`);
        const synth = new SyntheticProvider();
        const res = await synth.synthesize(scene.text, { voice: scene.voice, speed });
        buffer = res.buffer;
        duration = res.duration;
      }
    }

    const audioId = `aud_${scene.id}_${Date.now()}`;
    const fileName = `${audioId}.wav`;
    const filePath = path.join(audioDir, fileName);
    const fileUrl = `/api/audio/${fileName}`;

    fs.writeFileSync(filePath, buffer);

    const now = new Date().toISOString();

    // Upsert into audios table
    db.prepare('DELETE FROM audios WHERE scene_id = ?').run(scene.id);
    db.prepare(`
      INSERT INTO audios (id, project_id, scene_id, file_path, file_url, voice, duration, text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(audioId, project.id, scene.id, filePath, fileUrl, scene.voice, duration, scene.text, now);

    // Update scene duration in database
    db.prepare('UPDATE scenes SET duration = ? WHERE id = ?').run(duration, scene.id);

    return {
      id: audioId,
      projectId: project.id,
      sceneId: scene.id,
      filePath,
      fileUrl,
      voice: scene.voice,
      duration,
      text: scene.text,
      createdAt: now
    };
  }

  /**
   * Generate audio for all selected scenes
   */
  static async generateAllScenes(project: Project): Promise<AudioItem[]> {
    const results: AudioItem[] = [];
    const selectedScenes = project.scenes.filter(s => s.selected);

    console.log(`[VoiceEngine] Starting batch audio generation for ${selectedScenes.length} scenes...`);
    for (const sc of selectedScenes) {
      const item = await this.generateSceneAudio(project, sc);
      results.push(item);
    }

    return results;
  }

  /**
   * List all generated audios for a project
   */
  static listAudios(projectId: string): AudioItem[] {
    const rows = db.prepare('SELECT * FROM audios WHERE project_id = ? ORDER BY created_at ASC').all(projectId) as any[];
    return rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      sceneId: r.scene_id,
      filePath: r.file_path,
      fileUrl: r.file_url,
      voice: r.voice,
      duration: r.duration,
      text: r.text,
      createdAt: r.created_at
    }));
  }

  /**
   * AI Script Auto-Generation powered by Ollama (or structured fallbacks)
   */
  static async generateAIScript(project: Project): Promise<ScriptScene[]> {
    const post = project.post;
    const selectedComments = project.comments.filter(c => c.selected);
    const primaryVoice = project.config.tts?.previewVoice || 'VieNeu - Ngọc Huyền (Nữ miền Bắc)';
    const selectedVoicesList = project.config.tts?.selectedVoices || [];
    const voicePool = selectedVoicesList.length > 0 ? selectedVoicesList : [primaryVoice, 'VieNeu - Hải Đăng (Nam miền Nam)'];
    const voiceMode = project.config.tts?.randomVoiceMode || 'alternate';

    console.log(`[VoiceEngine] Generating AI script for project ${project.id}...`);

    const aiResult = await OllamaService.generateFullScript(
      { displayName: post.displayName, content: post.content },
      selectedComments.map(c => ({ displayName: c.displayName, content: c.content, likes: c.likes }))
    );

    const scenes: ScriptScene[] = [];
    let order = 0;

    // 1. Viral Hook
    scenes.push({
      id: `sc_hook_${Date.now()}`,
      order: order++,
      type: 'hook',
      title: 'Phần 1: Lời dẫn mở đầu (Hook)',
      text: aiResult.hook,
      voice: primaryVoice,
      duration: Math.max(3.5, aiResult.hook.split(' ').length * 0.35),
      selected: true,
      transition: 'fade',
      transitionDuration: 0.5,
      volume: 100
    });

    // 2. Original Post
    scenes.push({
      id: `sc_post_${Date.now()}`,
      order: order++,
      type: 'post',
      title: 'Phần 2: Nội dung bài viết gốc',
      text: aiResult.postNarration,
      voice: primaryVoice,
      duration: Math.max(5.0, aiResult.postNarration.split(' ').length * 0.38),
      selected: true,
      transition: 'fade',
      transitionDuration: 0.5,
      volume: 100
    });

    // 3. Highlighted Comments
    selectedComments.forEach((cmt, idx) => {
      let voice: string;
      if (voiceMode === 'fixed') {
        voice = primaryVoice;
      } else if (voiceMode === 'random') {
        voice = voicePool[Math.floor(Math.random() * voicePool.length)];
      } else {
        // Alternate across selected voices, ensuring variety from narrator
        voice = voicePool[(idx + 1) % voicePool.length] || primaryVoice;
      }
      const commentText = aiResult.commentIntros[idx] || `Người dùng ${cmt.displayName} bình luận: "${cmt.content}"`;

      scenes.push({
        id: `sc_cmt_${cmt.id}`,
        order: order++,
        type: 'comment',
        title: `Phần 3: Bình luận #${idx + 1} (${cmt.likes} tim)`,
        text: commentText,
        voice,
        duration: Math.max(3.5, commentText.split(' ').length * 0.4),
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
      title: 'Phần 4: Kết thúc & Kêu gọi tương tác',
      text: aiResult.outro,
      voice: primaryVoice,
      duration: Math.max(4.0, aiResult.outro.split(' ').length * 0.35),
      selected: true,
      transition: 'fade',
      transitionDuration: 0.5,
      volume: 100
    });

    return scenes;
  }
}
