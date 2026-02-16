@echo off
echo Stopping Service on Port 3002...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3002" ^| find "LISTENING"') do taskkill /F /PID %%a
echo Starting Server...
cd d:\website@Antigravity\taxi\backend
start /B npm start > backend.log 2>&1
echo Server restarted.
