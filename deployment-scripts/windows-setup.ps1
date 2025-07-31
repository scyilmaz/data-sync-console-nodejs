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

# Create Task Scheduler job
Write-Warning "Creating Windows Task Scheduler job..."

$TaskName = "DataSyncConsole"
$NodePath = (Get-Command node).Source
$ScriptPath = Join-Path $ProjectPath "src\app.js"

# Remove existing task if exists
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create new task
$Action = New-ScheduledTaskAction -Execute $NodePath -Argument $ScriptPath -WorkingDirectory $ProjectPath
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Data synchronization every 5 minutes"

Write-Success "Windows Task Scheduler job created"

# Check task status
$Task = Get-ScheduledTask -TaskName $TaskName
Write-Success "Task status: $($Task.State)"

Write-Host ""
Write-Success "Installation completed successfully!"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit environment file: notepad $ProjectPath\.env"
Write-Host "2. Test connections: cd $ProjectPath; npm start test"
Write-Host "3. Check task in Task Scheduler: taskschd.msc"
Write-Host "4. Monitor logs: Get-Content $ProjectPath\logs\data-sync-console.log -Wait"
Write-Host ""
Write-Host "Management commands:" -ForegroundColor Cyan
Write-Host "- Task status: Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "- Stop task: Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "- Start task: Enable-ScheduledTask -TaskName '$TaskName'"
Write-Host "- Run task now: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Warning "Task is now scheduled to run every 5 minutes."

Read-Host "Press Enter to exit"
