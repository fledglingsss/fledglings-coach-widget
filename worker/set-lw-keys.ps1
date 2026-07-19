# Fledglings coach — LearnWorlds API setup with visible paste + instant verify.
# Creates the three worker secrets, then fetches the course list so the
# module -> course-id map can be filled in.
#
# BEFORE RUNNING: in LearnWorlds admin go to Settings -> Developers -> API,
# enable the API if needed, and copy the Client ID and Client Secret.
#
# Run:  powershell -ExecutionPolicy Bypass -File "C:\Users\iqbal\fledglings-coach-widget\worker\set-lw-keys.ps1"

Set-Location "C:\Users\iqbal\fledglings-coach-widget\worker"

Write-Host ""
Write-Host "Values are VISIBLE as you paste - that is deliberate so you can see they landed." -ForegroundColor Yellow
Write-Host ""

$clientId = Read-Host "LearnWorlds Client ID"
$clientSecret = Read-Host "LearnWorlds Client Secret"
$schoolUrl = Read-Host "School URL (e.g. https://www.fledglings.co)"

if (-not $clientId -or -not $clientSecret -or $schoolUrl -notmatch "^https://") {
  Write-Host "Something looks empty or the URL doesn't start with https:// - run again." -ForegroundColor Red
  exit 1
}
$schoolUrl = $schoolUrl.TrimEnd("/")

Write-Host ""
Write-Host "Storing the three secrets in Cloudflare..." -ForegroundColor Cyan
$clientId | npx wrangler secret put LEARNWORLDS_CLIENT_ID
$clientSecret | npx wrangler secret put LEARNWORLDS_CLIENT_SECRET
$schoolUrl | npx wrangler secret put LEARNWORLDS_SCHOOL_URL

Write-Host ""
Write-Host "Fetching your course list from LearnWorlds..." -ForegroundColor Cyan
$env:LEARNWORLDS_CLIENT_ID = $clientId
$env:LEARNWORLDS_CLIENT_SECRET = $clientSecret
$env:LEARNWORLDS_SCHOOL_URL = $schoolUrl
node scripts/fetch-courses.mjs
$fetchOk = $?
$env:LEARNWORLDS_CLIENT_ID = ""
$env:LEARNWORLDS_CLIENT_SECRET = ""
$env:LEARNWORLDS_SCHOOL_URL = ""

Write-Host ""
if ($fetchOk) {
  Write-Host "SUCCESS - secrets stored and the course list is saved at" -ForegroundColor Green
  Write-Host "worker\config\courses.generated.json (titles + ids, no secrets)." -ForegroundColor Green
  Write-Host "Tell Claude 'lw keys done' and the course map gets wired up."
} else {
  Write-Host "Secrets were stored, but fetching courses failed - check the three values" -ForegroundColor Red
  Write-Host "(the Client ID/Secret from Settings -> Developers -> API, and the school URL)."
}
