
const state = {
  data:null, config:null, view:"papers", areas:new Set(), search:"",
  year:"", decade:"", era:"", lineage:"", venue:"", type:"", tag:"",
  researcher:"",
  grouping:"year"
};
const $ = id => document.getElementById(id);
const norm = v => (v ?? "").toString().normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase();
let resultsSummaryVisible=true;

async function loadYaml(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
  return jsyaml.load(await r.text());
}
// Eras are declared in config.yaml as numeric year ranges (inclusive; either
// end may be omitted for open-ended eras) and derived per paper from `year`
// at render time, so relabeling/re-bucketing eras never requires touching
// paper data.
function eraOf(year) {
  for (const [key,e] of Object.entries(state.config.eras)) {
    if ((e.start===undefined || year>=e.start) && (e.end===undefined || year<=e.end)) return key;
  }
  return null;
}
function decadeOf(year) { return `${Math.floor(year/10)*10}s`; }

async function init() {
  try {
    const data_dir = "data";
    const [cfg,pd,rd,vd] = await Promise.all([
      loadYaml("config.yaml"),
      loadYaml(`${data_dir}/papers.yaml`),
      loadYaml(`${data_dir}/researchers.yaml`),
      loadYaml(`${data_dir}/venues.yaml`)
    ]);
    state.config=cfg;
    state.data={papers:pd.papers,lineages:pd.lineages,metadata:pd.metadata,researchers:rd.researchers,venues:vd.venues};
    applyBranding(); wire(); populate(); render();
  } catch(e) {
    $("results").innerHTML=`<div class="empty"><strong>Could not load the YAMLs.</strong><br>${esc(e.message)}<br><br>Serve the folder over HTTP (e.g., python3 -m http.server), not via file://.</div>`;
    $("resultCount").textContent=`Error - ${e}`;
  }
}
function applyBranding() {
  const s=state.config.site||{};
  if(s.title) document.title=s.title;
  const desc=document.querySelector('meta[name="description"]');
  if(desc && s.tagline) desc.setAttribute("content",s.tagline);
  if($("siteTitle") && s.title) $("siteTitle").textContent=s.title;
  if($("siteTagline") && s.tagline) $("siteTagline").textContent=s.tagline;
  if($("authorLink")) {
    if(s.author_name) $("authorLink").textContent=s.author_name;
    if(s.author_url) $("authorLink").href=s.author_url;
  }
  if($("siteFooter") && s.footer) $("siteFooter").textContent=s.footer;
}
function wire() {
  $("search").addEventListener("input", e=>{state.search=e.target.value;render();});
  for (const id of ["year","decade","era","lineage","venue","type","tag","grouping"])
    $(id).addEventListener("change",e=>{state[id]=e.target.value;render();});
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
    state.view=b.dataset.view; document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b)); render();
  }));
  $("clearFilters").addEventListener("click", clearFilters);
  const summary=$("resultsSummary");
  const backToResults=$("backToResults");
  new IntersectionObserver(([entry])=>{
    resultsSummaryVisible=entry.isIntersecting;
    updateBackToResults();
  }).observe(summary);
  new ResizeObserver(updateScrollOffset).observe(document.querySelector(".controls"));
  window.addEventListener("resize",()=>{
    updateScrollOffset();
    updateBackToResults();
  });
  backToResults.addEventListener("click",()=>{
    requestAnimationFrame(()=>summary.focus({preventScroll:true}));
  });
  updateScrollOffset();
}
function populate() {
  const areas=state.config.areas;
  $("areaFilters").innerHTML=areas.map(a=>`<button class="chip" data-area="${esc(a)}">${esc(a)}</button>`).join("");
  document.querySelectorAll("[data-area]").forEach(b=>b.addEventListener("click",()=>{
    const a=b.dataset.area; state.areas.has(a)?state.areas.delete(a):state.areas.add(a);
    b.classList.toggle("active",state.areas.has(a)); render();
  }));
  fill("year",[...new Set(state.data.papers.map(p=>p.year))].sort((a,b)=>b-a),x=>x);
  fill("decade",[...new Set(state.data.papers.map(p=>decadeOf(p.year)))].sort().reverse(),x=>x);
  fill("era",Object.keys(state.config.eras),k=>state.config.eras[k].label);
  fill("lineage",Object.keys(state.data.lineages).sort(),human);
  fill("venue",[...new Set(state.data.papers.map(p=>p.venue))].sort(),x=>x);
  fill("type",[...new Set(state.data.papers.map(p=>p.type))].sort(),human);
  fill("tag",[...new Set(state.data.papers.flatMap(p=>p.tags||[]))].sort((a,b)=>a.localeCompare(b)),x=>x);
}
function fill(id,values,label) {
  const s=$(id), first=s.options[0].outerHTML;
  s.innerHTML=first+values.map(v=>`<option value="${esc(v)}">${esc(label(v))}</option>`).join("");
}
function resetFilters() {
  state.areas.clear(); state.search=state.year=state.decade=state.era=state.lineage=state.venue=state.type=state.tag=state.researcher="";
  state.grouping="year"; $("search").value=""; $("grouping").value="year";
  for(const id of ["year","decade","era","lineage","venue","type","tag"]) $(id).value="";
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
}
function clearFilters() { resetFilters(); render(); }
function switchToPapersView() {
  state.view="papers";
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view==="papers"));
}
function jumpToPapersFor(field,value) {
  resetFilters();
  state[field]=value;
  if(field==="venue") $("venue").value=value;
  switchToPapersView(); render();
}
function matchPaper(p) {
  if(state.areas.size && ![...state.areas].every(a=>(p.areas||[]).includes(a))) return false;
  if(state.year && String(p.year)!==state.year) return false;
  if(state.decade && decadeOf(p.year)!==state.decade) return false;
  if(state.era && eraOf(p.year)!==state.era) return false;
  if(state.lineage && !(p.lineages||[]).includes(state.lineage)) return false;
  if(state.venue && p.venue!==state.venue) return false;
  if(state.type && p.type!==state.type) return false;
  if(state.tag && !(p.tags||[]).includes(state.tag)) return false;
  if(state.researcher) {
    const r=state.data.researchers.find(x=>x.id===state.researcher);
    if(!r || !(r.paper_ids||[]).includes(p.id)) return false;
  }
  if(state.search) {
    const hay=norm([p.title,p.year,p.venue,...(p.authors||[]),...(p.tags||[]),...(p.areas||[]),...(p.lineages||[]),p.why_read].join(" "));
    if(!hay.includes(norm(state.search))) return false;
  }
  return true;
}
function render() {
  if(!state.data) return;
  $("groupingNav").hidden=true;
  $("groupingNav").innerHTML="";
  ({papers:renderPapers,researchers:renderResearchers,venues:renderVenues,lineages:renderLineages}[state.view])();
  active();
  requestAnimationFrame(updateBackToResults);
}
function updateBackToResults() {
  const pageIsLong=document.documentElement.scrollHeight>window.innerHeight+200;
  $("backToResults").hidden=resultsSummaryVisible||!pageIsLong;
}
function updateScrollOffset() {
  const controls=document.querySelector(".controls");
  const offset=getComputedStyle(controls).position==="sticky"?controls.offsetHeight+12:24;
  document.documentElement.style.setProperty("--scroll-offset",`${offset}px`);
}
function renderPapers() {
  const items=state.data.papers.filter(matchPaper).sort((a,b)=>b.year-a.year||a.title.localeCompare(b.title));
  $("resultCount").textContent=`${items.length} papers`;
  if(!items.length){$("results").innerHTML=empty();return;}
  if(state.grouping==="none") {$("results").innerHTML=items.map(card).join("");return;}
  const key=state.grouping;
  const groupKey=key==="year"?p=>p.year:p=>decadeOf(p.year);
  const groups=Map.groupBy ? Map.groupBy(items,groupKey) : items.reduce((m,p)=>{const k=groupKey(p);(m[k]??=[]).push(p);return m;},{});
  const entries=groups instanceof Map?[...groups.entries()]:Object.entries(groups);
  entries.sort((a,b)=>key==="year"?Number(b[0])-Number(a[0]):String(b[0]).localeCompare(String(a[0])));
  const nav=$("groupingNav");
  nav.hidden=false;
  nav.setAttribute("aria-label",`Jump to ${key}`);
  nav.innerHTML=`<span class="grouping-nav-label">${key==="year"?"Years":"Decades"}:</span><div class="grouping-nav-links">${entries.map(([g])=>`<a href="#${groupAnchor(key,g)}">${esc(g)}</a>`).join('<span class="grouping-nav-separator" aria-hidden="true">·</span>')}</div>`;
  $("results").innerHTML=entries.map(([g,ps])=>`<section id="${groupAnchor(key,g)}" class="year-group"><h2 class="year-heading">${esc(g)}</h2>${ps.map(card).join("")}</section>`).join("");
}
function groupAnchor(key,value){return `group-${key}-${String(value).replace(/[^a-zA-Z0-9_-]/g,"-")}`;}
function card(p) {
  const link=p.links?.paper?`<a href="${esc(p.links.paper)}" target="_blank" rel="noopener">paper ↗</a>`:"";
  return `<article class="card">
    <h2>${esc(p.title)}</h2>
    <div class="meta">${p.year} · ${esc(p.venue)} · ${esc((p.authors||[]).join(", "))}</div>
    <div class="badges">${(p.areas||[]).map(badge).join("")}${(p.tags||[]).map(badge).join("")}${badge(decadeOf(p.year))}${badge(p.difficulty)}${badge(`${p.reading_time_minutes} min`)}</div>
    <p>${esc(p.why_read||"")}</p>
    ${(p.lineages||[]).length?`<div class="meta">Tracks: ${(p.lineages||[]).map(human).join(" · ")}</div>`:""}
    ${link}
  </article>`;
}
function renderResearchers() {
  let xs=state.data.researchers;
  if(state.areas.size) xs=xs.filter(r=>[...state.areas].every(a=>(r.areas||[]).includes(a)));
  if(state.search) xs=xs.filter(r=>norm([r.name,...(r.areas||[]),...(r.topics||[])].join(" ")).includes(norm(state.search)));
  xs=xs.sort((a,b)=>a.name.localeCompare(b.name)); $("resultCount").textContent=`${xs.length} researchers`;
  $("results").innerHTML=xs.length?xs.map(r=>`<article class="card"><h2><button class="link-like" data-researcher="${esc(r.id)}">${esc(r.name)}</button></h2><div class="badges">${(r.areas||[]).map(badge).join("")}</div><p>${esc((r.topics||[]).join(" · "))}</p><div class="meta">${(r.paper_ids||[]).length} related papers</div></article>`).join(""):empty();
  document.querySelectorAll("[data-researcher]").forEach(b=>b.addEventListener("click",()=>jumpToPapersFor("researcher",b.dataset.researcher)));
}
function renderVenues() {
  let xs=state.data.venues;
  if(state.areas.size) xs=xs.filter(v=>[...state.areas].every(a=>(v.areas||[]).includes(a)));
  if(state.search) xs=xs.filter(v=>norm([v.name,v.organization,v.tier,...(v.areas||[])].join(" ")).includes(norm(state.search)));
  xs=xs.sort((a,b)=>a.name.localeCompare(b.name)); $("resultCount").textContent=`${xs.length} venues`;
  $("results").innerHTML=xs.length?xs.map(v=>`<article class="card"><h2><button class="link-like" data-venue="${esc(v.id)}">${esc(v.name)}</button></h2><div class="meta">${esc(v.organization)} · ${esc(v.tier)}</div><div class="badges">${(v.areas||[]).map(badge).join("")}</div></article>`).join(""):empty();
  document.querySelectorAll("[data-venue]").forEach(b=>b.addEventListener("click",()=>{
    // venues.yaml's descriptive `name` doesn't match papers' short venue strings (e.g.
    // "ACM SIGCOMM" vs "SIGCOMM"), but its `id` does once hyphens become spaces (e.g.
    // "usenix-atc" -> "USENIX ATC"). Fall back to the raw id (guaranteed no match) so a
    // venue with no cataloged papers still yields a clean "no results" instead of showing everything.
    const norm2=s=>s.toUpperCase().replace(/-/g," ");
    const vid=b.dataset.venue;
    const match=[...new Set(state.data.papers.map(p=>p.venue))].find(v=>norm2(v)===norm2(vid));
    jumpToPapersFor("venue",match||vid);
  }));
}
function renderLineages() {
  let es=Object.entries(state.data.lineages);
  if(state.lineage) es=es.filter(([n])=>n===state.lineage);
  if(state.search) es=es.filter(([n,ids])=>norm([n,...ids.map(id=>state.data.papers.find(p=>p.id===id)?.title||"")].join(" ")).includes(norm(state.search)));
  $("resultCount").textContent=`${es.length} tracks`;
  $("results").innerHTML=es.length?es.sort((a,b)=>a[0].localeCompare(b[0])).map(([n,ids])=>{
    const ps=ids.map(id=>state.data.papers.find(p=>p.id===id)).filter(Boolean);
    return `<article class="card"><h2>${esc(human(n))}</h2><div class="lineage-flow">${ps.map((p,i)=>`${i?'<span class="arrow">→</span>':''}<span class="lineage-step">${p.year} · ${esc(p.title)}</span>`).join("")}</div></article>`;
  }).join(""):empty();
}
function active() {
  const ps=[];
  if(state.areas.size) ps.push([...state.areas].join(" + "));
  for(const k of ["year","decade","era","lineage","venue","type","tag"]) {
    if(!state[k]) continue;
    if(k==="era") ps.push(state.config.eras[state[k]].label);
    else if(k==="lineage"||k==="type") ps.push(human(state[k]));
    else ps.push(state[k]);
  }
  if(state.researcher) {
    const r=state.data.researchers.find(x=>x.id===state.researcher);
    if(r) ps.push(r.name);
  }
  if(state.search) ps.push(`“${state.search}”`);
  $("activeSummary").textContent=ps.length?`· ${ps.join(" · ")}`:"";
}
function human(s){return String(s).replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase()).replace(/\b(Ai|Ml|Mlops|Oltp|Olap|Llm)\b/g,s=>({Ai:"AI",Ml:"ML",Mlops:"MLOps",Oltp:"OLTP",Olap:"OLAP",Llm:"LLM"})[s]);}
function badge(s){return `<span class="badge">${esc(s)}</span>`;}
function empty(){return `<div class="empty">No results for the current filters.</div>`;}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
init();
