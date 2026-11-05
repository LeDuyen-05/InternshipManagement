# ==============================================================================
# Script dong goi he thong Web Quan Ly Thuc Tap Tot Nghiep (React + .NET 8 API)
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "`n=== BUOC 1: Build Frontend (React + Vite) ===" -ForegroundColor Cyan
npm run build --prefix frontend

Write-Host "`n=== BUOC 2: Copy file tinh vao wwwroot cua Backend ===" -ForegroundColor Cyan
$wwwroot = "backend\src\InternshipManagement.API\wwwroot"
if (Test-Path $wwwroot) {
    Remove-Item -Path "$wwwroot\*" -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $wwwroot -Force | Out-Null
}
Copy-Item -Path "frontend\dist\*" -Destination $wwwroot -Recurse -Force

Write-Host "`n=== BUOC 3: Publish Backend .NET 8 (Release) ===" -ForegroundColor Cyan
$publishDir = "publish"
if (Test-Path $publishDir) {
    Remove-Item -Path "$publishDir\*" -Recurse -Force
}
dotnet publish backend\src\InternshipManagement.API\InternshipManagement.API.csproj -c Release -o $publishDir

Write-Host "`n=== BUOC 4: Cau hinh web.config moi truong Production ===" -ForegroundColor Cyan
$webConfigContent = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath="dotnet" arguments=".\InternshipManagement.API.dll" stdoutLogEnabled="false" stdoutLogFile=".\logs\stdout" hostingModel="OutOfProcess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
        </environmentVariables>
      </aspNetCore>
      <security>
        <authentication>
          <anonymousAuthentication enabled="true" />
          <basicAuthentication enabled="false" />
          <windowsAuthentication enabled="false" />
        </authentication>
      </security>
    </system.webServer>
  </location>
</configuration>
'@
[System.IO.File]::WriteAllText("$publishDir\web.config", $webConfigContent, [System.Text.Encoding]::UTF8)

Write-Host "`n=== BUOC 5: Nen thanh file publish.zip de upload ===" -ForegroundColor Cyan
$zipFile = "publish.zip"
if (Test-Path $zipFile) {
    Remove-Item -Path $zipFile -Force
}
Compress-Archive -Path "$publishDir\*" -DestinationPath $zipFile -Force

$zipSize = (Get-Item $zipFile).Length / 1MB
Write-Host "`n>>> HOAN TAT! File '$zipFile' ($([Math]::Round($zipSize, 2)) MB) da san sang de upload len hosting SmarterASP." -ForegroundColor Green
