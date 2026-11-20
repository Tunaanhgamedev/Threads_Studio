Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   THREADS CONTENT STUDIO - CAI DAT HE THONG (SETUP)" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiem tra thu muc luu tru
Write-Host "[1/4] Kiem tra thu muc luu tru storage..." -ForegroundColor Yellow
$storageDir = Join-Path $PSScriptRoot "storage"
$subDirs = @("projects", "images", "audio", "videos", "temp")
foreach ($sub in $subDirs) {
    $targetPath = Join-Path $storageDir $sub
    if (!(Test-Path $targetPath)) {
        New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
    }
}
Write-Host "✓ Thu muc storage da san sang." -ForegroundColor Green

# 2. Cai dat dependencies qua pnpm
Write-Host "[2/4] Dang cai dat dependencies (pnpm install)..." -ForegroundColor Yellow
pnpm install

# 3. Phe duyet build scripts
Write-Host "[3/4] Phe duyet build scripts..." -ForegroundColor Yellow
pnpm approve-builds --all

# 4. Build du an
Write-Host "[4/4] Build Client va Server..." -ForegroundColor Yellow
pnpm build

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   CAI DAT HOAN TAT THANH CONG!" -ForegroundColor Green
Write-Host "   Chay lenh: .\start.ps1 de khoi dong studio." -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan
