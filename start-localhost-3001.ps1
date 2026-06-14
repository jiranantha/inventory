$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "Starting CMU Equipment System on http://localhost:3001" -ForegroundColor Cyan
Write-Host ""

$listeners = netstat -aon | Select-String ":3001" | Select-String "LISTENING"
foreach ($listener in $listeners) {
  $parts = ($listener.ToString() -split "\s+") | Where-Object { $_ }
  $pidToStop = $parts[-1]
  if ($pidToStop -match "^\d+$") {
    Write-Host "Closing old process on port 3001: $pidToStop" -ForegroundColor Yellow
    Stop-Process -Id ([int]$pidToStop) -Force -ErrorAction SilentlyContinue
  }
}

Start-Process "http://localhost:3001"
Write-Host "Keep this PowerShell window open. Close it only when you want to stop the website." -ForegroundColor Green
Write-Host ""

npm.cmd run dev -- -p 3001
