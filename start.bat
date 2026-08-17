@echo off
title AI Physique Analyzer
echo ==========================================
echo      AI PHYSIQUE ANALYZER
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js 20+.
  echo Hay cai Node.js roi chay lai.
  pause
  exit /b 1
)

if "%GEMINI_API_KEY%"=="" (
  echo [CANH BAO] Chua co GEMINI_API_KEY.
  echo.
  echo Hay chay lenh nay trong PowerShell truoc:
  echo   $env:GEMINI_API_KEY="YOUR_API_KEY"
  echo.
  echo Sau do chay lai start.bat
  echo.
)

echo Dang khoi dong server...
start "" http://localhost:3000
node server.mjs
pause
