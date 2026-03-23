$src = "c:\projects\automations\lavanderia\landing-page\sistema\script.js"
$dst = "c:\projects\automations\lavanderia\landing-page\sistema\script.js"
$lines = Get-Content $src
$clean = $lines | Select-Object -First 1069
$clean | Set-Content $dst -Encoding UTF8
Write-Host "Done. Lines: $($clean.Count)"
