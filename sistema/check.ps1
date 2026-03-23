$enc = [System.Text.Encoding]::UTF8
$allLines = [System.IO.File]::ReadAllLines('index.html', $enc)
Write-Host "Total lines: $($allLines.Count)"

# Check for any remaining garbled multi-byte emoji patterns (3-byte sequences showing as Latin-1)
$garbledCount = 0
for ($i = 0; $i -lt $allLines.Count; $i++) {
    $line = $allLines[$i]
    # Check for common garbling patterns: Ã (C3 xx in Latin-1), Ã (C3 in Latin-1 of UTF-8 continuation)
    if ($line -match 'Ã[€-ÿ]|Å[€-ÿ]|â[€-ÿ][€-ÿ]|ð[€-ÿ][€-ÿ][€-ÿ]') {
        Write-Host "GARBLED line $($i+1): $($line.Trim())"
        $garbledCount++
    }
}
Write-Host "Garbled lines found: $garbledCount"
