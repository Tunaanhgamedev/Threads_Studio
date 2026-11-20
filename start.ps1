# Threads Content Studio - Khoi dong ung dung
$Host.UI.RawUI.WindowTitle = "Threads Content Studio"

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "             THREADS CONTENT STUDIO - AUTO VIDEO MAKER             " -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/2] Dang khoi dong Backend API va Frontend Studio..." -ForegroundColor Yellow
Write-Host "      - Frontend Studio: http://localhost:5173" -ForegroundColor Cyan
Write-Host "      - Backend API:     http://localhost:3210" -ForegroundColor Cyan
Write-Host ""
Write-Host "[2/2] Cua so ung dung Threads Studio se tu dong bat len trong giay lat..." -ForegroundColor Green
Write-Host ""

# Tu dong mo cua so app Desktop bang Chrome / Edge PWA App Mode sau 3 giay
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    if (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
        Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--app=http://localhost:5173", "--window-size=1366,850"
    } elseif (Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") {
        Start-Process "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--app=http://localhost:5173", "--window-size=1366,850"
    } else {
        Start-Process "http://localhost:5173"
    }
} | Out-Null

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm dev
} else {
    npm run dev
}
