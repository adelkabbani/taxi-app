@echo off
echo ========================================
echo   TAXI DISPATCH - ONE COMMAND LAUNCHER
echo ========================================
echo.
echo Starting all services...
echo.

REM Auto-detect PostgreSQL service name
echo [0/4] Checking PostgreSQL Database...
set PG_SERVICE=
for /f "tokens=2 delims=:" %%a in ('sc query ^| findstr /i "postgresql"') do (
    set PG_SERVICE=%%a
    goto :found_service
)
:found_service

if defined PG_SERVICE (
    REM Remove leading spaces
    for /f "tokens=* delims= " %%b in ("%PG_SERVICE%") do set PG_SERVICE=%%b
    
    REM Check if it's running
    sc query "%PG_SERVICE%" | find "RUNNING" >nul
    if %errorlevel% neq 0 (
        echo PostgreSQL service found: %PG_SERVICE%
        echo Starting PostgreSQL...
        net start "%PG_SERVICE%" >nul 2>&1
        if %errorlevel% equ 0 (
            echo PostgreSQL started successfully!
        ) else (
            echo WARNING: Could not auto-start PostgreSQL.
            echo Please start it manually: services.msc
            echo Press any key to continue anyway...
            pause >nul
        )
    ) else (
        echo PostgreSQL is already running!
    )
) else (
    echo WARNING: PostgreSQL service not found on this system.
    echo Please install PostgreSQL or start it manually.
    echo Press any key to continue anyway...
    pause >nul
)
echo.

REM Kill any existing node processes to avoid port conflicts
echo Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1

REM Wait a moment for processes to fully terminate
timeout /t 2 /nobreak >nul

echo [1/3] Starting Backend Server (Port 3002)...
start "Backend Server" cmd /k "cd /d d:\website@Antigravity\taxi\backend && echo Backend Server Starting... && node server.js"

REM Wait for backend to initialize
timeout /t 3 /nobreak >nul

echo [2/3] Starting Admin Dashboard (Port 5173)...
start "Admin Dashboard" cmd /k "cd /d d:\website@Antigravity\taxi\admin-web && echo Admin Dashboard Starting... && npm run dev"

REM Wait for admin to initialize
timeout /t 2 /nobreak >nul

echo [3/3] Starting Driver App (Port 5174)...
start "Driver App" cmd /k "cd /d d:\website@Antigravity\taxi\driver-app && echo Driver App Starting... && npm run dev"

echo.
echo ========================================
echo   ALL SERVICES LAUNCHED!
echo ========================================
echo.
echo Three windows should have opened:
echo   1. Backend Server (Port 3002)
echo   2. Admin Dashboard (Port 5173)
echo   3. Driver App (Port 5174)
echo.
echo Wait 10-15 seconds for everything to load, then:
echo.
echo   Admin: http://localhost:5173
echo   Driver: http://localhost:5174
echo.
echo Login Credentials:
echo   Admin: admin@taxi.com / admin123
echo   Driver: driver_auto@taxi.com / driver123
echo.
echo Press any key to close this launcher window...
pause >nul
