@echo off
echo ========================================
echo Starting Taxi Dispatch System...
echo ========================================

echo Starting Backend...
start cmd /k "cd /d d:\website@Antigravity\drive2flight\backend && node server.js"

echo Starting Driver App...
start cmd /k "cd /d d:\website@Antigravity\drive2flight\driver-app && npm run dev"

echo Starting Admin Web...
start cmd /k "cd /d d:\website@Antigravity\drive2flight\admin-web && npm run dev"

echo ========================================
echo All services started in separate windows.
echo ========================================
pause
