/* Turning a PDF's text items back into lines.
 *
 * pdf.js hands back a flat list of positioned text runs, not lines. How
 * those runs are stitched decides what every downstream judgement sees:
 * the deterministic checks look for headings and bullets, and the model
 * is asked whether a CV can be skim-read. Flatten the structure here
 * and a well-organised CV arrives looking like a wall of text - the
 * learner is then marked down for formatting they actually got right.
 *
 * The version this replaces was copied inline into three pages and
 * tested nowhere. It broke a line whenever the baseline moved more
 * than two units, which ignored pdf.js's own end-of-line flag, split
 * lines on the jitter that superscripts cause, and never emitted a
 * blank line - so the gap between "Education" and the section above it
 * read exactly like an ordinary wrap.
 *
 * WHY THIS IS A STRING. It runs in the browser, not in the worker. The
 * obvious approach - write it in TypeScript and ship
 * `fn.toString()` - fails in a way unit tests cannot see: the bundler
 * rewrites function expressions with its own `__name()` helper to keep
 * names in stack traces, and that helper does not exist on the page.
 * The tests passed while the served page threw "__name is not defined"
 * on the first upload. So the shipped source IS the source, and the
 * tests evaluate this exact string.
 */

/** The browser-side assembler, served verbatim into every upload page. */
export const PDF_TEXT_JS = `
/* Baseline jitter that is NOT a new line: superscripts, inline icons
 * and font switches nudge the baseline while staying on one line. */
var FL_SAME_LINE_TOLERANCE=3.2;
/* A vertical gap this many times the usual line step means the
 * document left real space - a section break, not a wrap. */
var FL_PARAGRAPH_GAP_RATIO=1.6;
/* Horizontal distance between the end of one run and the start of the
 * next that means a word boundary. Kerning moves the pen a fraction of
 * a unit; a real space is a whole character wide. */
var FL_WORD_GAP_MIN=0.9;
function flAssemblePageText(items){
  var lines=[],line='',lineY=null,penX=null;
  function flush(){
    var text=line.replace(/\\s+/g,' ').trim();
    if(text)lines.push({text:text,y:lineY===null?0:lineY});
    line='';
  }
  var list=items||[];
  for(var i=0;i<list.length;i++){
    var item=list[i]||{};
    var str=typeof item.str==='string'?item.str:'';
    var tr=item.transform;
    var hasTr=Object.prototype.toString.call(tr)==='[object Array]';
    var y=hasTr&&typeof tr[5]==='number'?tr[5]:lineY;
    var x=hasTr&&typeof tr[4]==='number'?tr[4]:null;
    if(str===''){
      /* An empty run still carries the end-of-line flag. */
      if(item.hasEOL){flush();penX=null;}
      continue;
    }
    if(lineY!==null&&y!==null&&Math.abs(y-lineY)>FL_SAME_LINE_TOLERANCE){flush();penX=null;}
    /* Whether to insert a space is decided by the page, not the text.
     * PDFs split words mid-run constantly ("Custo"+"mer"), so a rule
     * based on "neither side has a space" glues separate words and
     * splits single ones with equal confidence. The gap between where
     * the last run ended and this one starts is the real evidence.
     * With no geometry, add nothing - pdf.js emits its own space runs,
     * and an invented space is harder to undo than a missing one. */
    var gap=(penX!==null&&x!==null)?x-penX:null;
    var needsSpace=line!==''&&!/\\s$/.test(line)&&!/^\\s/.test(str)&&gap!==null&&gap>FL_WORD_GAP_MIN;
    line+=(needsSpace?' ':'')+str;
    if(y!==null)lineY=y;
    if(x!==null)penX=x+(typeof item.width==='number'?item.width:0);
    if(item.hasEOL){flush();penX=null;}
  }
  flush();
  if(!lines.length)return '';
  /* The usual step between lines, as a median so one big heading
   * cannot define "normal" for the page. */
  var steps=[];
  for(var j=1;j<lines.length;j++){
    var st=Math.abs(lines[j-1].y-lines[j].y);
    if(st>0.5)steps.push(st);
  }
  steps.sort(function(a,b){return a-b});
  var median=steps.length?steps[Math.floor(steps.length/2)]:0;
  var out=lines[0].text;
  for(var k=1;k<lines.length;k++){
    var g=Math.abs(lines[k-1].y-lines[k].y);
    out+=((median>0&&g>median*FL_PARAGRAPH_GAP_RATIO)?'\\n\\n':'\\n')+lines[k].text;
  }
  return out;
}
`;

export interface PdfTextItem {
  str?: string;
  /** pdf.js sets this true on the run that ends a line. */
  hasEOL?: boolean;
  /** [a, b, c, d, e, f] - e (index 4) is x, f (index 5) the baseline y. */
  transform?: number[];
  /** Advance width of this run, in the same units as x. */
  width?: number;
}

/** Build the browser function from the source we actually serve, so
 * tests exercise the shipped string rather than a parallel copy. */
export function makeAssembler(): (items: PdfTextItem[]) => string {
  const factory = new Function(`${PDF_TEXT_JS}; return flAssemblePageText;`) as () => (
    items: PdfTextItem[],
  ) => string;
  return factory();
}
