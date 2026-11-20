$ErrorActionPreference = 'Stop'

$mongod = 'C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe'
$data = Join-Path $env:LOCALAPPDATA 'Temp\opencode\mongodb-rs-data'
$log = Join-Path $env:LOCALAPPDATA 'Temp\opencode\mongod-rs.log'

if (Get-NetTCPConnection -LocalPort 27018 -State Listen -ErrorAction SilentlyContinue) {
  Write-Host 'Local MongoDB replica set is already running on port 27018.'
  exit 0
}

if (-not (Test-Path $mongod)) {
  throw "mongod.exe not found at $mongod. Install MongoDB Server 9.0 first."
}

New-Item -ItemType Directory -Force -Path $data | Out-Null
$process = Start-Process -FilePath $mongod -ArgumentList @(
  '--dbpath', $data,
  '--replSet', 'rs0',
  '--bind_ip', '127.0.0.1',
  '--port', '27018',
  '--logpath', $log,
  '--logappend'
) -PassThru -WindowStyle Hidden

Write-Host "Started MongoDB replica set (PID $($process.Id)) at mongodb://127.0.0.1:27018"
