$pgData = "$env:USERPROFILE\scoop\apps\postgresql\current\data"

Write-Host "Stopping local PostgreSQL on port 5433..." -ForegroundColor Yellow
pg_ctl stop -D $pgData
