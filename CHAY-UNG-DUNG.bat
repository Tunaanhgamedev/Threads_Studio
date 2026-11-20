@echo off
title Threads Studio - Dang khoi dong...
cd /d "%~dp0"
set "PATH=%PATH%;D:\DevData\npm-global;D:\Nodejs;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\pnpm"

echo ===================================================================
echo             THREADS STUDIO - TU DONG HOA VIDEO THREADS             
echo ===================================================================
echo.
echo  [1/3] Don dep cac tien trinh cu va giai phong cong ket noi...

:: Don sach cac tien trinh cu chiem cong 5173 hoac 3210 de tranh bi treo app
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { 5173, 3210 -contains $_.LocalPort } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo  [2/3] Dang khoi dong Backend API va Frontend Studio...
echo.

:: Tu dong mo cua so App Desktop sau 3 giay (dung dia chi chuan 127.0.0.1:5173)
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3; if (Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe') { Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--app=http://127.0.0.1:5173', '--window-size=1366,850' } elseif (Test-Path 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') { Start-Process 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList '--app=http://127.0.0.1:5173', '--window-size=1366,850' } else { Start-Process 'http://127.0.0.1:5173' }"

echo  [3/3] Dang mo giao dien ung dung Threads Studio...
echo.
echo  Frontend Studio: http://127.0.0.1:5173
echo  Backend API:     http://127.0.0.1:3210
echo ===================================================================
echo.

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
