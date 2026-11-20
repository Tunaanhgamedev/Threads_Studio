@echo off
title Threads Studio - Dang khoi dong...
cd /d "%~dp0"
set "PATH=%PATH%;D:\DevData\npm-global;D:\Nodejs;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\pnpm"

echo ===================================================================
echo             THREADS STUDIO - TU DONG HOA VIDEO THREADS             
echo ===================================================================
echo.
echo  [1/2] Dang khoi dong he thong Backend API va Frontend Studio...
echo  [2/2] Cua so giao dien ung dung Threads Studio se tu dong mo len...
echo.
echo  Frontend Studio: http://localhost:5173
echo  Backend API:     http://localhost:3210
echo ===================================================================
echo.

:: Tu dong mo cua so App Desktop (Chrome hoac Edge PWA App Mode) sau 3 giay
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3; if (Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe') { Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--app=http://localhost:5173', '--window-size=1366,850' } elseif (Test-Path 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') { Start-Process 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList '--app=http://localhost:5173', '--window-size=1366,850' } else { Start-Process 'http://localhost:5173' }"

pnpm dev
if %ERRORLEVEL% neq 0 (
    echo [CANH BAO] Dang thu chay bang npm run dev...
    npm run dev
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [LOI] Khong the khoi dong ung dung.
        echo Vui long kiem tra lai Node.js hoac chay setup.ps1!
        pause
    )
)
pause
