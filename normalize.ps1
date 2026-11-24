$p = 'src/index.css'
$t = [System.IO.File]::ReadAllText((Resolve-Path $p))
$t = $t -replace "`r`n", "`n" -replace "`r", "`n"
[System.IO.File]::WriteAllText((Resolve-Path $p), $t)
'ok'
