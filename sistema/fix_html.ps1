# The file was double-encoded: original UTF-8 was read as Windows-1252, then saved as UTF-8
# To fix: read as UTF-8 (current state), convert each char back to its Windows-1252 byte value,
# then treat those bytes as the original UTF-8.

$latin1 = [System.Text.Encoding]::GetEncoding(1252)  # Windows-1252
$utf8    = [System.Text.Encoding]::UTF8

# Read current (corrupted) file as UTF-8 text
$currentText = [System.IO.File]::ReadAllText('index.html', $utf8)

# Convert the text: treat each char as a Latin-1 byte to get original bytes
$latin1Bytes = $latin1.GetBytes($currentText)

# Decode those bytes as UTF-8 to get the original text
$originalText = $utf8.GetString($latin1Bytes)

# Write back as UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText('index.html', $originalText, $utf8NoBom)

Write-Host "Done. Checking a sample line..."
$fixed = [System.IO.File]::ReadAllLines('index.html', $utf8)
for ($i = 525; $i -lt 555; $i++) {
    if ($fixed[$i] -match 'kpi-icon|kpi-label|Órdenes|rdenes') {
        Write-Host "$($i+1): $($fixed[$i])"
    }
}
