import { test, describe } from 'node:test';
import assert from 'node:assert';

export function formatAssTimestamp(seconds: number): string {
  const totalCs = Math.floor(seconds * 100);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

export function wrapVietnameseSubtitle(text: string, maxCharsPerLine = 38): string {
  if (text.length <= maxCharsPerLine) return text;
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.join('\\N'); // ASS line break
}

export function generateAssStyleHeader(fontName = 'Arial', primaryColor = '&H0000E6FF'): string {
  return `Style: Default,${fontName},52,${primaryColor},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4.5,1.5,2,20,20,120,1`;
}

describe('4. Kiểm tra xử lý phụ đề (Subtitle Timing & ASS Styling)', () => {
  test('Test 10: Chuyển đổi giây thành timestamp định dạng ASS (H:MM:SS.cs) chuẩn xác', () => {
    assert.strictEqual(formatAssTimestamp(0), '0:00:00.00');
    assert.strictEqual(formatAssTimestamp(3.456), '0:00:03.45');
    assert.strictEqual(formatAssTimestamp(65.5), '0:01:05.50');
    assert.strictEqual(formatAssTimestamp(3661.05), '1:01:01.05');
  });

  test('Test 11: Tự động ngắt dòng thông minh theo cụm từ tiếng Việt không ngắt giữa từ', () => {
    const vietnameseStory = 'Một câu chuyện hay bắt đầu từ những điều rất nhỏ và những quyết định bất ngờ trong quá khứ.';
    const wrapped = wrapVietnameseSubtitle(vietnameseStory, 35);
    
    assert.ok(wrapped.includes('\\N'), 'Phải chứa ký tự ngắt dòng ASS \\N');
    const lines = wrapped.split('\\N');
    assert.ok(lines.length >= 2, 'Cần được tách thành ít nhất 2 dòng vừa vặn màn hình');
    assert.ok(lines.every(l => l.length <= 45), 'Không dòng nào bị quá dài vượt lề video');
  });

  test('Test 12: Tạo ASS style header với màu chữ vàng Shorts/TikTok (#FFE600) và viền đen dày', () => {
    const style = generateAssStyleHeader('Montserrat', '&H0000E6FF');
    assert.ok(style.includes('Montserrat'), 'Phải sử dụng đúng font chữ yêu cầu');
    assert.ok(style.includes('&H0000E6FF'), 'Màu chữ chính phải là vàng rực (&H0000E6FF / #FFE600)');
    assert.ok(style.includes('4.5'), 'Độ dày viền đen outline phải là 4.5');
  });
});
