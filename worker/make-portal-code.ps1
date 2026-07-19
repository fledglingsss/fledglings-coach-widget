# Fledglings — create a provider portal access code.
# Run:  powershell -ExecutionPolicy Bypass -File "C:\Users\iqbal\fledglings-coach-widget\worker\make-portal-code.ps1"
#
# Generates a random code, stores it in the worker's KV store with a
# label (e.g. the provider's name), and prints the code ONCE so you can
# send it to the provider. Codes can be revoked any time by deleting
# the KV key in the Cloudflare dashboard (Workers KV -> RATE_LIMITS ->
# portal:code:<code>).

Set-Location "C:\Users\iqbal\fledglings-coach-widget\worker"

$label = Read-Host "Label for this code (e.g. provider name)"
if (-not $label) { Write-Host "A label is required." -ForegroundColor Red; exit 1 }

$bytes = New-Object byte[] 12
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$code = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""

$value = '{"label":"' + $label.Replace('"','') + '"}'
npx wrangler kv key put --binding RATE_LIMITS --remote "portal:code:$code" $value

Write-Host ""
Write-Host "Access code for '$label' (share securely, shown once):" -ForegroundColor Green
Write-Host "  $code" -ForegroundColor Yellow
Write-Host ""
Write-Host "Portal: https://fledglings-coach.fledglings.workers.dev/portal"
