const { renderToolsPage } = await import("../src/pages.ts");
const { renderLinkedInPage } = await import("../src/pages-linkedin.ts");
function check(name, html) {
  const start = html.indexOf("id='u-card'");
  const end = html.indexOf("id='a-card'");
  const seg = html.slice(start, end);
  const opens = (seg.match(/<div/g) || []).length;
  const closes = (seg.match(/<\/div>/g) || []).length;
  console.log(name + ": opens=" + opens + " closes=" + closes + " (balanced means closes===opens: u-card itself closed before a-card)");
}
check("tools", renderToolsPage());
check("linkedin", renderLinkedInPage());
