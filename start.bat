@echo off
title Threads Content Studio - Khoi dong ung dung
cd /d "%~dp0"
set "PATH=%PATH%;D:\DevData\npm-global;D:\Nodejs;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\pnpm"

echo ===================================================================
echo             THREADS CONTENT STUDIO - AUTO VIDEO MAKER             
echo ===================================================================
echo.
echo [1/3] Don dep tien trinh cu va kiem tra moi truong...

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { 5173, 3210 -contains $_.LocalPort } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [2/3] Dang khoi dong Backend API va Frontend Studio...
echo.

:: Tu dong kiem tra he thong va mo cua so app desktop khi da san sang 100%
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i=0; $i -lt 30; $i++) { Start-Sleep -Milliseconds 600; try { $be = Invoke-WebRequest -Uri 'http://127.0.0.1:3210/api/health' -UseBasicParsing -TimeoutSec 1; $fe = Invoke-WebRequest -Uri 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 1; if ($be.StatusCode -eq 200 -and $fe.StatusCode -eq 200) { break } } catch {} }; if (Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe') { Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--app=http://127.0.0.1:5173', '--window-size=1366,850' } elseif (Test-Path 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') { Start-Process 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList '--app=http://127.0.0.1:5173', '--window-size=1366,850' } else { Start-Process 'http://127.0.0.1:5173' }"

echo [3/3] Dang mo giao dien ung dung Threads Studio...
echo.
echo ===================================================================
echo  He thong dang chay! Cua so App Studio dang mo len.
echo  De tat ung dung, ban chi can dong cua so nay hoac dong App.
echo  - Frontend Studio: http://127.0.0.1:5173
echo  - Backend API:     http://127.0.0.1:3210
echo ===================================================================
echo.

pnpm dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo [CANH BAO] pnpm dev gap loi. Dang thu dung npm run dev...
    npm run dev
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [LOI] Khong the khoi dong. Vui long chay .\setup.ps1 truoc!
        pause
    )
)
pause
