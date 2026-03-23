# Read file as raw bytes and interpret as UTF-8
$bytes = [System.IO.File]::ReadAllBytes('index.html')
$content = [System.Text.Encoding]::UTF8.GetString($bytes)

# Remove the stray corrupted line (search by pattern rather than emoji)
$stray = " </div>Precio del ciclo:</span><strong id=""cp-precio"">&#x2014;</strong></div>"
# More robust: find and remove the line that starts with " </div>Precio"
$lines = $content -split "`n"
$filtered = $lines | Where-Object { $_ -notmatch '^ </div>Precio del ciclo' -and $_ -notmatch '^\s{12}</div>\s*$' -or $lines.IndexOf($_) -lt 400 }

# Actually, just remove by line number approach with proper encoding
$allLines = [System.IO.File]::ReadAllLines('index.html', [System.Text.Encoding]::UTF8)
Write-Host "Total lines: $($allLines.Count)"

# Find the stray line
for ($i = 0; $i -lt $allLines.Count; $i++) {
    if ($allLines[$i] -match 'Precio del ciclo.*cp-precio' -and $allLines[$i] -match '^\s+</div>') {
        Write-Host "Found stray at line $($i+1): $($allLines[$i])"
    }
}
