# Spec work status

This file is the single source of truth for resuming work on the spec. Keep it current: an
agent or session that has only this file, `plan.md`, and the git history must be able to
continue the work. Last updated: 2026-10-15.

## Working protocol

- **Low parallelism.** Run at most one or two agents at a time and prefer steady progress.
  Delegate mechanical tasks, such as citation checks and test-assertion hunting, to cheaper
  models (Sonnet or Haiku). Keep judgment-heavy editing, such as cross-chapter
  reconciliation and design sections, on Opus.
- **Every task has a checklist on disk** at `spec/.work/<task>.md`. The agent ticks items off
  (`- [x]`) and adds short notes as it goes, so a new agent can resume from the file alone.
  Agent prompts say: *"If the checklist already has ticked items, continue from the first
  unticked one."*
- **Commit early and often.** An agent commits its `spec/` changes after each completed
  checklist item or small group of items, with a message of the form
  `spec(<task>): <what>`. Nothing outside `spec/` is committed by agents.
- **Durable findings.** Anything an agent learns that matters beyond its own task (a
  cross-chapter issue, a suspected bug, a caveat on verification) goes into the relevant
  chapter's *Open questions* section, or into "Cross-chapter findings" below. It never
  lives only in the agent's final report.
- **Tools live in `spec/tools/`** (see its README), not in the temp scratchpad.

## Decisions

- **Wire format is not a compatibility requirement** (the author's input of 2026-09-29). Addons ship template source, not wire format. Chapter 04 is **informative**:
  it documents the current encoding and must contain no conformance requirements. Other
  chapters must not require accepting wire format.
- **Non-goals** (`plan.md`, author's input of 2026-09-30, commit `8b343781b3`; §00-0.1):
  - *AST transforms.* The behavior of Ember's internal transforms is normative; the ASTv1
    shape, the transforms' existence and order, and user AST plugins (`plugins.ast`, babel
    `transforms`/`jsutils`) are not. §02 uses ASTv1 as notation, §02-7 is informative as a
    data structure, and §03-7 states meaning through rewrites.
  - *Addon pre-publication tooling.* The babel `hbs` re-printing (§01-1.5.6, §02-10) is
    outside the primary scope; already-published source must run faithfully (§0.1 "Non-goals",
    §01-1.5.6, §02-10). This reverses the earlier note that the re-printing was part
    of the compatibility surface.
- **Reactivity is spec'd abstractly** (§07-0). The **[Proposed]** reactive core (§07-2.2,
  author's feedback of 2026-10-07, commit `391b17239c`, T14) is `tracked` (root state),
  `cached(fn)` (derived state, RFC 1218, not yet accepted) and `effect(fn, { schedule })`
  (consumption, run and batched by the core), plus the free functions `isValid`, `isConst` and
  `untrack`. `createCache`/`getValue` and `@cached` are compatibility layers over `cached()`.
  The global `onInvalidate` is gone: the renderer and each modifier are effects. Asynchronous
  consumption is not in the core; §07-2.7 shows a library can build it. A prototype with tests
  is in `spec/prototype/reactive/`. §07-2.8 relates it to RFC 957 (`@ember/scheduler`;
  author's question of 2026-10-07, commit `59f71505b9`, T15).
- **Conformance testing rulings** (author, 2026-10-07, commit `5740b4aeb7`, T17; §09-9.8):
  SSR markers are implementation-defined (§05-13 "What is normative"; §05-13.1 and the
  marker-walking of §05-13.2 are informative); [Dev] messages are verbatim; tests move to
  `await settled()` and the app-style form (§09-9.4.3); the suite stays in this repo, and a
  feature flag selects the implementation; fake Glimmer/Ember stubs of each other are
  eliminated (§09-9.5 C18). Open: which profiles are required (Q2), except that the SSR
  profile is optional for a new implementation (author, 2026-10-10: it needs stabilization;
  rehydration has no stable public API, only the private `_renderMode` boot option, and
  `renderComponent` cannot serialize or rehydrate; §09-9.2, §05-13).
- **Author rulings of 2026-10-08** (commit `eb4f794d62`, on questions from W2; W2-9):
  - *Dynamic scope.* Any key other than `outletState` is a [Dev] runtime assertion, with Ember's
    messages verbatim. Implementations are encouraged to implement dynamic scope generally, as
    Glimmer does, but must keep the assertion until a context RFC allows general-purpose dynamic
    scope; the general mechanism is informative (§05-5.8, §08-9.6; was §05-14 item 17).
  - *Owner of a curried component.* `create` gets the invoking owner (a component curried in the
    app and rendered in a mounted engine is created with the engine instance), while the layout
    gets the curried owner. A compatibility quirk that is normative, because apps were built
    against Ember, not the Glimmer test suite (§06-2.2, §05-7.8, §08-8.6; was §06-12 Q3 and
    §05-14 item 3).
  - *Top-level `this`.* The conformance adapter has no `renderTemplate`; tests that need a
    top-level `this` use `renderComponent` with a custom component manager (public API), or are
    refactored to plain `renderComponent` (§09-9.4.2; was §09-9.8 Q7).
  - *Serialize is non-interactive,* as in Ember under FastBoot: no modifier runs during a server
    render (§05-13, §09-9.4.2; was §09-9.8 Q8).
- **Author rulings of 2026-10-13** (on §02-11, feedback commits `8dd43f4d83`, `1871c6cf4a`):
  - *Error priority is not specified.* For a template with several errors, an implementation may
    report any of them (§02-9.1). §02-1.1 then had three HTML-blind properties, not four (none
    since T25: parsing is HTML-first).
  - *Inverse section with `{{else}}`* (`{{^foo}}a{{else}}b{{/foo}}`) is outside the spec: the
    existing implementation keeps it, a new one SHOULD NOT accept it (§02-3.3). Superseded by the
    deprecation of 2026-10-14 below.
  - *Planned upstream work*: T20 (literal mustache with arguments becomes an error), T21 (audit
    the Handlebars leftovers: remove what Ember cannot use, test the rest as legacy), T22
    (blocks that straddle markup become parse errors).
- **Author rulings of 2026-10-14** (deprecations):
  - *Handlebars leftovers (T21).* `{{&foo}}`, `{{^}}`, `{{^foo}}…{{else}}…{{/foo}}` and raw blocks
    go through a full deprecation cycle (ids in §02-11 item 15, until 8.0.0). They are marked
    **[Deprecated]** (new marker in CONVENTIONS and §0.5): the current implementation keeps them
    for now; a new implementation SHOULD NOT include them and SHOULD reject them as syntax errors
    (§02-2.7, §02-3.2, §02-3.3, §0.1).
  - *Blocks that straddle markup (T22).* Not landing now; probably a longer deprecation cycle.
    The T22 branch is parked. Superseded in the spec by the rulings of 2026-10-15 below.
- **Author rulings of 2026-10-15** (feedback commit `03c77f86b4`, T24):
  - *The current implementation can be out of spec.* Backward compatibility is key, but case by
    case the spec may rule that the current implementation is the one that is wrong. How and
    when it is brought into line (a fix, a deprecation cycle, timing of RFCs and guides) is out
    of scope for the spec, so the spec is never blocked on it. **[Out of spec]** now means the
    spec states the required behavior and the current implementation does not conform
    (CONVENTIONS, §0.5). Every such place is listed in §00-0.5.1; keep that table current.
  - *HTML-first parsing* (T25; clarified by the author in conversation after T24: not a comment
    exception but an architecture change). The HTML tokenizer has priority everywhere: its state
    decides whether `{{` begins a construct (§02-1.1 table: construct in text states and a start
    tag's attribute list, comment text in comments, error elsewhere). The old "HTML-blind
    Handlebars side" is gone. Every compatibility issue is listed and resolved in §02-1.4, with
    corpus impact from `tools/html-first-impact.mjs` (28,786 templates): comments (0), straddling
    blocks (0), whitespace control in tags (errors only), escapes splitting text nodes (41, DOM
    text-node count only), `<pre>`/`<textarea>` newline after constructs (7, whitespace the
    author wrote reappears). All five are **[Out of spec]** for the current implementation
    (§00-0.5.1). The state-by-state choices are §02-11 item 19, for the author to confirm.
  - *Blocks that straddle markup* in a tag or attribute value are errors E49/E50 (§02-1.1
    property 3, §02-6.11). *Literal mustache with arguments* is error E48 (§02-3.7). Both
    **[Out of spec]** for the current implementation.
  - *T21 timing* (pushing the RFC and the guides) is out of scope.
  - *Numeric character references* (T26) decode as in HTML: astral code points are kept whole,
    0x80–0x9F are remapped through the Windows-1252 table, and NUL, surrogates and values above
    U+10FFFF become U+FFFD (§02-6.3). The current `String.fromCharCode` decoding is a bug and
    **[Out of spec]** (§00-0.5.1, §02-11 item 6). Corpus impact, from `tools/char-ref-impact.mjs`
    over the same 28,786 templates: 61 use a numeric reference, and none changes meaning. Still
    open for the author: whether a reference with no `;` should also follow HTML.
- **No dependent tracking** (author ruling, 2026-10-07). The model stays built around cheap
  revalidation without reverse edges: the core may schedule effects that are not stale, and
  filters them with `isValid` at flush time, so `fn` runs only when a dependency changed
  (§07-2.2.5 item 4, §07-2.3, §07-2.8 item 4). Changing that architecture is out of scope.
- **Loose mode and classic components are in scope,** marked **[Loose mode]** or **[Legacy]**.
- **Author rulings of 2026-09-30** (commit `a135fe1862`):
  - `</template>` cannot appear in a content-tag body, by design: the content tag assumes no
    interior syntax (§01-1.2.2 rule 2).
  - The legacy vs stage-3 `@tracked` timing difference is accepted and is orthogonal to the
    renderer (§07-3.1.4).
  - Private `@glimmer/validator` APIs: shim them if cheap; otherwise the main users must
    migrate (§07-2.6).
  - The 7.1 built-ins (`eq`, `and`, `element`, …) are strict-only on purpose; loose mode gains
    no new features (§08-1.2).
  - Modifier destruction order must not differ between development and production; the
    production (child-first) order is correct for both (2026-09-30, after T9b).
  - Loose mode stays as stable as possible while it is phased out: the silent `{{foo}}` is
    kept (2026-09-30, commit `fa282f6d78`; §08-5.1).
  - Upstream fixes were requested for the parser `TypeError` crashes (§0.7.2 (parser crashes)), the
    content-tag indentation panic (§01-1.11 item 7), and `@tracked accessor` not dirtying the
    object-level cell (§07-3.1.5). Their branches are listed under "Upstream fix branches".
- **Suspected bugs are recorded, not "fixed" in the spec.** Each goes in its chapter's
  *Open questions* section, for the reader to decide whether to preserve it.

## Upstream fix branches

Fixes requested by the author during review. The spec branch has `origin/main` merged in at
`a7fc67e74b` (upstream base `a9501d5d40`, 2026-10-12; earlier merges at `def1faa2cf`, base
`9bec1cb2a8`, and `98fa794473`, base `675744ab35`), so the landed fixes below are in this
checkout, and the spec's citations are against `a9501d5d40` (T18). Branches still open for
review are based on `9bec1cb2a8`.

| Spec item | Repo | Branch | State | Summary |
|---|---|---|---|---|
| §0.7.2 (parser crashes) | ember.js | `fix/parser-typeerror-crashes` | **Landed on main** (emberjs/ember.js#21635, merge `e1d334284e`) | Syntax errors for inverse sections without `{{else}}`, hash literals, sub-expression-rooted paths, mustaches or comments in end tags, and mustaches in markup declarations. Handlebars syntax in any HTML-comment state becomes comment text. `<div /{{x}}>` treats the stray `/` as HTML does (ignored). `{{#each-in}}` with no params is a syntax error. |
| §01-1.11 item 7 | content-tag | `fix-multibyte-indentation-panic` | **Shipped in content-tag 4.2.1** (embroider-build/content-tag#134) | `strip_indent` counts only ASCII spaces and tabs as indentation. |
| §07-3.1.5 | ember.js | `fix/tracked-accessor-object-tag` | **Landed on main** (emberjs/ember.js#21636) | The `@tracked accessor` setter also dirties the object-level cell. Test in the stable-decorator smoke tests. |
| §05-11.3 | ember.js | `fix/modifier-destruction-order` | **Landed on main** (emberjs/ember.js#21639) | With the debug render tree on, modifiers are now destroyed child-first, as in production (author ruling, 2026-09-30). |
| §08-14 Q2 | ember.js | `test/outlet-inside-component` | **PR open**: emberjs/ember.js#21640 (test only) | Tests showing that `{{outlet}}` inside a component stopped rendering with the route manager merge (`4b5d79a6d7d1b`). No fix yet. |
| §08-2.20 | ember.js | `cleanup/remove-action-keyword` | **Landed on main** (emberjs/ember.js#21641) | `action` is no longer a syntax keyword, a strict-mode keyword, or rewritten by `transform-action-syntax`. |
| §05-14 item 12 | ember.js | `fix/triple-curly-literals-and-keywords` | Open for review | String literals and append keywords (`if`, `unless`, `helper`, …) honour `{{{…}}}`. |
| §05-14 item 1 | ember.js | `fix/namespaced-attribute-updates` | Open for review | Updates of a namespaced attribute keep its namespace after removal. |
| §05-14 item 6 | ember.js | `fix/svg-inside-foreign-object` | Open for review | `<svg>`/`<math>` inside `<foreignObject>` get their own namespace. |
| §02-11 item 1 | ember.js | `fix/literal-mustache-arguments` | Local, not pushed (T20); the spec no longer waits on it (§02-3.7 E48, 2026-10-15) | `{{"foo" bar}}` is a syntax error instead of dropping the arguments. |
| §02-11 item 15 | ember.js | `test/handlebars-legacy-features` | Local, not pushed (T21) | Tests only: parser and rendering tests for `{{&}}`, `{{^}}`, `{{^foo}}…{{else}}` and raw blocks, designated as inherited from Handlebars (legacy behavior). These features are now deprecated; the deprecations themselves are not implemented yet. |
| §02-11 item 15 | deprecation-app, rfcs | `deprecate-legacy-handlebars-syntax` | Local, not pushed (T21) | Four deprecation guides (`46ae444`) and the deprecation RFC (`66fbfd71`). |
| §02-11 item 17 | ember.js | `fix/blocks-straddling-markup` | **Parked** (T22, author 2026-10-14) | `{{else}}`/closer inside a tag is an error; `{{else}}` inside an HTML comment from the block is comment text; a closer there is an error. Not landing now: a longer deprecation cycle comes first. The spec differs for a closer in a comment (comment text, so the block is unclosed) and goes further: all mustache syntax in a comment is comment text (§02-6.7). |
| §05-14 item 13 | ember.js | `proposal/duplicate-attributes-and-arguments-are-errors` | **PR open**: emberjs/ember.js#21718 | Duplicate attributes and named arguments become compile errors; the PR description is the full explainer. |
| §02-11 item 6 | ember.js | `fix-numeric-char-refs` | **PR open**: emberjs/ember.js#21728 (T26) | `@glimmer/syntax` supplies its own `EntityParser` that decodes numeric references as HTML does (§02-6.3). |
| §02-11 item 6 | simple-html-tokenizer | `fix-numeric-char-refs` | **PR open**: emberjs/simple-html-tokenizer#115 (T26) | The same fix upstream, using native `String.fromCodePoint`; labelled `breaking`, to be released as a new major so Ember apps pick it up only through an Ember release. |

When a branch is merged, update the owning item to describe the new behavior. Done for the two
that have landed (T7, `.work/T6-feedback-8b34378.md`): §02-3.3, §02-3.8, §02-6.7, §02-6.9–6.11,
§02-9, §03-7.6, §01-1.2.4 and §01-1.11 item 7 now
describe the fixed behavior. The content-tag citations point at `src/transform.rs` as released
in 4.2.1 (identical to the `fix-multibyte-indentation-panic` branch checked out beside this
repo).

## Chapters

| Chapter | Lines | State | Verification |
|---|---|---|---|
| 00 overview | ~350 | Drafted. §0.1 and §0.2 were updated for the wire-format decision and the non-goals (T6). §0.6 matches this table. §0.7 (consolidated open questions) written by T2b; pruned to 31 open items by T12. | — |
| 01 authoring formats | ~1220 | Drafted | From source. T3 hand-checked every flagged citation; one unsupported claim (§01-1.9) was rewritten. T9a ran the babel plugin (`wire`, `hbs`) and the runtime `template()` against §01-1.11 items 1–3, §01-1.4 and §01-1.5.6 (all confirmed; `.work/T9a-compile-paths.md`). |
| 02 syntax | ~1600 | Drafted. T19 restated the parsing model as one scan (§02-1.1); the current two-pass parser is an implementation note (§02-1.5). T24/T25: parsing is HTML-first (§02-1.1); its compatibility issues and their resolutions are §02-1.4, all **[Out of spec]** for the current implementation, as is the literal-mustache error E48. T26: numeric character references decode as in HTML (§02-6.3), **[Out of spec]** as well. | Edge cases were run through the built `@glimmer/syntax` (more than 200 probes, plus about 40 for T19). |
| 03 static semantics | ~1300 | Drafted | Many claims were compiled against `dist/dev`. T9a ran §03-10 items 1, 12–14 through the babel plugin and the runtime `template()` path (all confirmed). Other §03 claims still have only compiler-level checks. |
| 04 wire format | ~1560 | Drafted; recast as informative (T1 done). | All examples are real compiler output. |
| 05 runtime semantics | ~2210 | Drafted | From source. Attribute and SSR/rehydration behavior is test-cited. T4 added test citations for `each`, `in-element`, `yield`/blocks, modifier ordering, classic lifecycle hooks and destruction order. Claims with no test are marked "(untested)" and gathered in §05-14 item 14. `each` sync step sequences are asserted only in `LOCAL_DEBUG` builds. T9b ran throwaway browser tests for the public-manager component ordering across a tree, component-hook vs modifier-install order, update ordering, deferred destructors and modifier destruction: all confirmed except modifier destruction order, which is creation order (not child-first) when the debug render tree is on (Ember DEBUG default) (§05-11.3; since fixed, #21639). None of these have upstream tests. |
| 06 managers | ~1470 | Drafted | From source. Citations verified by T3. |
| 07 reactivity | ~1490 | Drafted | From source. Citations verified by T3. |
| 08 Ember integration | ~1890 | Drafted | Compile-output claims were checked against `dist/dev`. |
| 09 conformance testing | ~400 | Drafted (T16), informative | From two surveys of the test suite (`.work/T16-harness.md`, `.work/T16-coupling.md`; grep and sampling) and `tools/test-coverage.py`. |

All `§NN-x.y` cross-references resolve (`python3 spec/tools/xref.py`). All file:line citations
exist and are in range (`python3 spec/tools/check-citations.py`), and T3 checked that the NEAR/MISS ones point at the construct named.

All planned tasks (T1–T5) are done. Every chapter is a complete draft that has had a
consistency pass, citation verification and a final CONVENTIONS read-through. None of it has
been reviewed by the plan's author yet.

## Task queue

Run these in order, one at a time.

| ID | Task | Model | Checklist | State |
|---|---|---|---|---|
| T1 | Recast 04 as informative and remove wire-compat requirements from other chapters | Sonnet | `.work/T1-wire-informative.md` | done |
| T2 | Cross-chapter consistency pass | Opus | `.work/T2-consistency.md` | done |
| T3 | Citation verification (ranges, then whether cited lines contain the claim), 06 and 07 first | Sonnet | `.work/T3-citations.md` | done; unsupported claims are listed under "Unsupported claims" in `.work/T3-citations.md` (2 items) |
| T4 | Find test assertions for 05's source-only areas and cite them, or record them as untested | Sonnet | `.work/T4-ch05-tests.md` | done; untested claims are §05-14 item 14 |
| T2b | Consolidated open questions in §00-0.7 | Opus | `.work/T2b-open-questions.md` | done |
| T5 | Final read-through: CONVENTIONS compliance, markers, `[Dev]` tags, a tidy STATUS | Opus | `.work/T5-final.md` | done; markers and normative-language fixes, §0.4/§0.6 wording, 41 cross-references spot-checked (1 fixed) |
| T6 | Author feedback `8b343781b3`: `hbs` re-printing and AST transforms are non-goals | Opus | `.work/T6-feedback-8b34378.md` | done; §00-0.1 "Non-goals", §02 uses ASTv1 as notation, §02-7/§02-10/§01-1.5.6/§01-1.5.7 informative, §03-7 states meaning through rewrites |
| T7 | Rewrite the owning items for the landed parser and content-tag fixes | Opus | `.work/T6-feedback-8b34378.md` | done |
| T8 | Citation refresh after merging `main` (`7364f4b36d`) | Sonnet | `.work/T8-citations.md` | done; ≈70 citations renumbered; one behavior change (lazy plain-array iteration, #21598) written into §05-5.4.1 |
| T9a | Run the babel plugin and runtime `template()` against §01/§03 claims | Sonnet | `.work/T9a-compile-paths.md` | done; 8 items, all confirmed |
| T9b | Throwaway browser tests for the orderings in §05-14 item 14 | Sonnet | `.work/T9b-orderings.md` | done; 5 confirmed, 1 corrected (modifier destruction order depends on the debug render tree) |
| T10 | Hand-check every §-cross-reference | Sonnet | `.work/T10-xrefs.md` | done; 1,054 checked, 0 wrong; every "item N"/"QN" reference resolves to an existing item |
| T11 | Author feedback `fa282f6d78` (Q1 ruling, outlet regression test, `action` cleanup) | Opus | `.work/T11-feedback-fa282f6.md` | done |
| T12 | The ten notes swept into `8e838d47cd`; four bugfix/proposal branches; open-question cleanup | Opus | `.work/T12-cleanup.md` | done; resolved items removed from every list, lists renumbered and references rewritten (`tools/prune-open-questions.py`) |
| T13 | Merge `origin/main` (`98fa794473`: #21636, #21639, #21641) and follow up | Opus | — | done; 68 citations shifted with `tools/remap-citations.py`, the "after this checkout's base" notes rewritten against the new code |
| T14 | Author feedback `391b17239c` on the reactive API: `cached()` as the derived primitive, a core `effect`, async exploration | Opus | `.work/T14-reactive-api.md` | done; §07-2 rewritten, prototype + 31 tests, review points §07-5 items 14–19 |
| T15 | Author feedback `59f71505b9`: relate the core to RFC 957 (scheduler) | Opus | `.work/T15-scheduler-rfc.md` | done; new §07-2.8, §07-5 items 14, 17 updated, 3 strategy tests |
| T16 | Author request: a testing chapter (refactors for an alternate implementation, coverage gaps) | Opus + 2 Sonnet surveys | `.work/T16-conformance-testing.md` | done; §09, `tools/test-coverage.py`; work plan W0–W9 and open questions Q1–Q6 in §9.7–9.8 |
| T17 | Merge of `origin/main` (`def1faa2cf`, base `9bec1cb2a8`) and the §09 rulings (`5740b4aeb7`) | Opus + 2 Sonnet | `.work/T17-merge-and-09-rulings.md` | done; 122 citations remapped, 44 FLAGs and about 184 moved-test citations fixed by hand; TrackedValue, renderer root release, `get`, `{{on}}` prose; §09 rulings, post-merge counts, app-style target form, C18 fake stubs (`.work/T17-fake-stubs.md`); §05-13 markers informative |
| W2 | §09-9.7 W2: eliminate the fake Ember/Glimmer stubs in the Glimmer harness, then the delegate refactor (C1, C2, C6, C18), including the follow-ups to the rulings of `eb4f794d62` (W2-9) | Sonnet per step; Opus for the API, ledger review and exit check | `.work/W2-glimmer-harness.md`, `.work/W2-coverage-ledger.md` | done and **landed upstream** as ten PRs, emberjs/ember.js#21676–#21679, #21684, #21692, #21695, #21702, #21703, #21709 (last merge `11cd0007d2`, 2026-10-12). No fake stubs left (C18 table empty); every removed test has a twin in the ledger. The PR branches, the `test/w2-glimmer-harness` branch and the `../ember.js-w2` worktree are deleted locally |
| T18 | Merge of `origin/main` (`a7fc67e74b`, base `a9501d5d40`, includes all of W2): citation remap and the post-W2 refresh (Next steps item 6) | Sonnet (remap, FLAGs), Opus (prose) | `.work/T18-merge-w2-landed.md` | done; 142 citations remapped, 26 FLAGs and about 100 moved or deleted test spans fixed by hand (deleted tests now cite their Ember twins); W2 tests cited on `main` (§05-7.6, §06-2.2, §08-6.1, §08-6.6); §05-14 item 12 resolved (the yield and has-block suites now run under angle brackets); §09 harness description and counts; behavior changes written in: render-error cleanup is development-only (new §05-14 item 15, upstream PR #21634), `transform-resolutions` in production (§03-7.11), `@dependentKeyCompat` read fix and computed-macro deprecation (§07-3.6.5, §07-3.6.7). Two claims lost their only test and are now marked untested: the compiler `keywords` option (§01, §03) and `insertBefore=<node>` (§05) |
| T19 | Author question: can §02 be a single-pass parser (HTML tokenizer with mustache states) instead of Handlebars-then-HTML layering? | Opus | `.work/T19-single-pass-parser.md` | done; yes. Compatibility does not preclude it, but four HTML-blind properties must hold (§02-1.1): Handlebars lexing, whitespace control, block structure, and error priority. §02-1 rewritten (model, rationale §02-1.4, implementation note §02-1.5), §02-6.1 is the scan, §02-6.11 states the block-straddling rule, §02-9.1 the error priority. §02-5.3 corrected: a closer's standalone check uses the *first* inverse. New §02-11 open questions on block straddling, error priority and the `else if` standalone quirk. Author feedback (`1871c6cf4a`) applied: error priority relaxed, out-of-spec marker, T20–T22 planned |
| T20 | Upstream PR: a literal mustache with arguments (`{{"foo" bar}}`) becomes an error instead of dropping them (§02-11 item 1) | Opus (decision), Sonnet (PR) | `.work/T20-literal-mustache-params.md` | code done on local branch `fix/literal-mustache-arguments` (worktree `../ember.js-t20`, `985c4f5a0e`): error right away (author, `036d98ba70`); full suite green; corpus of 28,770 templates, none newly rejected; PR description drafted in the checklist. Not pushed. The spec states the error without waiting for it (T24, E48); landing it is outside the spec |
| T21 | Audit the Handlebars leftovers (§02-11 item 15): prove which Ember cannot use, remove those from the parser, add legacy-designated tests for the rest | Sonnet (experiments), Opus (case for removal) | `.work/T21-handlebars-leftovers.md` | steps 1–4 done: every feature is usable, so nothing is removed. Only F1 `{{&}}`, F2 `{{^}}`, F3 `{{^foo}}…{{else}}` and F5 raw blocks are inherited legacy; `foo/bar`, escapes and whitespace control are tested Ember features (author, 2026-10-14). 18 legacy-designated tests on local branch `test/handlebars-legacy-features` (worktree `../ember.js-t21`, `4b96a37a2c`, `8aea3f031a`, on `origin/main` `c02a9ee118`). Not pushed. Steps 5–7 done (2026-10-14): deprecation guides (deprecation-app `46ae444`), deprecation RFC (rfcs `66fbfd71`), spec marks all four **[Deprecated]**. Not pushed. Next: implement the deprecations in Ember (template-compiler plugin, as `deprecate-render` was) once the RFC is accepted. When to push the RFC and guides is outside the spec (author, 2026-10-15) |
| T22 | Upstream PR: blocks whose `{{else}}` or closer is inside a tag or HTML comment become parse errors, with tests and the no-sane-template-breaks argument (§02-11 item 17) | Opus | `.work/T22-straddling-blocks-errors.md` | code done on local branch `fix/blocks-straddling-markup` (worktree `../ember.js-t22`, `1fc261a10e`) with option (b) for `{{else}}` (author, `036d98ba70`); complexity and its limit in the checklist; full suite green; corpus of 28,770 templates, none changed; PR description drafted. **Parked** (author, 2026-10-14): not landing now; probably a longer deprecation cycle. Since T24 the spec makes these errors in tags and comment text in comments, **[Out of spec]** for the current implementation (§02-6.11); the deprecation id, `until` and timing are outside the spec |
| T23 | Rendering tests for `{{else …}}` chains (split from T21; no rendering test exists) | Sonnet | `.work/T23-else-chain-rendering.md` | planned; seed tests from T21 in the checklist |
| T24 | Author feedback `03c77f86b4`: the current implementation can be out of spec; mustache syntax in HTML comments is comment text; T20 and T22 rules stated as errors; T21 timing out of scope | Opus | `.work/T24-out-of-spec-feedback.md` | done; [Out of spec] redefined, §00-0.5.1 lists every place, §02-1.1/1.4/6.7/6.11/3.7, E48–E50, §02-11 items 1, 17, 19 |
| T25 | Author follow-up to T24: HTML-first parsing everywhere, compatibility issues enumerated and resolved | Opus | `.work/T25-html-first.md` | done; §02-1.1 rewritten (state table), §02-1.4 is the issue list with corpus impact, §02-2.2, §02-5, §02-6.1, §02-6.2, §02-6.8, §02-11 items 7, 19; §00-0.5.1 rows |
| T26 | Author ruling: numeric character references that decode differently from HTML are a bug; the spec follows HTML (§02-11 item 6) | Opus | none (done in one session) | done; §02-6.3 states the HTML rule with the current behavior **[Out of spec]**, §02-11 item 6, §00-0.5.1 row, §00-0.7.1 item 4; corpus impact none (`tools/char-ref-impact.mjs`); fixes open as emberjs/ember.js#21728 and emberjs/simple-html-tokenizer#115 |

## Cross-chapter findings (from chapter authors' reports)

The 21 findings from the chapter authors were all reconciled by T2 and removed from this list.
`.work/T2-consistency.md` records, for each one, which chapter now owns it and what changed.
Where the code did not settle a question, it is an *Open questions* item in the owning chapter.
New cross-cutting notes from T2:

1. **`xref.py` only checks that a target exists, not that it is the right one.** T2 found six
   `§05-12` references (Errors) that meant `§05-11` (Destruction). T5 spot-checked 41 and
   fixed one; T10 then checked all 1,054 by eye with `tools/xref-context.py` and found none
   wrong. Re-run that check after large edits.
2. **Ownership conventions introduced by T2.** Each duplicated rule now has one owner, and the
   other chapters cite it. The main owners are: commit-phase order §06-11; destroy algorithm
   §06-10.2; destruction order §05-11; component-region skipping §05-1.6; element parameter
   order §05-4.1; triple-curly text rule §05-3.5 item 6; lexical-scope timing §01-1.8.5;
   auto-import rewrite §03-7.1; loose free names §03-5.3 (static) and §08-5 (runtime);
   `trackLocals` bug §03-10 item 12; `hbs` round trip §01-1.5.6. Duplicate open
   questions were merged into one item, and the others now say "Recorded as …". T2b should
   collect from the owners.
3. **Several fixes came from the source, not from the chapters.** These were: classic
   `willDestroy` runs in the `actions` queue (§08-6.7); `style="a {{x}}"` does trigger the
   style warning (§08-10.6); `type` is applied *last*, which is why range inputs clamp
   (§05-4.5.2); roots added during a render are rendered in a later runtime transaction
   (§07-1.10 item 5); and `-get-dynamic-var`/`-with-dynamic-vars` are no longer emitted by
   Ember (§05-5.8). T3 and T4 should not "restore" the older wording.

## Notable suspected bugs (for §0.7)

These are collected from the chapters' open-questions sections. T2b wrote the curated version
into §00-0.7.

- **Parser.** Some inputs crash with a `TypeError` instead of a syntax error:
  `{{^foo}}…{{/foo}}`, `{{foo=bar}}`, `{{(foo).bar}}`, `</div {{x}}>`, `<div /{{x}}>`,
  `<!--{{x}}-->`, `{{#each-in}}` with no params. Some input is silently dropped: `a < b`
  becomes `"a "`, and an unterminated tag or comment at EOF disappears. `&#128512;` decodes
  wrongly.
- **Static semantics.**
  - `action`, `mut`, `readonly` and `unbound` can't be shadowed in strict mode on the babel
    path, but can on the runtime path.
  - A strict `<x.y/>` with `x` unbound becomes an element.
  - `{{#let v as |this|}}` rebinds `this`.
  - `{{"foo" 1}}` drops its arguments, and `{{#in-element}}` drops its `{{else}}` block.
- **Authoring.** The runtime `template()` honours only `strictMode`, while babel `hbs`
  honours only `strict`. Runtime implicit scope misses locals that are `undefined`, that
  shadow globals, or are `this`.
- **Runtime DOM.**
  - A namespaced attribute loses its namespace after being removed and set again (untested).
  - `false` in a merged `class` becomes the class `"false"`.
  - An `<svg>` inside `<foreignObject>` is created in the HTML namespace.
  - SSR `in-element` never clears its destination.
  - The `each` `key=` value is read only once.
  - `{{this.str 1}}` on a primitive silently renders nothing.
  - After a render error, production builds neither close open blocks nor reset tracking (T18,
    §05-14 item 15; upstream PR #21634).
- **Managers.**
  - The dev-only `willDestroy` capability check never fires (`'string' in d`).
  - `disableAutoTracking: true` means `updateModifier` never runs.
  - A curried dynamic helper re-prepends its positional arguments.
  - In production, `Object.isExtensible(args.named)` throws.
- **Reactivity.**
  - `trackedArray`'s per-index cells never narrow invalidation.
  - `trackedObject` breaks `instanceof`.
  - `getValue` after a throw returns a stale value.
- **Found during T2.**
  - Duplicate named arguments: a component's layout `@a` sees the first occurrence, while its
    manager's `args` sees the last (§05-7.3, from source).
  - Duplicate attributes: `class` is merged only when the element has modifiers or
    `...attributes`, and a duplicate `type` keeps only the last occurrence (§05-4.9).
  - `{{{"<b>"}}}` and `{{{if c x}}}`/`{{{helper h}}}` render text (§05-3.5 item 6).
  - The babel `hbs` target loses `\{{` escapes, raw blocks and bracketed segments (§01-1.5.6;
    outside the primary scope since `8b343781b3`).
  - `-track-array` is applied twice (harmless, §03-7.8).
- **Wire format (informative).** There is no version marker, and Ember 5.9–6.3 blocks are
  misread silently. Not a requirement now; keep it as a note only.

## Next steps

Suggestions for the plan's author, based on what is still open:

1. **Decide the remaining "preserve or change" items in §00-0.7.1** (item 1 is resolved).
   The most urgent is the `strict`/`strictMode` option split (item 2; T9a confirmed all three
   behaviors). Each decision changes normative text in the owning chapter.
2. **Review the rebuilt [Proposed] reactive core** (§07-2.2, §07-2.7; review points §07-5
   items 14–19, summarized in §00-0.7.10). Only chapter 07 uses it. If it is accepted, other
   chapters could state update rules with it directly.
3. **Rule on the suspected bugs** in §00-0.7.2–0.7.8, deciding for each whether a new
   implementation must keep it. The babel-vs-runtime differences (§0.7.4) are confirmed by
   running both paths (T9a).
4. **Upstream the ordering experiments?** T9b's throwaway tests pinned orderings that Ember's
   suite does not test; `.work/T9b-orderings.md` "Upstream candidates" lists the ones worth
   turning into real tests.
5. **Remaining verification gaps.** §05-14 item 14 still lists the `each`, `in-element` and
   `yield`/block claims with no test. Most of §01 and §03 beyond the T9a items is checked only
   against source and `dist/dev`.
6. **Conformance suite (§09).** Answer §09-9.8 Q2 (W0, the last open one), then run the
   workstreams of §09-9.7. W3 (Ember harness to the app-style form) is under way upstream by
   other contributors: 16 files use `setupRenderingTest` at `a9501d5d40` (§09-9.3 item 6), so a
   W3 task here should first agree with them which files to take. W1 and W4–W9 wait on Q2 or on
   other workstreams. **W2 has landed upstream** (ten PRs, last
   #21709, 2026-10-12) and is merged into this branch. The landed code differs from the old
   `test/w2-glimmer-harness` branch (owner types, PR 4 rebuilt to keep the Curly and Dynamic kinds
   on a real `@glimmer/component`, no plain mode in PR 6, review fixes), so `origin/main` is the
   reference; `.work/W2-glimmer-harness.md` has the history (step 10 onward) and
   `.work/W2-coverage-ledger.md` the twin of every removed test. The spec follow-up (citations,
   §09) was T18.
   Pre-existing oddity, not changed by W2: the `owner-test.ts` test "owner can be changed by a
   component with the hasSubOwner capability" asserts `owner1` inside the `owner2` sub-owner, so
   its name and its assertion disagree.
   The remote branch `test/w2-glimmer-harness` still exists on `origin` (emberjs/ember.js) at
   `8939c50aff`; it is superseded and can be deleted.
7. **Keep citations current.** Line numbers are accurate for this checkout (`origin/main`
   merged at `a7fc67e74b`, upstream base `a9501d5d40`). After the next merge, run
   `python3 spec/tools/remap-citations.py a9501d5d40 <new base> --apply` once, fix its FLAG lines
   by hand, then run `check-citations.py` and check the prose against what the merge changed
   (`git diff a9501d5d40 <new base> -- packages`), as T8, T13, T17 and T18 did. The tool follows
   hunks only: it mis-shifts citations to files that were moved or split (T17 and T18 re-derived
   the test citations by matching unique source lines of the old file against the new files), so
   re-check every citation to a test file that `git diff -M --stat` shows as moved. Neither
   `remap-citations.py` nor `check-citations.py` sees bare continuation spans (`` `573-595` ``
   after a citation, with no file name); check those by hand. `check-citations.py` always reads
   `/Users/edward/hacking/ember.js`, whatever the working directory, so it cannot check an older
   tree from a second worktree.
