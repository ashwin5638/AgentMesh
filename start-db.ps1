$pgData = "$env:USERPROFILE\scoop\apps\postgresql\current\data"
$pgLog = "$env:USERPROFILE\scoop\apps\postgresql\current\logfile.log"

Write-Host "Starting local PostgreSQL on port 5433..." -ForegroundColor Cyan
pg_ctl start -D $pgData -l $pgLog
pg_ctl status -D $pgData
