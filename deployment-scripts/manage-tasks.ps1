# Task Management Script for Data Sync Console
# deployment-scripts/manage-tasks.ps1

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("status", "start", "stop", "restart", "run-main", "run-stoklar", "logs", "help")]
    [string]$Action = "help",
    
    [string]$ProjectPath = "C:\DataSyncConsole"
)

$TaskMain = "DataSyncConsole-Main"
$TaskStoklar = "DataSyncConsole-Stoklar"

function Write-Header {
    param([string]$Title)
    Write-Host "`n==================== $Title ====================" -ForegroundColor Cyan
}

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

function Show-TaskStatus {
    Write-Header "Task Status"
    
    try {
        $mainTask = Get-ScheduledTask -TaskName $TaskMain -ErrorAction Stop
        $stoklarTask = Get-ScheduledTask -TaskName $TaskStoklar -ErrorAction Stop
        
        $mainInfo = Get-ScheduledTaskInfo -TaskName $TaskMain
        $stoklarInfo = Get-ScheduledTaskInfo -TaskName $TaskStoklar
        
        Write-Host "📊 Main Sync Task ($TaskMain):" -ForegroundColor Yellow
        Write-Host "   Status: $($mainTask.State)" -ForegroundColor $(if($mainTask.State -eq "Ready") {"Green"} else {"Red"})
        Write-Host "   Last Run: $($mainInfo.LastRunTime)"
        Write-Host "   Next Run: $($mainInfo.NextRunTime)"
        Write-Host "   Schedule: Every 5 minutes (STOKLAR hariç)"
        
        Write-Host "`n📦 STOKLAR Sync Task ($TaskStoklar):" -ForegroundColor Yellow
        Write-Host "   Status: $($stoklarTask.State)" -ForegroundColor $(if($stoklarTask.State -eq "Ready") {"Green"} else {"Red"})
        Write-Host "   Last Run: $($stoklarInfo.LastRunTime)"
        Write-Host "   Next Run: $($stoklarInfo.NextRunTime)"
        Write-Host "   Schedule: Every 5 hours (Sadece STOKLAR)"
        
    } catch {
        Write-Error "Tasks not found! Run windows-setup.ps1 first."
    }
}

function Start-Tasks {
    Write-Header "Starting Tasks"
    
    try {
        Enable-ScheduledTask -TaskName $TaskMain
        Enable-ScheduledTask -TaskName $TaskStoklar
        Write-Success "Both tasks enabled successfully"
    } catch {
        Write-Error "Failed to start tasks: $($_.Exception.Message)"
    }
}

function Stop-Tasks {
    Write-Header "Stopping Tasks"
    
    try {
        Disable-ScheduledTask -TaskName $TaskMain
        Disable-ScheduledTask -TaskName $TaskStoklar
        Write-Success "Both tasks disabled successfully"
    } catch {
        Write-Error "Failed to stop tasks: $($_.Exception.Message)"
    }
}

function Restart-Tasks {
    Write-Header "Restarting Tasks"
    Stop-Tasks
    Start-Sleep -Seconds 2
    Start-Tasks
}

function Run-MainTask {
    Write-Header "Running Main Sync Task Now"
    
    try {
        Start-ScheduledTask -TaskName $TaskMain
        Write-Success "Main sync task started manually"
        Write-Warning "Check logs for progress: Get-Content $ProjectPath\logs\data-sync-console.log -Tail 20"
    } catch {
        Write-Error "Failed to run main task: $($_.Exception.Message)"
    }
}

function Run-StoklarTask {
    Write-Header "Running STOKLAR Sync Task Now"
    
    try {
        Start-ScheduledTask -TaskName $TaskStoklar
        Write-Success "STOKLAR sync task started manually"
        Write-Warning "Check logs for progress: Get-Content $ProjectPath\logs\data-sync-console.log -Tail 20"
    } catch {
        Write-Error "Failed to run STOKLAR task: $($_.Exception.Message)"
    }
}

function Show-Logs {
    Write-Header "Recent Logs"
    
    $logFile = Join-Path $ProjectPath "logs\data-sync-console.log"
    
    if (Test-Path $logFile) {
        Write-Host "📋 Last 20 log entries:" -ForegroundColor Yellow
        Get-Content $logFile -Tail 20 | ForEach-Object {
            if ($_ -like "*error*" -or $_ -like "*failed*") {
                Write-Host $_ -ForegroundColor Red
            } elseif ($_ -like "*success*" -or $_ -like "*completed*") {
                Write-Host $_ -ForegroundColor Green
            } else {
                Write-Host $_
            }
        }
        
        Write-Host "`n💡 To monitor live logs:" -ForegroundColor Cyan
        Write-Host "Get-Content `"$logFile`" -Wait"
    } else {
        Write-Error "Log file not found: $logFile"
    }
}

function Show-Help {
    Write-Header "Data Sync Console Task Manager"
    
    Write-Host "Usage: .\manage-tasks.ps1 -Action <action> [-ProjectPath <path>]`n"
    
    Write-Host "Actions:" -ForegroundColor Yellow
    Write-Host "  status      - Show task status and schedule info"
    Write-Host "  start       - Enable both tasks"
    Write-Host "  stop        - Disable both tasks"
    Write-Host "  restart     - Restart both tasks"
    Write-Host "  run-main    - Run main sync task now"
    Write-Host "  run-stoklar - Run STOKLAR sync task now"
    Write-Host "  logs        - Show recent log entries"
    Write-Host "  help        - Show this help message"
    
    Write-Host "`nExamples:" -ForegroundColor Cyan
    Write-Host "  .\manage-tasks.ps1 -Action status"
    Write-Host "  .\manage-tasks.ps1 -Action run-main"
    Write-Host "  .\manage-tasks.ps1 -Action logs"
    
    Write-Host "`nManual Commands:" -ForegroundColor Cyan
    Write-Host "  Test connection: cd $ProjectPath; npm start test"
    Write-Host "  Manual main sync: cd $ProjectPath; npm start sync-without-stoklar"
    Write-Host "  Manual STOKLAR sync: cd $ProjectPath; npm start sync-stoklar"
    Write-Host "  Full sync: cd $ProjectPath; npm start sync"
}

# Main execution
switch ($Action) {
    "status"      { Show-TaskStatus }
    "start"       { Start-Tasks }
    "stop"        { Stop-Tasks }
    "restart"     { Restart-Tasks }
    "run-main"    { Run-MainTask }
    "run-stoklar" { Run-StoklarTask }
    "logs"        { Show-Logs }
    "help"        { Show-Help }
    default       { Show-Help }
}

Write-Host ""
