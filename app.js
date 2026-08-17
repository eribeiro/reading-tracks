
const state = {
  data:null, config:null, view:"papers", areas:new Set(), search:"",
  year:"", decade:"", era:"", lineage:"", venue:"", type:"", tag:"",
  researcher:"",
  grouping:"year", trackSorting:"name", expandedTracks:new Set(), visibleTracks:[], completed:new Set(), bookmarks:new Set()
};
const $ = id => document.getElementById(id);
const norm = v => (v ?? "").toString().normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase();
let resultsSummaryVisible=true;
const PROGRESS_KEY="readingtracks.progress.v1";
const BOOKMARKS_KEY="readingtracks.bookmarks.v1";

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
    state.data={papers:pd.papers,paperMap:new Map(pd.papers.map(p=>[p.id,p])),lineages:pd.lineages,metadata:pd.metadata,researchers:rd.researchers,venues:vd.venues};
    loadProgress(); loadBookmarks();
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
  $("trackSorting").addEventListener("change",e=>{state.trackSorting=e.target.value;render();});
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
    state.view=b.dataset.view; document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b)); render();
  }));
  $("clearFilters").addEventListener("click", clearFilters);
  $("clearProgress").addEventListener("click",()=>{
    if(!state.completed.size) return;
    $("clearProgressDialog").showModal();
  });
  $("confirmClearProgress").addEventListener("click",()=>{
    state.completed.clear(); saveProgress(); render();
  });
  $("toggleAllTracks").addEventListener("click",()=>{
    const allExpanded=state.visibleTracks.length&&state.visibleTracks.every(name=>state.expandedTracks.has(name));
    state.visibleTracks.forEach(name=>allExpanded?state.expandedTracks.delete(name):state.expandedTracks.add(name));
    render();
  });
  $("results").addEventListener("click",e=>{
    const bookmark=e.target.closest("[data-paper-bookmark]");
    if(bookmark) {
      const id=bookmark.dataset.paperBookmark;
      state.bookmarks.has(id)?state.bookmarks.delete(id):state.bookmarks.add(id);
      saveBookmarks(); render();
      requestAnimationFrame(()=>document.querySelector(`[data-paper-bookmark="${CSS.escape(id)}"]`)?.focus()||$("resultsSummary").focus());
      return;
    }
    const toggle=e.target.closest("[data-track-toggle]");
    if(toggle) {
      const name=toggle.dataset.trackToggle;
      state.expandedTracks.has(name)?state.expandedTracks.delete(name):state.expandedTracks.add(name);
      render();
      requestAnimationFrame(()=>document.querySelector(`[data-track-toggle="${CSS.escape(name)}"]`)?.focus());
      return;
    }
    const view=e.target.closest("[data-track-papers]");
    if(view) jumpToPapersFor("lineage",view.dataset.trackPapers);
  });
  $("results").addEventListener("change",e=>{
    const checkbox=e.target.closest("[data-paper-complete]");
    if(!checkbox) return;
    const id=checkbox.dataset.paperComplete;
    checkbox.checked?state.completed.add(id):state.completed.delete(id);
    saveProgress(); render();
    requestAnimationFrame(()=>document.querySelector(`[data-paper-complete="${CSS.escape(id)}"]`)?.focus());
  });
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
  state.grouping="year"; state.trackSorting="name"; $("search").value=""; $("grouping").value="year"; $("trackSorting").value="name";
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
  configureControls();
  $("groupingNav").hidden=true;
  $("groupingNav").innerHTML="";
  ({papers:renderPapers,bookmarks:renderBookmarks,researchers:renderResearchers,venues:renderVenues,lineages:renderLineages}[state.view])();
  active();
  requestAnimationFrame(updateBackToResults);
}
function configureControls() {
  const tracks=state.view==="lineages";
  document.querySelectorAll(".paper-only-filter").forEach(el=>el.hidden=tracks);
  $("trackSortingLabel").hidden=!tracks;
  $("toggleAllTracks").hidden=!tracks;
  $("clearProgress").hidden=!tracks;
  $("clearProgress").disabled=!state.completed.size;
  $("search").placeholder=tracks?"Search tracks or papers...":state.view==="bookmarks"?"Search bookmarked papers...":"Search title, author, tag, venue...";
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
  renderPaperCollection(state.data.papers.filter(matchPaper),"papers",empty());
}
function renderBookmarks() {
  const items=state.data.papers.filter(p=>state.bookmarks.has(p.id)).filter(matchPaper);
  const message=state.bookmarks.size?"No bookmarked papers match the current filters.":"No bookmarks yet. Use the bookmark button on a paper to save it here.";
  renderPaperCollection(items,"bookmarks",empty(message));
}
function renderPaperCollection(items,noun,emptyMarkup) {
  items.sort((a,b)=>b.year-a.year||a.title.localeCompare(b.title));
  const label=items.length===1?noun.slice(0,-1):noun;
  $("resultCount").textContent=`${items.length} ${label}`;
  if(!items.length){$("results").innerHTML=emptyMarkup;return;}
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
  const bookmarked=state.bookmarks.has(p.id);
  const bookmarkLabel=bookmarked?`Remove bookmark from ${p.title}`:`Bookmark ${p.title}`;
  return `<article class="card paper-card${bookmarked?" is-bookmarked":""}">
    <button class="bookmark-button" type="button" data-paper-bookmark="${esc(p.id)}" aria-pressed="${bookmarked}" aria-label="${esc(bookmarkLabel)}">${bookmarkIcon(bookmarked)}</button>
    <h2>${esc(p.title)}</h2>
    <div class="meta">${p.year} · ${esc(p.venue)} · ${esc((p.authors||[]).join(", "))}</div>
    <div class="badges">${(p.areas||[]).map(badge).join("")}${(p.tags||[]).map(badge).join("")}${badge(decadeOf(p.year))}${badge(p.difficulty)}${badge(`${p.reading_time_minutes} min`)}</div>
    <p>${esc(p.why_read||"")}</p>
    ${(p.lineages||[]).length?`<div class="meta">Tracks: ${(p.lineages||[]).map(human).join(" · ")}</div>`:""}
    ${link}
  </article>`;
}
function bookmarkIcon(bookmarked) {
  return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6.75 3.75h10.5v16.5L12 16.7l-5.25 3.55V3.75Z"${bookmarked?' fill="currentColor"':' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"'}/></svg>`;
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
  if(state.areas.size) es=es.filter(([,ids])=>{
    const areas=new Set(ids.flatMap(id=>paperById(id)?.areas||[]));
    return [...state.areas].every(area=>areas.has(area));
  });
  if(state.search) es=es.filter(([n,ids])=>norm([n,...ids.flatMap(id=>{
    const p=paperById(id); return p?[p.title,p.venue,...(p.authors||[]),...(p.tags||[])]:[];
  })].join(" ")).includes(norm(state.search)));
  es.sort(trackSort);
  state.visibleTracks=es.map(([name])=>name);
  const allExpanded=es.length&&es.every(([name])=>state.expandedTracks.has(name));
  $("toggleAllTracks").textContent=allExpanded?"Collapse all":"Expand all";
  $("toggleAllTracks").disabled=!es.length;
  $("resultCount").textContent=`${es.length} tracks`;
  const nav=$("groupingNav");
  if(es.length) {
    nav.hidden=false;
    nav.setAttribute("aria-label","Jump to track");
    nav.innerHTML=`<span class="grouping-nav-label">Tracks:</span><div class="grouping-nav-links">${es.map(trackNavLink).join('<span class="grouping-nav-separator" aria-hidden="true">·</span>')}</div>`;
  }
  $("results").innerHTML=es.length?es.map(trackCard).join(""):empty();
}
function trackNavLink([name,ids]) {
  const s=trackStats(ids), title=human(name);
  if(s.complete===s.ps.length) {
    return `<a class="track-nav-link is-complete" href="#${trackAnchor(name)}" aria-label="${esc(`${title}, all ${s.ps.length} papers completed`)}"><span>${esc(title)}</span><span class="track-nav-status" aria-hidden="true">✓</span></a>`;
  }
  if(s.complete) {
    return `<a class="track-nav-link is-progress" href="#${trackAnchor(name)}" aria-label="${esc(`${title}, ${s.complete} of ${s.ps.length} papers completed`)}"><span>${esc(title)}</span><span class="track-nav-status" aria-hidden="true">${s.complete}/${s.ps.length}</span></a>`;
  }
  return `<a class="track-nav-link" href="#${trackAnchor(name)}">${esc(title)}</a>`;
}
function trackAnchor(name){return `track-${String(name).replace(/[^a-zA-Z0-9_-]/g,"-")}`;}
function paperById(id){return state.data.paperMap.get(id);}
function trackPapers(ids){return ids.map(paperById).filter(Boolean);}
function trackStats(ids) {
  const ps=trackPapers(ids), years=ps.map(p=>p.year), total=ps.reduce((n,p)=>n+(p.reading_time_minutes||0),0);
  const difficulties=ps.reduce((m,p)=>{if(p.difficulty)m[p.difficulty]=(m[p.difficulty]||0)+1;return m;},{});
  const areas=[...new Set(ps.flatMap(p=>p.areas||[]))].sort();
  const complete=ps.filter(p=>state.completed.has(p.id)).length;
  return {ps,total,difficulties,areas,complete,minYear:Math.min(...years),maxYear:Math.max(...years)};
}
function trackSort(a,b) {
  const as=trackStats(a[1]), bs=trackStats(b[1]);
  if(state.trackSorting==="shortest") return as.total-bs.total||a[0].localeCompare(b[0]);
  if(state.trackSorting==="longest") return bs.total-as.total||a[0].localeCompare(b[0]);
  if(state.trackSorting==="progress") {
    const rank=s=>s.complete===s.ps.length?2:s.complete?0:1;
    return rank(as)-rank(bs)||(bs.complete/bs.ps.length)-(as.complete/as.ps.length)||a[0].localeCompare(b[0]);
  }
  return a[0].localeCompare(b[0]);
}
function formatDuration(minutes) {
  const hours=Math.floor(minutes/60), mins=minutes%60;
  return hours?`${hours}h${mins?` ${mins}m`:""}`:`${mins}m`;
}
function trackCard([name,ids]) {
  const s=trackStats(ids), expanded=state.expandedTracks.has(name);
  const years=s.minYear===s.maxYear?String(s.minYear):`${s.minYear}–${s.maxYear}`;
  const difficulty=["introductory","intermediate","advanced"].filter(key=>s.difficulties[key]).map(key=>`${s.difficulties[key]} ${key}`).join(" · ");
  const progressLabel=`${s.complete} of ${s.ps.length} papers completed`;
  const areas=s.areas.slice(0,4).map(badge).join("")+(s.areas.length>4?badge(`+${s.areas.length-4}`):"");
  const progressClass=s.complete===s.ps.length?" track-complete":s.complete?" track-in-progress":"";
  return `<article id="${trackAnchor(name)}" class="card track-card${progressClass}">
    <div class="track-card-header">
      <div>
        <h2>${esc(human(name))}</h2>
        <div class="track-facts">${s.ps.length} papers <span aria-hidden="true">·</span> ${esc(years)} <span aria-hidden="true">·</span> ${esc(formatDuration(s.total))}</div>
        <div class="badges track-areas" aria-label="Areas">${areas}</div>
      </div>
      <button class="track-toggle" type="button" data-track-toggle="${esc(name)}" aria-expanded="${expanded}">${expanded?"Close journey":"View journey"}</button>
    </div>
    <div class="track-progress-row">
      <progress max="${s.ps.length}" value="${s.complete}" aria-label="${esc(progressLabel)}"></progress>
      <span>${esc(progressLabel)}</span>
    </div>
    <div class="track-difficulty"><strong>Difficulty:</strong> ${esc(difficulty)}</div>
    ${expanded?trackJourney(name,s.ps):""}
  </article>`;
}
function trackJourney(name,ps) {
  return `<div class="track-journey">
    <div class="track-journey-heading">
      <h3>Reading journey</h3>
      <button type="button" class="link-like track-paper-view" data-track-papers="${esc(name)}">View these papers</button>
    </div>
    <ol class="track-steps">${ps.map((p,i)=>trackStep(p,i)).join("")}</ol>
  </div>`;
}
function trackStep(p,index) {
  const done=state.completed.has(p.id), link=p.links?.paper?`<a href="${esc(p.links.paper)}" target="_blank" rel="noopener">Read paper ↗</a>`:"";
  return `<li class="track-step${done?" is-complete":""}">
    <span class="track-step-number" aria-hidden="true">${index+1}</span>
    <div class="track-step-content">
      <h4>${esc(p.title)}</h4>
      <div class="meta">${p.year} · ${esc(p.venue)} · ${esc(human(p.difficulty))} · ${esc(formatDuration(p.reading_time_minutes||0))}</div>
      <p>${esc(p.why_read||"")}</p>
      ${link}
    </div>
    <label class="completion-control"><input type="checkbox" data-paper-complete="${esc(p.id)}"${done?" checked":""}> <span>${done?"Completed":"Mark complete"}</span></label>
  </li>`;
}
function loadProgress() {
  try {
    const value=JSON.parse(localStorage.getItem(PROGRESS_KEY)||"[]");
    if(!Array.isArray(value)) return;
    const valid=new Set(state.data.papers.map(p=>p.id));
    state.completed=new Set(value.filter(id=>typeof id==="string"&&valid.has(id)));
  } catch(_) { state.completed=new Set(); }
}
function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY,JSON.stringify([...state.completed])); } catch(_) {}
}
function loadBookmarks() {
  try {
    const value=JSON.parse(localStorage.getItem(BOOKMARKS_KEY)||"[]");
    if(!Array.isArray(value)) return;
    const valid=new Set(state.data.papers.map(p=>p.id));
    state.bookmarks=new Set(value.filter(id=>typeof id==="string"&&valid.has(id)));
  } catch(_) { state.bookmarks=new Set(); }
}
function saveBookmarks() {
  try { localStorage.setItem(BOOKMARKS_KEY,JSON.stringify([...state.bookmarks])); } catch(_) {}
}
function active() {
  const ps=[];
  if(state.areas.size) ps.push([...state.areas].join(" + "));
  const keys=state.view==="lineages"?["lineage"]:["year","decade","era","lineage","venue","type","tag"];
  for(const k of keys) {
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
function empty(message="No results for the current filters."){return `<div class="empty">${esc(message)}</div>`;}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
init();
