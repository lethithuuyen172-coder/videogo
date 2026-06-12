param(
  [switch]$SkipDocker,
  [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Continue"
$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param([string]$Name, [string]$Status, [string]$Detail = "")
  $results.Add([pscustomobject]@{ Name = $Name; Status = $Status; Detail = $Detail }) | Out-Null
  Write-Host "[$Status] $Name $Detail"
}

function Invoke-VerifyStep {
  param([string]$Name, [scriptblock]$Body)
  try {
    & $Body
    Add-Result -Name $Name -Status "PASS"
  } catch {
    Add-Result -Name $Name -Status "FAIL" -Detail $_.Exception.Message
  }
}

function Invoke-Native {
  param([string]$FilePath, [string[]]$Arguments = @())
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath exited with code $LASTEXITCODE"
  }
}

Invoke-VerifyStep "git upstream" {
  Push-Location $root
  try {
    Invoke-Native -FilePath git -Arguments @("log", "videogo/main..main", "--oneline")
  } finally {
    Pop-Location
  }
}

Invoke-VerifyStep "backend ruff" {
  Push-Location (Join-Path $root "backend")
  try {
    Invoke-Native -FilePath ruff -Arguments @("check", "app/", "tests/")
  } finally {
    Pop-Location
  }
}

Invoke-VerifyStep "backend pytest" {
  Push-Location (Join-Path $root "backend")
  try {
    Invoke-Native -FilePath pytest -Arguments @("tests", "-q")
  } finally {
    Pop-Location
  }
}

Invoke-VerifyStep "backend bandit" {
  Push-Location (Join-Path $root "backend")
  try {
    Invoke-Native -FilePath bandit -Arguments @("-r", "app", "-q")
  } finally {
    Pop-Location
  }
}

Invoke-VerifyStep "frontend no latest" {
  Push-Location (Join-Path $root "frontend")
  try {
    $matches = Select-String -Path "package.json","package-lock.json" -Pattern '"latest"'
    if ($matches) {
      throw "Found `"latest`" in frontend manifests"
    }
  } finally {
    Pop-Location
  }
}

Invoke-VerifyStep "frontend npm ci" {
  Push-Location (Join-Path $root "frontend")
  try {
    Invoke-Native -FilePath npm.cmd -Arguments @("ci")
  } finally {
    Pop-Location
  }
}

if (-not $SkipFrontendBuild) {
  Invoke-VerifyStep "frontend build" {
    Push-Location (Join-Path $root "frontend")
    try {
      Invoke-Native -FilePath npm.cmd -Arguments @("run", "build")
    } finally {
      Pop-Location
    }
  }
}

Invoke-VerifyStep "frontend standalone" {
  Push-Location (Join-Path $root "frontend")
  try {
    Invoke-Native -FilePath npm.cmd -Arguments @("run", "check:standalone")
    Invoke-Native -FilePath npm.cmd -Arguments @("run", "check:routes")
  } finally {
    Pop-Location
  }
}

if ($SkipDocker) {
  Add-Result -Name "docker smoke" -Status "SKIP" -Detail "Skipped by flag"
} else {
  try {
    Invoke-Native -FilePath docker -Arguments @("info")
    Invoke-VerifyStep "docker smoke" {
      Invoke-Native -FilePath powershell -Arguments @("-File", (Join-Path $PSScriptRoot "check-docker.ps1"), "-DownAfter")
    }
  } catch {
    Add-Result -Name "docker smoke" -Status "SKIP" -Detail "Docker unavailable"
  }
}

Write-Host ""
Write-Host "Verification summary"
$results | Format-Table -AutoSize

if ($results | Where-Object { $_.Status -eq "FAIL" }) {
  exit 1
}

exit 0
