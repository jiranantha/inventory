@echo off
setlocal EnableExtensions EnableDelayedExpansion
title CMU Equipment System - localhost:3001

cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
set "PORT=3001"

echo ===============================================
echo  CMU Equipment System
echo  Project: %PROJECT_DIR%
echo  URL: http://localhost:%PORT%
echo ===============================================
echo.

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm.cmd was not found.
  echo Please install Node.js, then open this file again.
  echo.
  pause
  exit /b 1
)

echo Checking if http://localhost:%PORT% is already running...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%PORT%' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 (
  echo.
  echo The website is already running at http://localhost:%PORT%
  echo You can go back to the browser and press Ctrl+F5.
  echo This window did not stop the existing server.
  echo.
  start "" "http://localhost:%PORT%"
  pause
  exit /b 0
)

echo Checking old process on port %PORT%...
set "STOPPED_PIDS=;"
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  echo !STOPPED_PIDS! | findstr /c:";%%P;" >nul
  if errorlevel 1 (
    if not "%%P"=="0" (
      set "STOPPED_PIDS=!STOPPED_PIDS!%%P;"
      call :StopPid %%P
    )
  )
)

timeout /t 2 /nobreak >nul

set "PORT_BUSY="
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  set "PORT_BUSY=%%P"
)

if not "%PORT_BUSY%"=="" (
  echo.
  echo Port %PORT% is still being used by PID %PORT_BUSY%.
  echo Please close that node.exe process in Task Manager, or right-click this file and choose "Run as administrator".
  echo.
  pause
  exit /b 1
)

echo.
echo Starting Next.js dev server on port %PORT%...
echo Keep this window open while using the website.
echo If an error occurs, it will stay visible in this window.
echo.

call npm.cmd run dev -- -p %PORT% 2>&1

echo.
echo Dev server stopped or failed.
echo Check the messages above, then press any key to close this window.
echo.
pause
exit /b

:StopPid
set "PID_TO_STOP=%~1"
echo Stopping old process PID %PID_TO_STOP%
taskkill /PID %PID_TO_STOP% /T /F >nul 2>nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Id %PID_TO_STOP% -Force -ErrorAction SilentlyContinue" >nul 2>nul
exit /b
