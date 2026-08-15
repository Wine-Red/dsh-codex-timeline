param(
  [string]$Profile = 'web',
  [string]$Source = 'dsh-codex-timeline'
)

$ErrorActionPreference = 'Stop'
$expectedVersion = '0.1.0-rc.6'
$dshCommand = Get-Command dsh -ErrorAction Stop
$actualVersion = (& $dshCommand.Source --version).Trim()

if ($actualVersion -ne $expectedVersion) {
  throw "dsh-codex-timeline only supports DSH $expectedVersion; found $actualVersion. Nothing was changed."
}

& $dshCommand.Source plugin --profile $Profile add $Source
if ($LASTEXITCODE -ne 0) {
  throw "DSH plugin installation failed with exit code $LASTEXITCODE."
}

Write-Host "Installed dsh-codex-timeline for DSH $expectedVersion in profile '$Profile'."
Write-Host 'Restart the active DSH Web process, then refresh the browser.'
