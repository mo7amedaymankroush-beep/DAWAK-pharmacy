$p = 'src/index.css'
$t = Get-Content $p -Raw
$start = $t.IndexOf('/* View Transitions')
$end = $t.IndexOf('/* منع أي transition')
$block = $t.Substring($start, $end - $start)
$lines = $block -split "`r?`n"
$out = foreach ($l in $lines) {
  if ($l -match '^  ') { $l -replace '^  ', '' } else { $l }
}
$new = ($out -join "`r`n")
$t = $t.Substring(0, $start) + $new + $t.Substring($end)
Set-Content -Path $p -Value $t -NoNewline
'ok'
