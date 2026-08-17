# AI Physique Analyzer launcher
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Chua cai Node.js 20+." -ForegroundColor Red
  Read-Host "Nhan Enter de thoat"
  exit 1
}
if (-not $env:GEMINI_API_KEY) {
  Write-Host "Chua co GEMINI_API_KEY." -ForegroundColor Yellow
  Write-Host 'Chay: $env:GEMINI_API_KEY="YOUR_API_KEY"' -ForegroundColor Yellow
}
Start-Process "http://localhost:3000"
node server.mjs
Read-Host "Nhan Enter de thoat"
