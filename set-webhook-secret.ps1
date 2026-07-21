# Connects LearnWorlds webhooks to the Fledglings worker.
#
# BEFORE RUNNING: in LearnWorlds admin go to
#   Settings -> Developers -> Webhooks
# 1. Add a webhook with URL:
#      https://fledglings-coach.fledglings.workers.dev/hooks/learnworlds
#    Events: "Course completed" + "User registered/updated" + "Lead created"
#    (do NOT add payment/subscription events - we don't use them)
# 2. Copy the WEBHOOK SIGNATURE value shown on that page.
# 3. Run this script and paste it (visible, so you can check it).
$sig = Read-Host "Paste the LearnWorlds webhook signature"
$sig = $sig.Trim()
if ($sig.Length -lt 8) { Write-Host "That looks too short - aborting."; exit 1 }
Set-Location "$PSScriptRoot\worker"
$sig | npx wrangler secret put LW_WEBHOOK_SIGNATURE
Write-Host ""
Write-Host "Done. Verify: https://fledglings-coach.fledglings.workers.dev/health"
Write-Host "should show webhooks_configured: true. Then complete any module unit"
Write-Host "as a test learner and watch it appear in the portal's Live activity."
