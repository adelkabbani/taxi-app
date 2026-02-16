
# Kill existing node processes (brute force to clear ports)
Stop-Process -Name "node" -ErrorAction SilentlyContinue
Write-Host "Killed existing node processes."

# Start server in background
$logFile = "server-debug.log"
$process = Start-Process -FilePath "node" -ArgumentList "server.js" -RedirectStandardOutput $logFile -RedirectStandardError $logFile -PassThru -NoNewWindow
Write-Host "Server started with PID: $($process.Id)"

# Wait for startup
Start-Sleep -Seconds 5

# Check if running
if ($process.HasExited) {
    Write-Host "Server CRASHED. Exit Code: $($process.ExitCode)"
    Write-Host "=== LOG CONTENT ==="
    Get-Content $logFile
} else {
    Write-Host "Server is RUNNING!"
    Write-Host "=== LOG HEAD ==="
    Get-Content $logFile -TotalCount 10
}
