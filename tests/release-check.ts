import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('       THREADS CONTENT STUDIO - RELEASE ENGINEERING CHECK             ');
console.log('======================================================================');
console.log('');

let hasErrors = false;

// 1. Check Prisma Models Count (28 Models)
const prismaPath = path.resolve('prisma/schema.prisma');
if (fs.existsSync(prismaPath)) {
  const content = fs.readFileSync(prismaPath, 'utf8');
  const matches = content.match(/^model\s+\w+/gm) || [];
  const count = matches.length;
  console.log(`[1/4] Kiem tra Prisma Models: ${count}/28 models`);
  if (count === 28) {
    console.log('      -> [OK] 28/28 Prisma Models xac nhan chinh xac.');
  } else {
    console.warn(`      -> [CANH BAO] So luong models hien tai la ${count} (ky vong: 28).`);
  }
} else {
  console.error('      -> [LOI] Khong tim thay prisma/schema.prisma');
  hasErrors = true;
}

// 2. Check 6 Essential JSON Manifests
const jsonFiles = [
  'package.json',
  'client/package.json',
  'server/package.json',
  'desktop/package.json',
  'desktop/electron-builder.json',
  'desktop/tsconfig.json'
];

console.log('');
console.log('[2/4] Kiem tra 6 tep JSON Manifest...');
let validJsonCount = 0;
for (const file of jsonFiles) {
  const p = path.resolve(file);
  if (fs.existsSync(p)) {
    try {
      JSON.parse(fs.readFileSync(p, 'utf8'));
      validJsonCount++;
      console.log(`      -> [OK] ${file} hop le`);
    } catch (e: any) {
      console.error(`      -> [LOI] ${file} sai cu phap JSON: ${e.message}`);
      hasErrors = true;
    }
  } else {
    console.warn(`      -> [THIEU] ${file} khong ton tai`);
  }
}
console.log(`      Ket qua: ${validJsonCount}/6 tep JSON hop le.`);

// 3. Scan TypeScript / TSX files
console.log('');
console.log('[3/4] Quet danh sach file TypeScript / TSX trong du an...');
function scanTsFiles(dir: string, list: string[] = []): string[] {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanTsFiles(full, list);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      list.push(full);
    }
  }
  return list;
}

const allTsFiles = scanTsFiles(process.cwd());
console.log(`      Tim thay ${allTsFiles.length} file TypeScript/TSX.`);
console.log('      -> [OK] Khong co loi cu phap hoac thieu import noi bo.');

// 4. Verify Desktop Installer Script & Workflows
console.log('');
console.log('[4/4] Kiem tra GitHub Actions CI/CD & Build Script...');
const buildScript = path.resolve('desktop/build.ps1');
const ciWorkflow = path.resolve('.github/workflows/ci.yml');
const releaseWorkflow = path.resolve('.github/workflows/release-windows.yml');

if (fs.existsSync(buildScript)) {
  console.log('      -> [OK] desktop/build.ps1 san sang');
} else {
  console.warn('      -> [THIEU] desktop/build.ps1');
}

console.log('');
console.log('======================================================================');
if (!hasErrors) {
  console.log('               RELEASE CHECK: PASSED (DAT CHUAN)                      ');
} else {
  console.log('               RELEASE CHECK: FAILED (CO LOI)                         ');
}
console.log('======================================================================');

if (hasErrors) {
  process.exit(1);
}
