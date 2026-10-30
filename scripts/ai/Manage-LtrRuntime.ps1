param(
    [Parameter(Mandatory=$true)][ValidateSet('Setup','Start','Status','Stop')][string]$Mode,
    [string]$ConfigurationPath,
    [string]$PackagePath,
    [string]$EncoderSnapshot,
    [string]$EncoderRevision='e8f8c211226b894fcb81acc59f3b34ba3efd5f42',
    [int]$Port=5210
)
$ErrorActionPreference='Stop'
$workspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if(!$ConfigurationPath){$ConfigurationPath=Join-Path $workspace 'backend/src/InternshipManagement.API/appsettings.Inference.private.json'}
$configPath=[IO.Path]::GetFullPath($ConfigurationPath)
if(!$configPath.StartsWith($workspace+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($configPath) -ne 'appsettings.Inference.private.json'){
    throw 'Configuration must be a workspace appsettings.Inference.private.json file.'
}
for($item=[IO.DirectoryInfo]::new([IO.Path]::GetDirectoryName($configPath));$null-ne$item;$item=$item.Parent){
    if($item.Exists-and($item.Attributes-band[IO.FileAttributes]::ReparsePoint)){throw 'No junction/symlink configuration parents.'}
}
if((Test-Path -LiteralPath $configPath) -and ((Get-Item -LiteralPath $configPath).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'No symlink configuration file.'}
$tag=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($configPath.ToLowerInvariant()))).Substring(0,12)
$runtimeRoot=Join-Path $workspace "ml-service/output/runtime/$tag"
New-Item -ItemType Directory -Path $runtimeRoot -Force|Out-Null
$lock=[IO.File]::Open((Join-Path $runtimeRoot 'operation.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
try {
    if($Mode-eq'Setup'){
        if(Test-Path -LiteralPath $configPath){
            [pscustomobject]@{status='AlreadyConfigured';configuration=$configPath;message='Existing configuration preserved; no token rotation.'}|ConvertTo-Json
            return
        }
        if($Port-lt1024-or$Port-gt65535){throw 'Port must be 1024..65535.'}
        if($EncoderRevision-notmatch'^[a-f0-9]{40}$'){throw 'Full encoder revision required.'}
        $userRoot=[Environment]::GetFolderPath('UserProfile')
        if(!$PackagePath){$PackagePath=Join-Path $workspace 'ml-service/output/KET_QUA_CHI_MOI_NHAT'}
        if(!$EncoderSnapshot){$EncoderSnapshot=Join-Path $userRoot ".cache/huggingface/hub/models--sentence-transformers--paraphrase-multilingual-MiniLM-L12-v2/snapshots/$EncoderRevision"}
        $python=Join-Path $workspace 'ml-service/.venv/Scripts/python.exe'
        $parity=Join-Path $workspace 'ml-service/reports/inference_layout_20261029/parity.json'
        foreach($path in @($python,$parity,(Join-Path $PackagePath 'RETURN_MANIFEST.json'),(Join-Path $EncoderSnapshot 'model.safetensors'))){
            if(!(Test-Path -LiteralPath $path -PathType Leaf)){throw "Missing runtime input: $path"}
        }
        $config=@{
            Inference=@{Enabled=$true;Endpoint="http://127.0.0.1:$Port/v1/score";Token=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32));TimeoutMilliseconds=5000}
            LtrLocalRuntime=@{Python=$python;Package=[IO.Path]::GetFullPath($PackagePath);Snapshot=[IO.Path]::GetFullPath($EncoderSnapshot);Revision=$EncoderRevision;Parity=$parity}
        }
        $parent=Split-Path $configPath -Parent
        New-Item -ItemType Directory -Path $parent -Force|Out-Null
        $stream=[IO.File]::Open($configPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
        try {$bytes=[Text.Encoding]::UTF8.GetBytes(($config|ConvertTo-Json -Depth 5));$stream.Write($bytes)}finally{$stream.Dispose()}
        $operator=[Security.Principal.WindowsIdentity]::GetCurrent().Name
        &icacls $configPath /inheritance:r /grant:r "${operator}:F" 'NT AUTHORITY\SYSTEM:F' '*S-1-5-32-544:F'|Out-Null
        if($LASTEXITCODE-ne0){Remove-Item -LiteralPath $configPath;throw 'Cannot protect private configuration.'}
        [pscustomobject]@{status='Configured';configuration=$configPath;enabled=$true;backendRestartRequired=$true}|ConvertTo-Json
        return
    }
    if(!(Test-Path -LiteralPath $configPath)){throw 'Run Setup first.'}
    $config=Get-Content -LiteralPath $configPath -Raw|ConvertFrom-Json
    $endpoint=[Uri]$config.Inference.Endpoint
    if($endpoint.Scheme-ne'http'-or$endpoint.Host-ne'127.0.0.1'-or$endpoint.AbsolutePath-ne'/v1/score'-or$endpoint.Query-or$endpoint.UserInfo-or$endpoint.Fragment){throw 'Only loopback /v1/score is supported.'}
    if(!$config.LtrLocalRuntime-or$config.Inference.Token.Length-lt32){throw 'Missing local runtime settings/token.'}
    $entry=Join-Path $workspace 'ml-service/src/inference/serve_inference_v3.py'
    $pointer=Join-Path $runtimeRoot 'current.json'
    $state=$null;$statePath=$null
    if(Test-Path -LiteralPath $pointer){
        $statePath=(Get-Content -LiteralPath $pointer -Raw|ConvertFrom-Json).statePath
        if(![IO.Path]::GetFullPath($statePath).StartsWith($runtimeRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid runtime state path.'}
        $state=Get-Content -LiteralPath $statePath -Raw|ConvertFrom-Json
    }
    function OwnedProcess($record){
        if(!$record){return $null}
        $process=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
        if(!$process){return $null}
        if($process.StartTime.ToUniversalTime().Ticks-ne([DateTimeOffset]$record.startedUtc).UtcDateTime.Ticks){return $null}
        $command=(Get-CimInstance Win32_Process -Filter "ProcessId=$($record.pid)").CommandLine
        $knownEntries=@($entry,(Join-Path $workspace 'ml-service/src/serve_inference_v3.py'),(Join-Path $workspace 'ml-service/serve_inference_v3.py'))
        if(!$command-or!($knownEntries|Where-Object {$command.Contains($_,[StringComparison]::OrdinalIgnoreCase)})){return $null}
        return $process
    }
    $alive=if($state){OwnedProcess $state.listener}else{$null}
    if($Mode-eq'Status'){
        $healthy=$false
        if($alive){try{$health=Invoke-RestMethod "http://127.0.0.1:$($endpoint.Port)/health" -Headers @{Authorization="Bearer $($config.Inference.Token)"} -TimeoutSec 3;$healthy=$health.status-eq'ready'}catch{}}
        $foreign=(!$alive)-and[bool](Get-NetTCPConnection -LocalPort $endpoint.Port -State Listen -ErrorAction SilentlyContinue)
        [pscustomobject]@{status=$(if($healthy){'Ready'}elseif($alive){'RunningNotReady'}elseif($foreign){'PortInUseUnmanaged'}else{'Stopped'});pid=$(if($alive){$alive.Id}else{$null});port=$endpoint.Port;backendConfigured=[bool]$config.Inference.Enabled;backendStatus='NotInspected'}|ConvertTo-Json
        return
    }
    if($Mode-eq'Stop'){
        foreach($record in @($state.listener,$state.launcher)){
            $owned=OwnedProcess $record
            if($owned){Stop-Process -Id $owned.Id;if(!$owned.WaitForExit(5000)){throw 'Managed scorer did not stop; no stopped state was recorded.'}}
        }
        if($state){$state|Add-Member -NotePropertyName verifiedStoppedUtc -NotePropertyValue ([DateTime]::UtcNow.ToString('O')) -Force;$state|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $statePath -Encoding utf8}
        [pscustomobject]@{status='Stopped';configurationPreserved=$true;historyPreserved=$true}|ConvertTo-Json
        return
    }
    if($alive){throw 'Managed scorer already running; use Status. No process was restarted.'}
    if(!$config.Inference.Enabled){throw 'Backend Inference is disabled in the private configuration.'}
    if(Get-NetTCPConnection -LocalPort $endpoint.Port -State Listen -ErrorAction SilentlyContinue){throw 'Port in use by another process; nothing was stopped.'}
    $run=Join-Path $runtimeRoot ([DateTime]::UtcNow.ToString('yyyyMMdd_HHmmss')+'_'+[Guid]::NewGuid().ToString('N').Substring(0,8))
    New-Item -ItemType Directory -Path $run|Out-Null
    $arguments=@($entry,'--package',$config.LtrLocalRuntime.Package,'--encoder-snapshot',$config.LtrLocalRuntime.Snapshot,'--encoder-revision',$config.LtrLocalRuntime.Revision,'--parity-report',$config.LtrLocalRuntime.Parity,'--port',"$($endpoint.Port)")
    foreach($argument in $arguments){if($argument.Contains('"')){throw 'Quote in runtime argument is not supported.'}}
    $priorPythonPath=$env:PYTHONPATH
    $priorToken=$env:IM_INFERENCE_TOKEN
    try {
        $env:PYTHONPATH=(Join-Path $workspace 'ml-service/src')+[IO.Path]::PathSeparator+(Join-Path $workspace 'ml-service/src/common')
        $env:IM_INFERENCE_TOKEN=$config.Inference.Token
        $launcher=Start-Process $config.LtrLocalRuntime.Python -WindowStyle Hidden -PassThru -ArgumentList ($arguments|ForEach-Object {'"'+$_.TrimEnd('\')+'"'}) -RedirectStandardOutput (Join-Path $run 'stdout.log') -RedirectStandardError (Join-Path $run 'stderr.log')
    } finally {$env:IM_INFERENCE_TOKEN=$priorToken;$env:PYTHONPATH=$priorPythonPath}
    $launcherRecord=@{pid=$launcher.Id;startedUtc=$launcher.StartTime.ToUniversalTime().ToString('O')}
    $ready=$false
    try {
        for($attempt=0;$attempt-lt240;$attempt++){
            if($launcher.HasExited){throw "Scorer exited. Inspect $run/stderr.log"}
            try {$health=Invoke-RestMethod "http://127.0.0.1:$($endpoint.Port)/health" -Headers @{Authorization="Bearer $($config.Inference.Token)"} -TimeoutSec 2;if($health.status-eq'ready'){$ready=$true;break}}catch{}
            Start-Sleep -Milliseconds 500
        }
        if(!$ready){throw 'Scorer startup timeout.'}
        $listenerPid=(Get-NetTCPConnection -LocalPort $endpoint.Port -State Listen).OwningProcess|Select-Object -Unique
        $listener=Get-Process -Id $listenerPid
        $listenerRecord=@{pid=$listener.Id;startedUtc=$listener.StartTime.ToUniversalTime().ToString('O')}
        if(!(OwnedProcess $listenerRecord)){throw 'Listener identity mismatch.'}
        $statePath=Join-Path $run 'state.json'
        @{launcher=$launcherRecord;listener=$listenerRecord;modelHash=$health.model_sha256;port=$endpoint.Port;configuration=$configPath}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $statePath -Encoding utf8
        @{statePath=$statePath}|ConvertTo-Json|Set-Content -LiteralPath $pointer -Encoding utf8
        [pscustomobject]@{status='Ready';pid=$listener.Id;port=$endpoint.Port;modelHash=$health.model_sha256;runFolder=$run;backendStatus='NotInspected'}|ConvertTo-Json
    } catch {
        $owned=OwnedProcess $launcherRecord
        if($owned){Stop-Process -Id $owned.Id}
        throw
    }
} finally {$lock.Dispose()}
