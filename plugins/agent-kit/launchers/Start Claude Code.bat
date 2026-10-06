@echo off
rem Pick a folder, then open Claude Code in it. Starts Claude Code on Sonnet (the cheap default); use /model to switch to Opus for hard design.
title Claude Code
set "PATH=%USERPROFILE%\.local\bin;%PATH%"
for /f "usebackq delims=" %%F in (`powershell -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Pick the folder Claude Code should work in'; $d.SelectedPath = [Environment]::GetFolderPath('MyDocuments'); if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }"`) do set "FOLDER=%%F"
if not defined FOLDER (
  echo No folder picked. Close this window and double-click again to retry.
  pause
  exit /b
)
where claude >nul 2>nul || (
  echo Claude Code isn't installed yet. Double-click "Connect Agent Kit.bat" first.
  pause
  exit /b
)
cd /d "%FOLDER%"
cls
echo  Claude Code is working in: %FOLDER%
echo.
echo   1. Just type what you want and press Enter.
echo   2. For a big job with several parts:  /orchestra:orchestra run ^<what you want built^>
echo   3. Type /exit to quit.
echo.
claude --model sonnet
pause
