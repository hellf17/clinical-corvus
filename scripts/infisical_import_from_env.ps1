param(
  [Parameter(Mandatory=$true)][string]$EnvFile,
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$EnvSlug # Development / Production
)

if (!(Test-Path $EnvFile)) {
  Write-Error "File not found: $EnvFile"
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq '' -or $line.StartsWith('#')) { return }
  if ($line -match '^[A-Za-z_][A-Za-z0-9_]*=') {
    $kv = $line.Split('=',2)
    $key = $kv[0]
    $val = $kv[1].Trim('''"')
    infisical secrets set --projectId $ProjectId --env $EnvSlug --secret $key --value $val | Out-Null
  }
}

Write-Host "Imported secrets from $EnvFile to project=$ProjectId env=$EnvSlug"

