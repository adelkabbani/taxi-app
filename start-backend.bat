@echo off
echo Starting Taxi Dispatch Backend Server...
echo.
cd /d d:\website@Antigravity\drive2flight\backend
echo Current directory: %CD%
echo.
echo Starting server on port 3002...
echo.
node server.js
pause
