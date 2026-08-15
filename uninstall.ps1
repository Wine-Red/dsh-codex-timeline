param(
  [string]$Profile = 'web'
)

$ErrorActionPreference = 'Stop'
$dshCommand = Get-Command dsh -ErrorAction Stop

& $dshCommand.Source plugin --profile $Profile remove 'dsh-codex-timeline'
if ($LASTEXITCODE -ne 0) {
  throw "DSH plugin removal failed with exit code $LASTEXITCODE."
}

Write-Host "Removed dsh-codex-timeline from profile '$Profile'."
Write-Host 'Restart DSH Web to use the built-in Conversation UI again.'
