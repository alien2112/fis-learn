param(
  [switch]$KeepDb
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$pidsPath = Join-Path $root 'logs/dev-services.pids.json'

if (Test-Path -LiteralPath $pidsPath) {
  $pids = Get-Content -LiteralPath $pidsPath -Encoding utf8 | ConvertFrom-Json

  foreach ($name in @('admin', 'web', 'api')) {
    $procId = $pids.$name
    if (-not $procId) { continue }

    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($null -ne $proc) {
      # Kill process tree (pnpm -> node). Stop-Process often leaves the child node process alive.
      & taskkill.exe /PID $procId /T /F | Out-Null
      Write-Host "Stopped $name (PID $procId)"
    }
  }
} else {
  Write-Host "PID file not found: $pidsPath"
}

if (-not $KeepDb) {
  Push-Location $root
  try {
    pnpm -s db:down | Out-Null
    Write-Host "Stopped database containers"
  } finally {
    Pop-Location
  }
}
