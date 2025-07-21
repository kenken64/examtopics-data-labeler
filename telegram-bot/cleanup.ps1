$content = Get-Content -Path "bot.js" -TotalCount 2586
$content | Out-File -FilePath "bot-clean-final.js" -Encoding UTF8
