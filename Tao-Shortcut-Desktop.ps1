# Tao Shortcut Threads Studio tren Man hinh Desktop cua ban
$targetPath = "$PSScriptRoot\start.bat"
$desktopPath = [Environment]::GetFolderPath("Desktop")

if (-not (Test-Path $desktopPath)) {
    $desktopPath = "$env:USERPROFILE\Desktop"
}

$shortcutFile = Join-Path $desktopPath "Threads Studio.lnk"
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutFile)
$sc.TargetPath = $targetPath
$sc.WorkingDirectory = $PSScriptRoot
$sc.Description = "Threads Content Studio - Tu dong hoa san xuat video tu Threads"
$sc.Save()

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host " [THANH CONG] Da tao loi tat 'Threads Studio' tren Desktop!" -ForegroundColor Yellow
Write-Host " Tu gio ban chi can nhap dup chuot vao icon Threads Studio" -ForegroundColor Cyan
Write-Host " ngoai man hinh Desktop de mo app ngay lap tuc!" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
pause
