# Fledglings coach — one-shot API key setup with visible paste + instant verify.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File "C:\Users\iqbal\fledglings-coach-widget\worker\set-key.ps1"

Set-Location "C:\Users\iqbal\fledglings-coach-widget\worker"

Write-Host ""
Write-Host "Paste your Anthropic API key below. It WILL be visible - that is deliberate," -ForegroundColor Yellow
Write-Host "so you can see the paste worked. Nobody else sees this window." -ForegroundColor Yellow
Write-Host ""
$key = Read-Host "API key (starts sk-ant-)"

if ($key -notmatch "sk-ant-") {
  Write-Host ""
  Write-Host "That does not look like an API key (no 'sk-ant-' in it)." -ForegroundColor Red
  Write-Host "Copy the key from console.anthropic.com -> API Keys and run this script again."
  exit 1
}

Write-Host ""
Write-Host "Storing the secret in Cloudflare..." -ForegroundColor Cyan
$key | npx wrangler secret put ANTHROPIC_API_KEY

Write-Host ""
Write-Host "Waiting a few seconds, then verifying..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

$health = Invoke-RestMethod "https://fledglings-coach.fledglings.workers.dev/health"
Write-Host ""
if ($health.api_key_looks_valid) {
  Write-Host "SUCCESS - the key is stored and looks valid. The coach is live." -ForegroundColor Green
  Write-Host "Tell Claude 'check' for the full end-to-end test."
} else {
  Write-Host "Key stored but still not recognised as valid - run the script again," -ForegroundColor Red
  Write-Host "and double-check you are copying the full key from console.anthropic.com."
}
