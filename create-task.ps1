$nodePath = "C:\Program Files\nodejs\node.exe"
$configPath = "C:\apps\cloudflareDNSRenew\config.local.json"
$scriptPath = "C:\apps\cloudflareDNSRenew\dist\index.js"

$action = New-ScheduledTaskAction -Execute $nodePath
$action.Arguments = "`"$scriptPath`" --config `"$configPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest

Register-ScheduledTask -TaskName "Cloudflare DNS Renewal" -Action $action -Trigger $trigger -Principal $principal -Force
Write-Host "Task created successfully!"
