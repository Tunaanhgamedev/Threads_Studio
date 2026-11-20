@echo off
title Threads Content Studio - Khoi dong ung dung
setlocal enabledelayedexpansion

:: Chuyen den thu muc chua file bat
cd /d "%~dp0"

:: Them cac duong dan pho bien vao PATH
set "PATH=%PATH%;D:\DevData\npm-global;D:\Nodejs;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\pnpm"

echo ===================================================================
echo             THREADS CONTENT STUDIO - AUTO VIDEO MAKER             
echo ===================================================================
echo.
echo [1/3] Dang kiem tra moi truong Node.js va pnpm...

where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [CANH BAO] Khong tim thay pnpm trong PATH mac dinh.
)

echo [2/3] Dang khoi dong Backend API va Frontend Studio...
echo.

:: Tu dong mo cua so app desktop bang Chrome / Edge PWA Mode sau 3 giay
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3; if (Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe') { Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--app=http://localhost:5173', '--window-size=1366,850' } elseif (Test-Path 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') { Start-Process 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList '--app=http://localhost:5173', '--window-size=1366,850' } else { Start-Process 'http://localhost:5173' }"

echo [3/3] Dang mo giao dien ung dung Threads Studio...
echo.
echo ===================================================================
echo  He thong dang chay! Cua so App Studio dang mo len.
echo  De tat ung dung, ban chi can dong cua so nay hoac dong App.
echo  - Frontend Studio: http://localhost:5173
echo  - Backend API:     http://localhost:3210
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
