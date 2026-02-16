@echo off
D:
cd "D:\website@Antigravity\taxi\admin-web"
echo ========================================
echo Starting Taxi Admin - Frontend Server
echo Current directory: %CD%
echo ========================================
echo.

call npm run dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo Frontend failed to start.
    pause
)
echo.
echo Process exited.
pause
