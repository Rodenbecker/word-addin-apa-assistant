param(
    [string]$TaskName = "ETDP-Word-APA-Assistant-Server",
    [switch]$KeepRegistration
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$stopScript = Join-Path $PSScriptRoot "stop_word_apa_assistant.ps1"
if (Test-Path $stopScript) {
    try {
        & $stopScript | Out-Null
    } catch {
        Write-Host "Server stop step skipped: $($_.Exception.Message)"
    }
}

if (-not $KeepRegistration) {
    if (Get-Command npx.cmd -ErrorAction SilentlyContinue) {
        if (Test-Path ".\manifest.xml") {
            Write-Host "Unregistering add-in..."
            & npx.cmd office-addin-dev-settings unregister ".\manifest.xml"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Add-in unregister reported an error. Continuing..."
            }
        }
    } else {
        Write-Host "npx not found. Skipping add-in unregister."
    }
}

$runValueName = "ETDP-Word-APA-Assistant-Server"
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"

& schtasks.exe /Query /TN $TaskName *> $null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Removing startup task '$TaskName'..."
    & schtasks.exe /Delete /TN $TaskName /F | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to remove startup task '$TaskName'."
    }
} else {
    Write-Host "Startup task '$TaskName' was not found."
}

if (Test-Path $runKey) {
    $runValue = Get-ItemProperty -Path $runKey -Name $runValueName -ErrorAction SilentlyContinue
    if ($null -ne $runValue) {
        Write-Host "Removing HKCU Run key '$runValueName'..."
        Remove-ItemProperty -Path $runKey -Name $runValueName -ErrorAction Stop
    }
}

Write-Host ""
Write-Host "Persistent install removed."
