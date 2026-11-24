$p = 'src/components/RateDawakBanner.css'
$t = [System.IO.File]::ReadAllText((Resolve-Path $p))
$marker = 'القواعد هنا تعيد تأكيد الألوان فوق أي قاعدة [data-theme="dark"] عامة'
$e = $t.IndexOf($marker)
$blockStart = $t.LastIndexOf('/* ====', $e)
$blockEnd = $t.IndexOf('*/', $e) + 2

$body = @'

/* =======================================================================
   الوضع الليلي — لوحة الكحلي الليلي (Navy) مع لمسة مرجاني
   ======================================================================= */

[data-theme="dark"] .rate-banner,
[data-theme="dark"] .rate-banner::before {
  background: var(--dark-card, #1B243B) !important;
  background-image: none !important;
  border: 1px solid rgba(244, 241, 234, 0.12) !important;
  border-radius: 24px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28) !important;
  color: var(--dark-text, #F4F1EA) !important;
  display: block;
}

[data-theme="dark"] .rate-banner::before {
  display: none !important;
}

[data-theme="dark"] .rate-banner-kicker {
  background: rgba(255, 90, 78, 0.14) !important;
  border-color: rgba(255, 90, 78, 0.32) !important;
  color: #FF5A4E !important;
}

[data-theme="dark"] .rate-banner-kicker svg {
  color: #FF5A4E !important;
  stroke: #FF5A4E !important;
}

[data-theme="dark"] .rate-banner-copy h2 {
  color: #F4F1EA !important;
}
'@

# استبدال كل بقية كتلة الوضع الليلي حتى نهاية الملف
$tail = $t.Substring($blockEnd)
$new = $t.Substring(0, $blockStart) + $body.TrimStart() + "`r`n"
[System.IO.File]::WriteAllText((Resolve-Path $p), $new)
"ok; tail-removed-chars: $($tail.Length)"
