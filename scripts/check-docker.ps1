param(
  [int]$TimeoutSeconds = 300,
  [switch]$DownAfter
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$services = @("postgres", "redis", "api", "worker", "scheduler", "frontend")
$routes = @(
  "/",
  "/chat",
  "/image",
  "/video",
  "/assets",
  "/discover",
  "/credits",
  "/credits/recharge",
  "/admin",
  "/auth/login",
  "/auth/register",
  "/canvas",
  "/tools"
)

function Invoke-Native {
  param(
    [string]$FilePath,
    [string[]]$Arguments = @()
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath exited with code $LASTEXITCODE"
  }
}

function Invoke-Compose {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ComposeArgs
  )
  Push-Location $root
  try {
    Invoke-Native -FilePath docker -Arguments @(@("compose") + $ComposeArgs)
  } finally {
    Pop-Location
  }
}

function Get-ContainerHealth {
  param([string]$Service)
  $containerId = (Invoke-Compose ps -q $Service).Trim()
  if (-not $containerId) {
    return "missing"
  }
  $health = (Invoke-Native -FilePath docker -Arguments @("inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", $containerId)).Trim()
  if (-not $health) {
    return "unknown"
  }
  return $health
}

try {
  Push-Location $root
  try {
    Invoke-Native -FilePath docker -Arguments @("info") | Out-Null
    Invoke-Native -FilePath docker -Arguments @("compose", "up", "--build", "-d")
  } finally {
    Pop-Location
  }

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $states = @{}
    foreach ($service in $services) {
      $states[$service] = Get-ContainerHealth $service
    }
    $notReady = $services | Where-Object { $states[$_] -ne "healthy" }
    if (-not $notReady) {
      break
    }
    if ((Get-Date) -ge $deadline) {
      $summary = ($services | ForEach-Object { "$_=$($states[$_])" }) -join ", "
      throw "Timed out waiting for healthy services: $summary"
    }
    Start-Sleep -Seconds 5
  } while ($true)

  $apiHealth = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 15
  if ($apiHealth.StatusCode -ne 200 -or -not $apiHealth.Content.Contains('"healthy"')) {
    throw "API /health failed: $($apiHealth.StatusCode) $($apiHealth.Content)"
  }
  Write-Host "/health $($apiHealth.StatusCode)"

  foreach ($route in $routes) {
    $url = "http://localhost:3000$route"
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -ne 200) {
      throw "$route returned $($response.StatusCode)"
    }
    Write-Host "$route $($response.StatusCode)"
  }
} finally {
  if ($DownAfter) {
    Invoke-Compose down
  }
}
