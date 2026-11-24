param([switch]$Apply)

$root = Join-Path $PSScriptRoot 'src'
$files = Get-ChildItem $root -Recurse -Include *.css

# خريطة الألوان القديمة (Mint / Forest) إلى لوحة الوضع الليلي الجديدة (Navy / Coral)
$map = [ordered]@{
  'rgba(183, 255, 114, 0.55)' = 'rgba(255, 90, 78, 0.55)'
  'rgba(183, 255, 114, 0.5)'  = 'rgba(255, 90, 78, 0.5)'
  'rgba(183, 255, 114, 0.45)' = 'rgba(255, 90, 78, 0.45)'
  'rgba(183, 255, 114, 0.42)' = 'rgba(255, 90, 78, 0.42)'
  'rgba(183, 255, 114, 0.4)'  = 'rgba(255, 90, 78, 0.4)'
  'rgba(183, 255, 114, 0.35)' = 'rgba(255, 90, 78, 0.34)'
  'rgba(183, 255, 114, 0.3)'  = 'rgba(255, 90, 78, 0.3)'
  'rgba(183, 255, 114, 0.28)' = 'rgba(255, 90, 78, 0.3)'
  'rgba(183, 255, 114, 0.25)' = 'rgba(255, 90, 78, 0.25)'
  'rgba(183, 255, 114, 0.22)' = 'rgba(255, 90, 78, 0.24)'
  'rgba(183, 255, 114, 0.2)'  = 'rgba(255, 90, 78, 0.2)'
  'rgba(183, 255, 114, 0.18)' = 'rgba(255, 90, 78, 0.18)'
  'rgba(183, 255, 114, 0.16)' = 'rgba(255, 90, 78, 0.16)'
  'rgba(183, 255, 114, 0.15)' = 'rgba(255, 90, 78, 0.15)'
  'rgba(183, 255, 114, 0.14)' = 'rgba(255, 90, 78, 0.14)'
  'rgba(183, 255, 114, 0.12)' = 'rgba(255, 90, 78, 0.12)'
  'rgba(183, 255, 114, 0.1)'  = 'rgba(255, 90, 78, 0.12)'
  'rgba(183, 255, 114, 0.08)' = 'rgba(255, 90, 78, 0.1)'
  'rgba(183, 255, 114, 0.06)' = 'rgba(255, 90, 78, 0.08)'
  'rgba(183, 255, 114, .55)'  = 'rgba(255, 90, 78, 0.55)'
  'rgba(183, 255, 114, .5)'   = 'rgba(255, 90, 78, 0.5)'
  'rgba(183, 255, 114, .45)'  = 'rgba(255, 90, 78, 0.45)'
  'rgba(183, 255, 114, .4)'   = 'rgba(255, 90, 78, 0.4)'
  'rgba(183, 255, 114, .35)'  = 'rgba(255, 90, 78, 0.34)'
  'rgba(183, 255, 114, .3)'   = 'rgba(255, 90, 78, 0.3)'
  'rgba(183, 255, 114, .25)'  = 'rgba(255, 90, 78, 0.25)'
  'rgba(183, 255, 114, .22)'  = 'rgba(255, 90, 78, 0.24)'
  'rgba(183, 255, 114, .2)'   = 'rgba(255, 90, 78, 0.2)'
  'rgba(183, 255, 114, .18)'  = 'rgba(255, 90, 78, 0.18)'
  'rgba(183, 255, 114, .16)'  = 'rgba(255, 90, 78, 0.16)'
  'rgba(183, 255, 114, .15)'  = 'rgba(255, 90, 78, 0.15)'
  'rgba(183, 255, 114, .14)'  = 'rgba(255, 90, 78, 0.14)'
  'rgba(183, 255, 114, .12)'  = 'rgba(255, 90, 78, 0.12)'
  'rgba(183, 255, 114, .1)'   = 'rgba(255, 90, 78, 0.12)'
  'rgba(183, 255, 114, .08)'  = 'rgba(255, 90, 78, 0.1)'
  'rgba(183, 255, 114, .06)'  = 'rgba(255, 90, 78, 0.08)'
  'rgba(163, 184, 172, 0.92)' = 'rgba(244, 241, 234, 0.92)'
  'rgba(163, 184, 172, 0.9)'  = 'rgba(244, 241, 234, 0.9)'
  'rgba(163, 184, 172, 0.85)' = 'rgba(244, 241, 234, 0.85)'
  'rgba(163, 184, 172, 0.82)' = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, 0.8)'  = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, 0.78)' = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, 0.75)' = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, 0.7)'  = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, 0.68)' = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, 0.65)' = 'rgba(244, 241, 234, 0.65)'
  'rgba(163, 184, 172, 0.62)' = 'rgba(244, 241, 234, 0.62)'
  'rgba(163, 184, 172, 0.6)'  = 'rgba(244, 241, 234, 0.6)'
  'rgba(163, 184, 172, 0.55)' = 'rgba(244, 241, 234, 0.55)'
  'rgba(163, 184, 172, 0.5)'  = 'rgba(244, 241, 234, 0.5)'
  'rgba(163, 184, 172, 0.28)' = 'rgba(244, 241, 234, 0.28)'
  'rgba(163, 184, 172, 0.2)'  = 'rgba(244, 241, 234, 0.2)'
  'rgba(163, 184, 172, 0.18)' = 'rgba(244, 241, 234, 0.18)'
  'rgba(163, 184, 172, 0.16)' = 'rgba(244, 241, 234, 0.12)'
  'rgba(163, 184, 172, 0.14)' = 'rgba(244, 241, 234, 0.12)'
  'rgba(163, 184, 172, 0.12)' = 'rgba(244, 241, 234, 0.12)'
  'rgba(163, 184, 172, 0.1)'  = 'rgba(244, 241, 234, 0.1)'
  'rgba(163, 184, 172, 0.08)' = 'rgba(244, 241, 234, 0.08)'
  'rgba(163, 184, 172, 0.06)' = 'rgba(244, 241, 234, 0.06)'
  'rgba(163, 184, 172, .92)'  = 'rgba(244, 241, 234, 0.92)'
  'rgba(163, 184, 172, .9)'   = 'rgba(244, 241, 234, 0.9)'
  'rgba(163, 184, 172, .85)'  = 'rgba(244, 241, 234, 0.85)'
  'rgba(163, 184, 172, .82)'  = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, .8)'   = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, .78)'  = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, .75)'  = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, .7)'   = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, .68)'  = 'rgba(244, 241, 234, 0.72)'
  'rgba(163, 184, 172, .65)'  = 'rgba(244, 241, 234, 0.65)'
  'rgba(163, 184, 172, .62)'  = 'rgba(244, 241, 234, 0.62)'
  'rgba(163, 184, 172, .6)'   = 'rgba(244, 241, 234, 0.6)'
  'rgba(163, 184, 172, .5)'   = 'rgba(244, 241, 234, 0.5)'
  'rgba(163, 184, 172, .28)'  = 'rgba(244, 241, 234, 0.28)'
  'rgba(163, 184, 172, .2)'   = 'rgba(244, 241, 234, 0.2)'
  'rgba(163, 184, 172, .18)'  = 'rgba(244, 241, 234, 0.18)'
  'rgba(163, 184, 172, .16)'  = 'rgba(244, 241, 234, 0.12)'
  'rgba(163, 184, 172, .14)'  = 'rgba(244, 241, 234, 0.12)'
  'rgba(163, 184, 172, .1)'   = 'rgba(244, 241, 234, 0.1)'
  'rgba(163, 184, 172, .08)'  = 'rgba(244, 241, 234, 0.08)'
  'rgba(163, 184, 172, .06)'  = 'rgba(244, 241, 234, 0.06)'
  '#B7FF72'                   = '#FF5A4E'
  '#8FE25A'                   = '#E84D41'
}

# خلفيات الأسطح القديمة (Forest) -> أزرق داكن أنيق
$surfaces = [ordered]@{
  '#18251D' = '#141B2D'
  '#181f16' = '#141B2D'
  '#1F2F25' = '#1B243B'
  '#1f3026' = '#1B243B'
  '#22352A' = '#1B243B'
  '#263B2F' = '#212C46'
  '#101A14' = '#FFFFFF'
  '#26392D' = '#212C46'
  '#121D16' = '#141B2D'
  '#F2F8F4' = '#F4F1EA'
  '#f2fbf6' = '#F4F1EA'
}

$report = [System.Collections.Generic.List[string]]::new()

foreach ($file in $files) {
  $text = [System.IO.File]::ReadAllText($file.FullName)
  $lines = $text -split "`r?`n"
  $inDark = $false
  $depth = 0
  $touched = $false
  # كاشف يتبع تعمّق الملف كما يقرؤه المتصفح؛ قواعد dark على المستوى الأعلى فقط
  $fileDepth = 0
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $isDark = $line -match '\[data-theme="dark"\]'

    $orig = $line
    $convert = $false
    if ($isDark -and $fileDepth -eq 0) { $inDark = $true; $depth = 0; $convert = $true }
    elseif ($inDark) { $convert = $true }

    if ($convert) {
      foreach ($k in $map.Keys) { $line = $line -ireplace [regex]::Escape($k), $map[$k] }
      foreach ($k in $surfaces.Keys) { $line = $line -ireplace [regex]::Escape($k), $surfaces[$k] }
      # أي مزيج آخر بقي من Mint / الأزرق-الأخضر القديم -> مرجاني / رمادي دافئ
      $line = $line -ireplace 'rgba\(\s*183\s*,\s*255\s*,\s*114\s*,\s*([\d.]+)\s*\)', 'rgba(255, 90, 78, $1)'
      $line = $line -ireplace 'rgba\(\s*163\s*,\s*184\s*,\s*172\s*,\s*([\d.]+)\s*\)', 'rgba(244, 241, 234, $1)'
      # نص الأزرار القديم (داكن على Mint) ليصبح أبيض ناصع على المرجاني
      $line = $line -ireplace '(?<=\bcolor:\s*)#18251D', '#FFFFFF'
      $line = $line -ireplace '(?<=\bcolor:\s*)#101A14', '#FFFFFF'
      $line = $line -ireplace '(?<=\bstroke:\s*)#18251D', '#FFFFFF'
    }

    if ($line -ne $orig) {
      $report.Add(("{0}:{1}: - {2}" -f $file.Name, ($i + 1), $orig.Trim()))
      $report.Add(("{0}:{1}: + {2}" -f $file.Name, ($i + 1), $line.Trim()))
      $lines[$i] = $line
      $touched = $true
    }

    if ($inDark) {
      $depth += $opens - $closes
      if ($depth -le 0 -and $closes -gt 0) { $inDark = $false }
    }
    $fileDepth += $opens - $closes
    if ($fileDepth -lt 0) { $fileDepth = 0 }
  }
  if ($touched -and $Apply) {
    [System.IO.File]::WriteAllText($file.FullName, ($lines -join "`r`n"))
  }
}

$report | Out-File -FilePath (Join-Path $PSScriptRoot 'theme-diff.txt') -Encoding utf8
"replaced-lines: $($report.Count / 2)"
