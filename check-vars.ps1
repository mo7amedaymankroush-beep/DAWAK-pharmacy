$root = Join-Path $PSScriptRoot 'src'
$files = Get-ChildItem $root -Recurse -Include *.css
$pattern = 'var\(--(coral|coral-strong|acid-mint|on-acid|accent-mint|accent-mint-hover|accent-mint-soft|accent-mint-border|on-accent)\)'
$bad = @()
foreach ($file in $files) {
  $lines = [System.IO.File]::ReadAllText($file.FullName) -split "`r?`n"
  $inDark = $false; $depth = 0; $fileDepth = 0
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i]
    $opens = ([regex]::Matches($l, '\{')).Count
    $closes = ([regex]::Matches($l, '\}')).Count
    if ($l -match '\[data-theme="dark"\]' -and $fileDepth -eq 0) { $inDark = $true; $depth = 0 }
    if ($l -match $pattern -and -not $inDark) { $bad += "$($file.Name):$($i+1): $($l.Trim())" }
    if ($inDark) { $depth += $opens - $closes; if ($depth -le 0 -and $closes -gt 0) { $inDark = $false } }
    $fileDepth += $opens - $closes; if ($fileDepth -lt 0) { $fileDepth = 0 }
  }
}
if ($bad.Count -eq 0) { 'OK: كل مراجع المتغيرات الليلية داخل [data-theme="dark"]' } else { $bad }
