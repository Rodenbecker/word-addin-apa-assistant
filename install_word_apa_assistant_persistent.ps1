param(
    [string]$TaskName = "ETDP-Word-APA-Assistant-Server"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js 18+ first."
}

if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
    throw "npx was not found. Install Node.js 18+ first."
}

if (-not (Test-Path ".\manifest.xml")) {
    throw "manifest.xml was not found in $PSScriptRoot."
}

if (-not (Test-Path ".\node_modules")) {
    Write-Host "Installing npm packages..."
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed."
    }
}

Write-Host "Ensuring localhost development certificate is trusted..."
& npm.cmd run certs
if ($LASTEXITCODE -ne 0) {
    throw "Certificate trust setup failed."
}

Write-Host "Validating manifest..."
& npm.cmd run validate
if ($LASTEXITCODE -ne 0) {
    throw "Manifest validation failed."
}

Write-Host "Registering add-in for local development..."
& npx.cmd office-addin-dev-settings register ".\manifest.xml"
if ($LASTEXITCODE -ne 0) {
    throw "Add-in registration failed."
}

$startScript = Join-Path $PSScriptRoot "start_word_apa_assistant.ps1"
$taskAction = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScript`" -ServerOnly -SkipCerts"
$runValueName = "ETDP-Word-APA-Assistant-Server"
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$startupMethod = $null

Write-Host "Creating/updating startup task '$TaskName'..."
$taskCreated = $false
try {
    & schtasks.exe /Create /TN $TaskName /SC ONLOGON /F /TR $taskAction 2>$null 1>$null
    if ($LASTEXITCODE -eq 0) {
        $taskCreated = $true
    }
} catch {
    $taskCreated = $false
}

if ($taskCreated) {
    $startupMethod = "ScheduledTask"
    Write-Host "Startup persistence via Scheduled Task."
} else {
    Write-Host "Scheduled Task creation failed (likely permission-restricted). Falling back to HKCU Run key..."
    New-Item -Path $runKey -Force | Out-Null
    New-ItemProperty -Path $runKey -Name $runValueName -Value $taskAction -PropertyType String -Force | Out-Null
    $startupMethod = "RunKey"
    Write-Host "Startup persistence via HKCU Run key."
}

$stopScript = Join-Path $PSScriptRoot "stop_word_apa_assistant.ps1"
if (Test-Path $stopScript) {
    try {
        & $stopScript | Out-Null
    } catch {
        Write-Host "Server stop step skipped: $($_.Exception.Message)"
    }
}

Write-Host "Starting local HTTPS server..."
Start-Process -FilePath "powershell.exe" `
    -ArgumentList @(
        "-NoProfile",
        "-WindowStyle", "Hidden",
        "-ExecutionPolicy", "Bypass",
        "-File", $startScript,
        "-ServerOnly",
        "-SkipCerts"
    ) `
    -WorkingDirectory $PSScriptRoot `
    -WindowStyle Hidden | Out-Null

Write-Host ""
Write-Host "Persistent install complete."
if ($startupMethod -eq "ScheduledTask") {
    Write-Host "Task: $TaskName"
} else {
    Write-Host "Run key: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\$runValueName"
}
Write-Host "Manifest registered: $PSScriptRoot\manifest.xml"
Write-Host "Taskpane URL: https://localhost:3000/taskpane.html"
