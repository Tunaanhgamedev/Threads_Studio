# ====================================================================
# Threads Content Studio - Setup Piper TTS (Vietnamese Neural Voice)
# ====================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    Threads Content Studio - Cai dat Piper TTS Local      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = $PSScriptRoot
$piperDir = Join-Path $baseDir "piper"
$modelDir = Join-Path $piperDir "models"

# 1. Tao thu muc
if (-not (Test-Path $piperDir)) {
    New-Item -ItemType Directory -Force -Path $piperDir | Out-Null
}
if (-not (Test-Path $modelDir)) {
    New-Item -ItemType Directory -Force -Path $modelDir | Out-Null
}

# 2. Tai Piper binary cho Windows AMD64
$piperExe = Join-Path $piperDir "piper.exe"
if (-not (Test-Path $piperExe)) {
    Write-Host "[1/2] Dang tai Piper TTS Windows x64..." -ForegroundColor Yellow
    $zipPath = Join-Path $piperDir "piper_windows_amd64.zip"
    $piperUrl = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $piperUrl -OutFile $zipPath -UseBasicParsing
        Write-Host "      Dang giai nen Piper..." -ForegroundColor Yellow
        Expand-Archive -Path $zipPath -DestinationPath $piperDir -Force
        
        # Di chuyen file neu bi long trong thu muc con piper/
        $nestedDir = Join-Path $piperDir "piper"
        if (Test-Path $nestedDir) {
            Get-ChildItem -Path $nestedDir | Move-Item -Destination $piperDir -Force
            Remove-Item $nestedDir -Recurse -Force
        }
        Remove-Item $zipPath -Force
        Write-Host "  -> [OK] Piper TTS binary da san sang!" -ForegroundColor Green
    } catch {
        Write-Host "  -> [LOI] Khong the tai Piper tu GitHub: $_" -ForegroundColor Red
        Write-Host "     Ban co the tai thu cong tu: $piperUrl" -ForegroundColor Gray
    }
} else {
    Write-Host "  -> [OK] Piper binary da ton tai: $piperExe" -ForegroundColor Green
}

# 3. Tai Vietnamese Voice Model (vi_VN-vais1000-medium)
$voiceName = "vi_VN-vais1000-medium"
$modelFile = Join-Path $modelDir "$voiceName.onnx"
$configFile = Join-Path $modelDir "$voiceName.onnx.json"

if (-not (Test-Path $modelFile) -or -not (Test-Path $configFile)) {
    Write-Host "[2/2] Dang tai giong doc tieng Viet ($voiceName)..." -ForegroundColor Yellow
    $modelUrl = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx"
    $configUrl = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx.json"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Write-Host "      Tai file onnx (khoang 60MB)..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $modelUrl -OutFile $modelFile -UseBasicParsing
        Write-Host "      Tai file json cau hinh..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $configUrl -OutFile $configFile -UseBasicParsing
        Write-Host "  -> [OK] Giong doc tieng Viet da san sang!" -ForegroundColor Green
    } catch {
        Write-Host "  -> [LOI] Khong the tai voice model: $_" -ForegroundColor Red
        Write-Host "     Ban co the tai truc tiep tu HuggingFace vao thu muc: $modelDir" -ForegroundColor Gray
    }
} else {
    Write-Host "  -> [OK] Model tieng Viet da ton tai: $modelFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Cai dat hoan tat! Chay lenh sau de bat server giong doc: " -ForegroundColor Green
Write-Host "   .\start-piper.ps1                                      " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
