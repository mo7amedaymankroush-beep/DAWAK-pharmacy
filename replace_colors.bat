@echo off
setlocal
set "CSS_FILE=e:\\MY PRO VS code\\DAWAK-pharmacy\\src\\components\\Footer.css"
set "TEMP_FILE=%TEMP%\\footer_replace.css"

copy "%CSS_FILE%" "%TEMP_FILE%"

powershell -Command "
$content = Get-Content '%TEMP_FILE%' -Encoding utf8
$content = $content -replace 'B08D56', 'B7FF72'
$content = $content -replace '999999', 'a5c4b3'
$content = $content -replace '2a2a2a', '18251D'
$content = $content -replace '404040', '1f3026'
$content = $content -replace '4a4a4a', '22352a'
Set-Content '%CSS_FILE%' $content -Encoding utf8
"

del "%TEMP_FILE%"
echo Done replacing colors in Footer.css