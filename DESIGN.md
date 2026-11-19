# Design notes: scaling curation and WebMCP extensions

Status: working notes, November 2026. Nothing here is committed to yet.

## Where things stand

- `data/papers.yaml` holds 280 papers and 42 tracks. Its `predecessors`/`successors`
  lists give 282 untyped "read A before B" edges.
- 90 papers have no incoming edge, including `spanner-2012` and `chain-replication-2004`.
  The lists are also lopsided: 154 edges appear only in `predecessors` and 46 only in
  `successors`.
- `data/relations.yaml` adds curated types (`builds_on`, `simplifies`, `supersedes`,
  `refines`, `contradicts`), notes, and `order: false` for links that mark a tension
  rather than a prerequisite. It has 3 entries so far, all without notes.
- `scripts/export.py` merges both sources into `data/edges.json` (format v2) and
  `llms.txt`.
- The `experiment/webmcp` branch has `webmcp.js` with two read-only tools,
  `find_paper` and `get_prerequisites`.

Writing every relation and note by hand doesn't scale to the size of the catalog.
The rest of this document covers how to scale curation without losing what makes it
worth having, and which WebMCP tools could be built on top of it.

## Part 1: Scaling curation

The aim is to stop writing edges and start reviewing them. Accepting or rejecting a
proposed edge takes seconds; writing one takes minutes. Machine-generated edges are
fine as long as they are grounded in evidence, labeled as machine-generated, and
reviewed by a person.

### Option 1: Candidate edges from the citation graph

- Fetch each paper's references from Semantic Scholar or OpenAlex, using its DOI or
  title. Keep only references to papers that are also in the catalog. That should
  give a few hundred pairs, not thousands.
- If B cites A, "read A before B" is a candidate. Grounding candidates in citations
  avoids invented edges, which is how small models and recall from memory fail.
- Semantic Scholar also returns the citing sentences (`contexts`), an `isInfluential`
  flag, and an intent label (`background`, `methodology`, `result`). These become the
  evidence for Option 2.
- Limits:
  - Citations only point backward in time.
  - Recent papers (2025–2026) have little citation data.
  - A passing mention doesn't make one paper a prerequisite for the other. Rank by
    influence and by how strong the citing sentence is.

### Option 2: Classify candidates from the citing text

- For each candidate, give a strong model both abstracts plus the sentences where B
  cites A. Ask for a type (or none), a confidence, a draft note of at most 120
  characters, and the exact quote the decision rests on.
- This is grounded extraction: the model judges text in front of it instead of
  recalling the literature, which is far more reliable.
- It's good at `builds_on`, `simplifies` and `supersedes`. It's weak at
  `contradicts`, because papers rarely say outright that they disagree, so tension
  edges stay mostly human-written.
- This needs an Anthropic API key and runs only when the catalog is built, never
  when a reader loads the site.

### Option 3: A review queue instead of writing

- Proposals go into `relations.yaml` with `status: draft`.
- Review them in impact order: first papers that sit in many tracks, then edges that
  fill gaps such as papers with no prerequisites.
- Each decision is a single keystroke: accept, reject or edit. Store rejections
  (`status: rejected`) so a proposal never comes back.
- The interface could be a small CLI (`scripts/review_relations.py`) or a local web
  page.
- Expect about 10 seconds per edge, so 300 edges takes under an hour.

### Option 4: Make provenance visible

- Add `status: curated | reviewed | draft | rejected`, where:
  - `curated`: written by you;
  - `reviewed`: proposed by a machine and accepted by you;
  - `draft`: proposed but not yet reviewed;
  - `rejected`: kept only to suppress repeats.
- Show the status in the UI and in `edges.json`. WebMCP tools prefer curated and
  reviewed edges and label drafts.
- This answers the "anyone can reproduce Claude-built edges" critique. Machine edges
  are the base layer, and curated edges are the part only you can provide.

### Option 5: Mine existing reading lists

- Course syllabi, such as MIT 6.5840, CMU 15-721 and Berkeley CS262a, already put
  papers in order. When several independent lists put A before B, that's a strong
  reading-order signal.
- Use only the ordering. Don't copy their annotations.

### Option 6: Contributions from readers (later)

- Add an issue form ("suggest a relation") and turn Paper Club session notes into
  PRs that add relations.
- Every contribution needs review, so this only pays off once real readers are
  working through tracks.

### Recommendation

Combine Options 1–4, and pilot on one track before doing the whole catalog.

1. Extend the `relations.yaml` schema with these optional fields:

   ```yaml
   - from: viewstamped-1988
     to: raft-2014
     type: simplifies
     note: Same protocol shape as VR, re-explained for understandability.
     status: reviewed          # curated | reviewed | draft | rejected (default: curated)
     source: citation+llm      # manual | citation | citation+llm | syllabus
     confidence: 0.8           # 0..1, machine proposals only
     evidence: "...the citing sentence..."
   ```

   The validator currently rejects unknown fields, so it needs to learn the new ones.
   `export.py` would leave `rejected` entries out of `edges.json`.
2. Write `scripts/propose_relations.py --track consensus-replication`. It would:
   - resolve papers to Semantic Scholar IDs and cache the results;
   - fetch citations between catalog papers, with their contexts;
   - write `draft` entries.

   Run it first without the model step to judge the volume and quality of the
   candidates.
3. Add the model classification step, with the evidence quote required in every
   proposal.
4. Add the review CLI.
5. Add a status badge to the UI and status-aware WebMCP tools.

Pilot on `consensus-replication`: it's well cited and well understood, and it fills
the empty prerequisite lists for Raft and its neighbors.

Open questions:

- Should a `draft` edge ever be shown to readers, or only kept for review?
- Should reviewing an edge require a note, or can a type be accepted on its own?
- How do we refresh the data when Semantic Scholar's citation data changes?
- What happens to an already-reviewed edge that a later run no longer proposes?

Privacy: the scripts send paper DOIs and titles to public APIs, which is catalog data
only. The model step sends abstracts and citing sentences to the Claude API.

## Part 2: WebMCP extensions

### Principles

These come from the WebMCP notes and Chrome's current documentation.

- Read-only by default. Any tool that changes state needs a clear description, and
  its effect must be visible in the page.
- Design tools around tasks ("what should I read before X") rather than data
  structures ("get edges").
- Use feature detection with
  `const mc = document.modelContext ?? navigator.modelContext`; with no support, do
  nothing.
- Keep all API calls in the thin adapter in `webmcp.js`. Keep the graph logic in pure
  functions that run under node tests.
- Read only `data/edges.json`; don't depend on `app.js` internals except where a tool
  has to drive the UI.
- Results are JSON-serializable. Return the curator's note whenever an edge has one.
- `registerTool()` returns a promise. Catch rejections and log the tool name (this is
  not done yet).

### Built so far

| Tool | Purpose |
|---|---|
| `find_paper(query, limit)` | Keyword search over titles, ids, authors, tags, tracks, venue and year. Every term must match. Returns ids. |
| `get_prerequisites(paper, already_read, max_depth)` | Transitive reading-order ancestors, closest first. Skips `order: false` edges. Each result includes `leads_to`, `relation` and `note`. |

### Candidate tools

Ordered roughly by value for the effort.

| Tool | What it does | Notes |
|---|---|---|
| `get_track(track)` | A track's papers sorted by a topological order of its reading-order edges, falling back to year. Includes each paper's `why_read` and the edges inside the track. | `tracks[].papers` lists members, not an order; the tool has to compute one. Pair it with a `list_tracks()` tool, or fold that in. |
| `what_next(paper, already_read)` | Successors of a paper, with each edge's relation and note. | This is `get_prerequisites` in reverse. It's cheap. |
| `get_tensions(paper)` | `contradicts` and `refines` links in either direction, including `order: false` edges. | This is the content readers can't get from Google Scholar. It's only useful once `relations.yaml` has some of these. |
| `plan_path(goal, already_read, weeks)` | Prerequisites of the goal paper, minus what the reader has read, in topological order, grouped into weeks by `reading_time_minutes`. | This is the "plan 4 weeks to understand Spanner" demo, and it needs the prerequisite gaps filled first. The roast's warning applies: for a catalog of about 100 well-known papers, a hand-written guide may do better. |
| `get_progress()` / `mark_read(paper)` | Read and write the progress the page already stores in localStorage under `readingtracks.progress.v1` (a JSON array of paper ids). | Use the existing key so the page and the agent agree. `app.js` keeps progress in memory (`state.completed`), so `mark_read` needs a small hook in `app.js` to update the page; `storage` events don't fire in the tab that wrote the value. This is the first tool that changes state, so label it in its description. |
| `highlight_path(papers)` | Have the page show a path: switch to the Tracks or Papers view, filter to those ids, and scroll. | This is UI control rather than data, so it needs an entry point in `app.js`, such as `window.readingTracks.showPapers(ids)`. It's the most visible demo and the most tightly coupled to the page. |
| `get_session_kit(paper)` | A Paper Club outline: key claim, what to skip on a first read, discussion prompts, one steelman question. | Its value depends on content written by you, since generated kits become generic. Consider it only once a few kits exist in the data. |
| `find_by_problem(problem)` | Map a problem ("my reads are stale after failover") to papers, using tags and `why_read`. | This could stay as `find_paper` with better descriptions. An embedding index would break the zero-build setup. |

Not planned:

- Debate mode, because of hallucination risk.
- The LLM benchmark, because it would be circular.
- Any tool that writes to the catalog itself; changes to the data go through PRs.

### Testing

- Node unit tests (`node --test tests/webmcp.test.js`) cover the pure functions.
- `?webmcp=stub` installs a fake `document.modelContext`. You can then call
  `await webmcpStub.call("find_paper", {query: "raft"})` from the console.
- With the real API in Chrome:
  1. Enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome.
  2. Serve the site with `python3 -m http.server 8000`.
  3. Run `const tools = await document.modelContext.getTools()`, then
     `await document.modelContext.executeTool(tool, {...})`. Pass an object; JSON
     strings are deprecated from Chrome 155.
  4. Or use DevTools → Application → WebMCP to see the tool list, run tools, and see
     the call log.
- Agents can call the tools through Chrome DevTools MCP started with
  `--categoryExperimentalWebmcp` (it provides `list_webmcp_tools` and
  `execute_webmcp_tool`), or through the Model Context Tool Inspector extension.

### Shipping

- `webmcp.js` is not in `sync_reading_tracks.sh`'s include list. Merging the branch
  as it is would make the live page request a file that isn't there. Add
  `--include='/webmcp.js'` to the sync script before merging.
- The data side (`edges.json`, `llms.txt`) already ships and is useful to agents
  without WebMCP. A regular MCP server over the same `edges.json` could reuse these
  tool definitions for desktop and cloud agents.
- A possible blog post: "WebMCP on a static site: what worked and what didn't."
