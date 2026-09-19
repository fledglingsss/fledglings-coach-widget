/* /ops/verify — the founder's verification console. A live test bench
 * over the whole pipeline: platform roles, cohort structure, code
 * scoping, security invariants and data-pull freshness, each rendered
 * with an honest PASS / WARN / FAIL verdict. Founder-only (opsSession
 * gates the route); standalone page with its own styles. */

export function renderVerifyPage(): string {
  const body =
    "<header class='vh'><div><h1>Verification console</h1>" +
    "<p>Live checks over roles, cohorts, scoping, security and data pulls — refresh any time.</p></div>" +
    "<div><span class='vstamp' id='v-stamp'>loading…</span> " +
    "<button type='button' class='vbtn' onclick='location.reload()'>↻ Refresh</button></div></header>" +
    "<div id='v-body'><div class='vempty'>Running the checks…</div></div>" +
    "<script>" + VERIFY_JS + "</script>";

  return (
    "<!doctype html><html lang='en-GB'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<meta name='robots' content='noindex'><title>Fledglings — Verification Console</title>" +
    "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap' rel='stylesheet'>" +
    `<style>${VERIFY_CSS}</style></head><body>` +
    body +
    "</body></html>"
  );
}

const VERIFY_JS = String.raw`(function(){
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function chip(state){return "<span class='vchip "+state.toLowerCase()+"'>"+state+"</span>"}
function card(title,state,inner){return "<section class='vcard'><h2>"+esc(title)+" "+chip(state)+"</h2>"+inner+"</section>"}
function table(headers,rows){return "<table><thead><tr>"+headers.map(function(h){return "<th>"+esc(h)+"</th>"}).join('')+
"</tr></thead><tbody>"+rows.map(function(r){return "<tr>"+r.map(function(c){return "<td>"+c+"</td>"}).join('')+"</tr>"}).join('')+"</tbody></table>"}
fetch('/ops/verify.json').then(function(r){return r.json()}).then(function(d){
if(!d||d.error){document.getElementById('v-body').innerHTML="<div class='vempty'>Could not run the checks — "+esc((d&&d.error)||'no response')+"</div>";return;}
document.getElementById('v-stamp').textContent='generated '+new Date(d.generatedAt).toLocaleTimeString('en-GB');
var out='';

/* roles */
var roleRows=Object.keys(d.roles.counts).sort().map(function(k){
return [esc(k),String(d.roles.counts[k]),k==='user'||k==='user(absent)'?'counted as a learner':'excluded from every provider view']});
out+=card('Platform roles','PASS',
"<p class='vp'>"+d.roles.totalAccounts+" accounts on the platform; "+d.roles.learnersAfterRoleFilter+" carry the learner role. Only role-'user' accounts ever appear as learners.</p>"+
table(['Role level','Accounts','Treatment'],roleRows)+
"<p class='vp vmut'>Excluded accounts: "+d.roles.nonUsers.map(function(n){return esc(n.email)+" ("+esc(n.name||n.level)+")"}).join(' · ')+"</p>"+
((d.roles.manualExclusions||[]).length?"<p class='vp vmut'>Founder-named test accounts, excluded everywhere: "+d.roles.manualExclusions.map(esc).join(' · ')+"</p>":''));

/* reconciliation */
var rec=d.reconciliation;
out+=card('Learner reconciliation',rec.agree?'PASS':'FAIL',
"<p class='vp'>The role census, the rolling roster and the served dashboard must all count the same learners.</p>"+
table(['Source','Learners'],[['Role census (live from the platform)',String(rec.census)],
['Rolling roster (what refreshes hourly)',String(rec.roster)],
['Dashboard rows (what providers see)',String(rec.dashboard)]])+
(rec.agree?"":"<p class='vp vwarn'>Counts disagree — the roster reconciles on the next hourly tick; if this persists past an hour, something is wrong.</p>"));

/* structure */
var oddState=d.structure.oddities.length?'WARN':'PASS';
out+=card('Cohort structure',oddState,
"<p class='vp'>Exactly which tag combinations learners carry — the offering tag plus one cohort tag should dominate.</p>"+
table(['Tags on the account','Learners'],d.structure.combinations.slice(0,25).map(function(cm){return [esc(cm.tags),String(cm.learners)]}))+
(d.structure.oddities.length?"<p class='vp vwarn'>⚠ Counted as learners because their platform role is 'user', but their tags look like staff — change their role on the platform if they are staff:</p>"+
table(['Email','Tags'],d.structure.oddities.map(function(o){return [esc(o.email),esc(o.tags.join(', '))]})):''));

/* groups */
if((d.groups||[]).length){
var gWarn=d.groups.some(function(g){return g.staffMembers.length||g.missingFromRoster.length});
out+=card('User groups',gWarn?'WARN':'PASS',
"<p class='vp'>Provider-managed groups are the live cohort truth — each group title also behaves as a tag for scoping, so a learner missed by tagging is still seen.</p>"+
table(['Group','Members','Learners','Notes'],d.groups.map(function(g){
var notes=[];
if(g.staffMembers.length)notes.push('staff in group: '+g.staffMembers.join(', '));
if(g.missingFromRoster.length)notes.push("<b class='vbad'>"+g.missingFromRoster.length+' not yet on the roster</b> (next refresh picks them up)');
if(!notes.length)notes.push('all members on the roster ✓');
return [esc(g.title),String(g.members),String(g.learners),notes.join(' · ')]})));}

/* codes */
out+=card('Provider codes and scope','PASS',
"<p class='vp'>Every issued code, what it can see, and how many learners sit inside its scope right now.</p>"+
table(['Label','Scope tag','Learners in scope','Ops rights'],d.codes.map(function(cd){
return [esc(cd.label),esc(cd.tag||'whole school'),String(cd.inScope),cd.ops?'<b>yes</b>':'no']})));

/* security */
var secState=d.security.staffInRoster>0?'FAIL':(d.security.staffAnswerAccounts.length?'WARN':'PASS');
out+=card('Security invariants',secState,
table(['Check','Result'],[
['Staff or admin accounts inside the learner roster',d.security.staffInRoster===0?'none ✓':"<b class='vbad'>"+d.security.staffInRoster+" — investigate now</b>"],
['Reflection answers from non-learner accounts',d.security.staffAnswerAccounts.length===0?'none ✓':"<b>"+d.security.staffAnswerAccounts.length+"</b> account(s) — clears automatically at the next nightly rebuild ("+d.security.staffAnswerAccounts.map(esc).join(', ')+")"],
['Activity webhooks signature-checked',d.pulls.webhooksSigned?'yes ✓':"<b class='vbad'>not configured</b>"],
['Reflections sweep filters to learner accounts',d.pulls.reflections.learnerFilterActive?'yes ✓':'rebuild pending']]));

/* pulls */
var p=d.pulls,ro=p.roster;
var coverageShort=p.reflections.coveredCourses<p.reflections.totalCourses;
var pullWarn=coverageShort||ro.awaitingFirstFetch>0||p.accountCapacity.seen/p.accountCapacity.max>0.9||(ro.oldestCourseFetchMinutesAgo!==null&&ro.oldestCourseFetchMinutesAgo>ro.fullCycleHours*90);
out+=card('Data pulls',pullWarn?'WARN':'PASS',
table(['Pull','State'],[
['Learner list sync',ro.listSyncedMinutesAgo===null?'never':ro.listSyncedMinutesAgo+' minutes ago'],
['Course data — freshest learner',ro.newestCourseFetchMinutesAgo===null?'—':ro.newestCourseFetchMinutesAgo+' minutes ago'],
['Course data — stalest learner',ro.oldestCourseFetchMinutesAgo===null?'—':ro.oldestCourseFetchMinutesAgo+' minutes ago'],
['Refresh cadence',ro.refreshedPerHourlyTick+' learners per hourly tick — full cycle ≈ '+ro.fullCycleHours+' hours at '+ro.size+' learners'],
['Learners awaiting their first course pull',ro.awaitingFirstFetch===0?'none ✓':"<b>"+ro.awaitingFirstFetch+"</b>"],
['Reflections snapshot',esc(p.reflections.status)+' · '+p.reflections.answersOnRecord+' answers · built '+p.reflections.builtHoursAgo+'h ago'],
['Reflections module coverage',p.reflections.coveredCourses+' of '+p.reflections.totalCourses+' modules swept'+(coverageShort?" — <b class='vbad'>rebuilding; fills over the next few hours</b>":' ✓')],
['Account capacity',p.accountCapacity.seen+' of '+p.accountCapacity.max+' the pull can cover'+(p.accountCapacity.seen/p.accountCapacity.max>0.9?" — <b class='vbad'>raise the page cap soon</b>":'')]]));

document.getElementById('v-body').innerHTML=out;})
.catch(function(){document.getElementById('v-body').innerHTML="<div class='vempty'>Could not reach the console service — refresh to retry.</div>";});
})();`;

const VERIFY_CSS = `
:root{--navy:#05253C;--orange:#D9452B;--ink:#25394B;--mut:#6A7A88;--line:#E3DDDA;--ok:#1B7A4B;--warn:#9A5812;--bad:#B93A22;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:#F4F1EF;color:var(--ink);padding:26px;max-width:1060px;margin:0 auto;}
.vh{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:20px;}
.vh h1{font-size:24px;color:var(--navy);}
.vh p{color:var(--mut);font-size:14px;margin-top:4px;}
.vstamp{color:var(--mut);font-size:13px;}
.vbtn{border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px 14px;font-size:14px;font-weight:600;cursor:pointer;}
.vcard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:16px;}
.vcard h2{font-size:16px;color:var(--navy);margin-bottom:10px;}
.vchip{display:inline-block;border-radius:999px;padding:2px 10px;font-size:11.5px;font-weight:800;letter-spacing:.04em;vertical-align:2px;}
.vchip.pass{background:#E4F1E9;color:var(--ok);}
.vchip.warn{background:#F7ECDD;color:var(--warn);}
.vchip.fail{background:#F9E4E0;color:var(--bad);}
.vp{font-size:13.5px;line-height:1.55;margin-bottom:10px;}
.vmut{color:var(--mut);}
.vwarn{color:var(--warn);font-weight:600;}
.vbad{color:var(--bad);}
table{width:100%;border-collapse:collapse;font-size:13.5px;}
th{text-align:left;color:var(--mut);font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;padding:6px 10px 6px 0;border-bottom:1px solid var(--line);}
td{padding:7px 10px 7px 0;border-bottom:1px solid #F0EBE9;vertical-align:top;}
.vempty{color:var(--mut);padding:30px;text-align:center;}
@media(max-width:640px){body{padding:14px;}td,th{font-size:12.5px;}}
`;
