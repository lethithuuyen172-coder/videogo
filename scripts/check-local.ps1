param(
  [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Body
  )
  Write-Host "==> $Name"
  & $Body
}

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

try {
  Invoke-Step "docker compose static config" {
    Push-Location $root
    try {
      Invoke-Native -FilePath docker -Arguments @("compose", "config", "--services")
    } finally {
      Pop-Location
    }
  }

  Invoke-Step "backend ruff" {
    Push-Location (Join-Path $root "backend")
    try {
      Invoke-Native -FilePath ruff -Arguments @("check", "app/", "tests/")
    } finally {
      Pop-Location
    }
  }

  Invoke-Step "backend pytest" {
    Push-Location (Join-Path $root "backend")
    try {
      Invoke-Native -FilePath pytest -Arguments @("-q", "-p", "no:cacheprovider", "--basetemp", ".pytest-basetemp")
    } finally {
      Pop-Location
    }
  }

  if (-not $SkipFrontendBuild) {
    Invoke-Step "frontend build" {
      Push-Location (Join-Path $root "frontend")
      try {
        Invoke-Native -FilePath npm.cmd -Arguments @("run", "build")
      } finally {
        Pop-Location
      }
    }
  }

  Invoke-Step "frontend standalone routes" {
    Push-Location (Join-Path $root "frontend")
    try {
      Invoke-Native -FilePath npm.cmd -Arguments @("run", "check:standalone")
    } finally {
      Pop-Location
    }
  }
} finally {
  $basetemp = Resolve-Path -LiteralPath (Join-Path $root "backend\.pytest-basetemp") -ErrorAction SilentlyContinue
  if ($basetemp) {
    $backendRoot = (Resolve-Path -LiteralPath (Join-Path $root "backend")).Path
    if ($basetemp.Path.StartsWith($backendRoot)) {
      Remove-Item -LiteralPath $basetemp.Path -Recurse -Force
    }
  }
}
