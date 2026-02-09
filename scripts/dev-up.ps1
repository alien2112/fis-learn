param(
  [switch]$NoDb
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (-not $NoDb) {
  Push-Location $root
  try {
    pnpm -s db:up | Out-Null
  } finally {
    Pop-Location
  }
}

function Start-DevService {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$PnpmFilter,
    [Parameter(Mandatory = $true)][string]$LogFile
  )

  $errLogFile = $LogFile -replace '\.log$', '.err.log'

  $cmd = @(
    'cd', ('"' + $root + '"'), ';',
    'pnpm', '--filter', $PnpmFilter, 'dev'
  ) -join ' '

  $proc = Start-Process `
    -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmd) `
    -WindowStyle Hidden `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError $errLogFile `
    -PassThru

  return $proc.Id
}

$pids = [ordered]@{
  startedAt = (Get-Date).ToString('o')
  api = Start-DevService -Name 'api' -PnpmFilter 'api' -LogFile (Join-Path $logDir 'api-dev.log')
  web = Start-DevService -Name 'web' -PnpmFilter 'web' -LogFile (Join-Path $logDir 'web-dev.log')
  admin = Start-DevService -Name 'admin' -PnpmFilter 'admin' -LogFile (Join-Path $logDir 'admin-dev.log')
}

$pidsPath = Join-Path $logDir 'dev-services.pids.json'
$pids | ConvertTo-Json | Set-Content -LiteralPath $pidsPath -Encoding utf8

Write-Host "Started dev services. PID file: $pidsPath"
Write-Host "API PID  : $($pids.api) (http://localhost:3011)"
Write-Host "Web PID  : $($pids.web) (http://localhost:3010)"
Write-Host "Admin PID: $($pids.admin) (http://localhost:3004)"
