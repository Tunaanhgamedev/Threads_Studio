# ====================================================================
# Threads Content Studio - Start Piper TTS Server
# ====================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    Threads Content Studio - Khoi dong Piper TTS Server    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = $PSScriptRoot
$piperExe = Join-Path $baseDir "piper\piper.exe"
$modelFile = Join-Path $baseDir "piper\models\vi_VN-vais1000-medium.onnx"

if (-not (Test-Path $piperExe)) {
    Write-Host "[CANH BAO] Khong tim thay piper.exe!" -ForegroundColor Yellow
    Write-Host "Vui long chay lenh sau de tai Piper va Model tieng Viet:" -ForegroundColor White
    Write-Host "  .\setup-piper.ps1" -ForegroundColor Green
    Write-Host ""
} elseif (-not (Test-Path $modelFile)) {
    Write-Host "[CANH BAO] Khong tim thay model vi_VN-vais1000-medium.onnx!" -ForegroundColor Yellow
    Write-Host "Vui long chay: .\setup-piper.ps1 de tu dong tai model." -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "[OK] Piper binary va Voice Model tieng Viet da san sang!" -ForegroundColor Green
}

Write-Host "Khoi dong Piper HTTP Server tai port 5000..." -ForegroundColor Cyan
Write-Host "Nhan Ctrl+C de dung server bat cu luc nao." -ForegroundColor DarkGray
Write-Host ""

node "$baseDir\piper-server.js"
