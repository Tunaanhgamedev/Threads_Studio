import { execSync } from 'child_process';
import path from 'path';

console.log('======================================================================');
console.log('      THREADS CONTENT STUDIO - RUNNING COMPLETE TEST SUITE            ');
console.log('======================================================================');
console.log('');

const tsxPath = path.resolve('server/node_modules/.bin/tsx');

function runStep(name: string, scriptPath: string) {
  console.log(`>>> Dang chay: ${name}...`);
  try {
    execSync(`"${tsxPath}" "${path.resolve(scriptPath)}"`, { stdio: 'inherit' });
    console.log(`[PASS] ${name} thanh cong!\n`);
  } catch (err: any) {
    console.error(`[FAIL] ${name} gap loi:`, err.message);
    process.exit(1);
  }
}

// 1. Unit Tests (16 tests)
runStep('16/16 Unit Tests', 'tests/unit/index.ts');

// 2. Media Test (FFmpeg / FFprobe)
runStep('FFmpeg/FFprobe Media Test', 'tests/media/ffmpegSmoke.test.ts');

// 3. UI Smoke Test
runStep('UI & Playwright Smoke Test', 'tests/ui/uiSmoke.test.ts');

// 4. Release Engineering Check
runStep('Release Check (28 Models & 6 JSONs)', 'tests/release-check.ts');

console.log('======================================================================');
console.log('         TAT CA CAC BAI KIEM TRA DEU DAT CHUAN XUAT SAC!              ');
console.log('======================================================================');
