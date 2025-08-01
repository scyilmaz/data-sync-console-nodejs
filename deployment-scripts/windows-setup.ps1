# Windows PowerShell Deployment Script
# deployment-scripts/windows-setup.ps1

param(
    [string]$ProjectPath = "C:\DataSyncConsole"
)

Write-Host "Data Sync Console Windows Deployment Starting..." -ForegroundColor Green

# Functions
function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator!"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js installation
try {
    $nodeVersion = node --version
    Write-Success "Node.js is already installed: $nodeVersion"
} catch {
    Write-Warning "Node.js not found. Please download and install from https://nodejs.org"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Git installation
try {
    $gitVersion = git --version
    Write-Success "Git is already installed: $gitVersion"
} catch {
    Write-Warning "Git not found. Please download and install from https://git-scm.com"
    Read-Host "Press Enter to exit"
    exit 1
}

# Project directory setup
if (Test-Path $ProjectPath) {
    Write-Warning "Project directory exists. Updating..."
    Set-Location $ProjectPath
    git pull origin main
} else {
    Write-Warning "Cloning project..."
    git clone https://github.com/scyilmaz/data-sync-console-nodejs.git $ProjectPath
    Set-Location $ProjectPath
}

# Install dependencies
Write-Warning "Installing NPM packages..."
npm install --production
Write-Success "NPM packages installed"

# Environment file setup
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Warning ".env file created. Please edit: $ProjectPath\.env"
} else {
    Write-Success ".env file exists"
}

# Create log directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}
Write-Success "Log directory created"

# Create Task Scheduler jobs
Write-Warning "Creating Windows Task Scheduler jobs..."

$NodePath = (Get-Command node).Source
$ScriptPath = Join-Path $ProjectPath "src\app.js"

# Task 1: Main sync (without STOKLAR) - Every 5 minutes
$TaskName1 = "DataSyncConsole-Main"

# Remove existing task if exists
if (Get-ScheduledTask -TaskName $TaskName1 -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName1 -Confirm:$false
}

# Create main sync task (every 5 minutes, without STOKLAR)
$Action1 = New-ScheduledTaskAction -Execute $NodePath -Argument "$ScriptPath sync-without-stoklar" -WorkingDirectory $ProjectPath
$Trigger1 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)
$Settings1 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
$Principal1 = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName1 -Action $Action1 -Trigger $Trigger1 -Settings $Settings1 -Principal $Principal1 -Description "Data synchronization every 5 minutes (STOKLAR hariç)"

Write-Success "Main sync task created (every 5 minutes)"

# Task 2: STOKLAR sync - Every 5 hours
$TaskName2 = "DataSyncConsole-Stoklar"

# Remove existing task if exists
if (Get-ScheduledTask -TaskName $TaskName2 -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName2 -Confirm:$false
}

# Create STOKLAR sync task (every 5 hours)
$Action2 = New-ScheduledTaskAction -Execute $NodePath -Argument "$ScriptPath sync-stoklar" -WorkingDirectory $ProjectPath
$Trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 5) -RepetitionDuration (New-TimeSpan -Days 365)
$Settings2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
$Principal2 = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName2 -Action $Action2 -Trigger $Trigger2 -Settings $Settings2 -Principal $Principal2 -Description "STOKLAR synchronization every 5 hours"

Write-Success "STOKLAR sync task created (every 5 hours)"

# Check task status
$Task1 = Get-ScheduledTask -TaskName $TaskName1
$Task2 = Get-ScheduledTask -TaskName $TaskName2
Write-Success "Main sync task status: $($Task1.State)"
Write-Success "STOKLAR sync task status: $($Task2.State)"

Write-Host ""
Write-Success "Installation completed successfully!"
Write-Host ""
Write-Host "Scheduled Tasks Created:" -ForegroundColor Cyan
Write-Host "1. $TaskName1 - Every 5 minutes (STOKLAR hariç)"
Write-Host "2. $TaskName2 - Every 5 hours (Sadece STOKLAR)"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit environment file: notepad $ProjectPath\.env"
Write-Host "2. Test connections: cd $ProjectPath; npm start test"
Write-Host "3. Test main sync: cd $ProjectPath; npm start sync-without-stoklar"
Write-Host "4. Test STOKLAR sync: cd $ProjectPath; npm start sync-stoklar"
Write-Host "5. Check tasks in Task Scheduler: taskschd.msc"
Write-Host "6. Monitor logs: Get-Content $ProjectPath\logs\data-sync-console.log -Wait"
Write-Host ""
Write-Host "Management commands:" -ForegroundColor Cyan
Write-Host "Main Sync Task ($TaskName1):"
Write-Host "- Status: Get-ScheduledTask -TaskName '$TaskName1'"
Write-Host "- Stop: Disable-ScheduledTask -TaskName '$TaskName1'"
Write-Host "- Start: Enable-ScheduledTask -TaskName '$TaskName1'"
Write-Host "- Run now: Start-ScheduledTask -TaskName '$TaskName1'"
Write-Host ""
Write-Host "STOKLAR Sync Task ($TaskName2):"
Write-Host "- Status: Get-ScheduledTask -TaskName '$TaskName2'"
Write-Host "- Stop: Disable-ScheduledTask -TaskName '$TaskName2'"
Write-Host "- Start: Enable-ScheduledTask -TaskName '$TaskName2'"
Write-Host "- Run now: Start-ScheduledTask -TaskName '$TaskName2'"
Write-Host ""
Write-Warning "Tasks are now scheduled as follows:"
Write-Host "- Main sync: Every 5 minutes (fast tables)" -ForegroundColor Green
Write-Host "- STOKLAR sync: Every 5 hours (large table)" -ForegroundColor Green

Read-Host "Press Enter to exit"
