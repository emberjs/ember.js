# GXT integration plan — expert review synthesis

Four independent Opus-class reviews of `GXT_INTEGRATION_PLAN.md` at
commit `1ac83deec8`. Full reports at:

- `/tmp/gxt-plan-review-domain.md` — Ember ecosystem / RFC / addons
- `/tmp/gxt-plan-review-bundling.md` — Rollup/Vite/DCE/publishing
- `/tmp/gxt-plan-review-qa.md` — test gate / flakiness / CI infra
- `/tmp/gxt-ssr-exploration.md` — SSR + rehydration (plan was wrong)

## Summary verdict

**Approve Phases 0–1 now. Block Phases 2–5 on revisions.** All four
reviewers converged on the same meta-finding: the architectural
instinct is right, but the plan materially under-specifies its
hardest parts (consumer UX, build pipeline, QA gate, SemVer contract,
FastBoot bridging), and one claim (rehydration gap) is factually
wrong.

## What the plan got right

All four reviewers agreed on:

- **Adapter seam at the `@glimmer/*` boundary** is the correct cut.
- **Two separate dist packages**, not runtime branching in one bundle.
- **Upstream-first posture** for GXT fixes (keeps Ember from silently
  forking).
- **Appendix B's explicit upstream dependency list** is the right
  discipline.

## Critical corrections required

### 🔴 1. The SSR/rehydration claim is factually wrong (SSR reviewer)

The plan says "GXT has no rehydration path. This is ... the biggest
remaining architectural gap." That is **false**.

GXT has a full SSR + rehydration subsystem:
- `/Users/lifeart/Repos/glimmer-next/src/server.ts` — server entry
- `src/core/ssr/ssr.ts` — `render(url)` using `happy-dom`
- `src/core/ssr/rehydration.ts` (223 lines) — counter-based
  alignment with `data-node-id="N"` + `$[N]` comment markers
- `rehydration.test.ts` — 992 lines, 52 tests
- `package.json` has `dev:ssr` and `build:server` targets
- README advertises both features

**The real gap is FastBoot pipeline mismatch**, not missing
rehydration:
- FastBoot uses SimpleDOM + Glimmer VM opcode-driven rehydration
- GXT uses happy-dom + counter markers
- These don't interoperate on shared HTML without a bridge
- **Estimate**: 2-4 weeks (not multi-month)

**The 393 `[integration] rehydration ::` failures are misdiagnosed**.
That test suite drives Glimmer VM's `RehydrationDelegate` directly
via SimpleDOM + `@glimmer/node`. GXT isn't plugged into
`EvaluationContext` at all. These failures don't indicate a GXT
capability gap — they indicate a missing GXT-flavored delegate (one
file, not 393 fixes).

**Plan edits**:
- Replace Phase 4.4 text (lines 245-249) with "FastBoot pipeline
  mismatch" framing (exact replacement text in
  `/tmp/gxt-ssr-exploration.md` section 8)
- Remove "no SSR rehydration" from Phase 5.3 unsupported features
- Remove "rehydration piece alone is multi-week" from work-back
  schedule
- Add to Phase 4: "write GXT-flavored `RehydrationDelegate` for
  the existing integration test suite" (one-file task, unblocks
  393 test failures)

### 🔴 2. The Phase 2 adapter seam as written won't work (bundling reviewer)

The plan's `impl.ts` barrel + "tiny rewriter plugin" is ambiguous
between three distinct strategies:

1. **Resolver-alias** (what Vite does today under `GXT_MODE`) —
   non-selected impl never enters the graph
2. **Compile-time constant + DCE** — both impls enter the graph,
   DCE removes one
3. **Package.json conditional exports** — subpath + condition

Option 2 (what the plan implies) is **blocked by**:
- `@glimmer/global-context`, `@glimmer/runtime`, `@glimmer/manager`
  have module-scope side effects
- Vendored `packages/@glimmer/*` lacks `sideEffects: false` declarations
- The classic build would regress under DCE

**Recommendation**: use resolver-alias strategy in Rollup (matches
current Vite approach), delete the `impl.ts` barrel step entirely.
The seam becomes "alias `@glimmer/runtime` → classic or GXT dir" at
the bundler-resolver level. No new runtime package needed; the
`render-backend` package becomes an optional type-only shim.

### 🔴 3. Blast radius is ~2× the plan's scope (bundling reviewer)

Actual `@glimmer/*` import count across `packages/@ember/`:
- **390 import statements** across ~120 production files
- **93 type-only imports** (erased at build but need typecheck paths)

Phase 2 step 4 targets only `-internals/glimmer/lib/` (51 files).
**Missing**: `packages/@ember/-internals/metal/lib/` (**19 files**,
reactivity hot path). `tracked.ts`, `computed.ts`, `alias.ts`,
`observer.ts`, `property_get.ts`, `property_set.ts`, `tags.ts`,
`cached.ts`, `chain-tags.ts` all make runtime calls into
`@glimmer/validator` and `@glimmer/manager`. These are not render-
layer adapters — they're the reactivity core.

**Subpackage heat**:
```
validator 48, interfaces 42, reference 40, component 26,
tracking 25, manager 22, runtime 18, syntax 15, destroyable 11
```

**Plan edit**: Phase 2 step 4 must include `-internals/metal/lib/`.
Estimate adjustment: ~3 weeks mechanical import audit, not 2-3.

### 🔴 4. The 0.5% pass-rate floor is the wrong gate (QA reviewer)

On 44k tests, a `baseline − 0.5%` threshold allows ~220 silent
regressions per PR and drifts monotonically downward. It hides
localized catastrophic breakage inside statistical noise.

**Recommendation**: replace with **per-test diff gate**:
```
gate_failures = failing_now \ failing_baseline
```
Any test that was green and is now red fails the PR. Monotonic
ratchet (baseline can only improve, manual file-change to regress).
This is how Chromium WPT, Servo, and rust-lang/rust's compiletest
work.

**Plus**: per-category floors (rendering-core, components, helpers,
rehydration, glimmer-jit) with explicit allowlists for known gaps.

### 🔴 5. The existing runner produces unreliable numbers (QA reviewer)

`/Users/lifeart/Repos/ember.js/run-gxt-tests.mjs` lines 37-47 use a
"30s stuck → return partial count" heuristic. This is the exact
source of the in-session false "8/13" vs real "25/25" report.

**No gate built on top of this runner can be trusted.** Must be
replaced before Phase 0 can deliver a meaningful baseline.

### 🟡 6. Consumer install UX is blank (domain reviewer)

Plan stops at "subpath export". How does an app actually pick GXT?
- `ember install ember-source-gxt`?
- `ember-cli-build.js` flag?
- `package.json` override?

Missing: a one-command install experience like
`npx ember-cli-gxt enable` that rewrites package resolution AND
validates no installed addon is on the classic-only list.

### 🟡 7. Embroider strict mode will break the current approach (domain reviewer)

The compat layer's Vite aliases will not work under Embroider
strict mode (v2 addons, @embroider/core stage-3). Most modern Ember
apps use this — which means the GXT dist is DOA for exactly the
apps most likely to want a smaller runtime.

**Plan edit**: Phase 2 must produce a *built* `ember-source-gxt`
package (not alias-based), whose `exports` already point at the
GXT-compiled sources. The dev-time Vite alias is a transition
artifact only.

### 🟡 8. `@glimmer/component` disposition is unresolved (all 3 reviewers)

`@glimmer/component` is a separate npm package that every modern
Ember app imports directly. Its `setComponentTemplate` call and
`@tracked` field semantics live in `@glimmer/*` land, not the
adapter seam.

Risk: **symbol-identity duplication** — two copies of `Tag`,
`createTag`, `CURRENT_TAG`, `getCustomTagFor` co-exist if an
`ember-source-gxt` consumer also installs `@glimmer/component`.
Every major framework refactor that ignored this has bled for months
(React's dual renderer, Ember's own Glimmer 1→2).

**Options**:
1. Ship `@ember/-internals/gxt-backend` with a `@glimmer/component`-
   shaped export, and publish `@glimmer/component-gxt` sibling
2. Negotiate with Glimmer team to extract `@glimmer/component`
   into a protocol package

Must be resolved before Phase 3 ships.

## Under-weighted risks

### A. SemVer contract is unwritten

The plan asserts "same semantics" but the ~1350 failing tests in
the e2e baseline are *definitionally* observable differences.
"Effectively parity" at 96.4% vs 96.7% is 0.3 percentage points —
which on Ember's suite is hundreds of real assertions.

**Recommendation**: declare `ember-source-gxt` as "preview /
not-covered-by-SemVer" until pass parity hits 100% on the same
test suite classic ships.

### B. Addon blast radius is not quantified

Top-10 addon reality check missing from the plan:
- `ember-power-select` — heavy `{{component}}` curry + `{{yield}}`
  to hash. **High risk**, must validate
- `ember-paper` — legacy, many custom managers. Assume classic-only
- `ember-cli-htmlbars` — build-time template compiler. Needs a GXT
  template-compiler shim to even build. **Not optional. Not in plan.**
- `ember-render-modifiers` — modifier manager. Must be first-class
  test target
- `ember-data`, `ember-intl`, `ember-simple-auth`, `ember-cli-mirage`,
  `ember-concurrency` — each needs an explicit pass

### C. Governance of `@lifeart/gxt` is single-maintainer

Pinning Ember's release train to another project's solo-maintainer
availability is a governance risk the plan's "vendor-fork as
fallback" mitigation doesn't fully address.

**Proper mitigation**: Ember co-owns the GXT repo, or fork-by-default
with upstream sync. Not vendor-as-escape-hatch.

### D. "Promote to default in 7.x" should not be in v1 of the plan

Even mentioning it invites bike-shedding before opt-in ships. Move
this out of v1 entirely.

### E. Debug tooling loss is understated

Ember Inspector's component tree, render-tree tab, and "why did this
re-render" features are how working Ember engineers debug production
apps. "Debug tooling does not work" (Phase 5.3) deserves its own
plan for GXT-native equivalents, not a one-liner.

## Revised phase ordering

The original 5 phases need restructuring. Reviewers jointly proposed:

```
Phase 0   — Inventory & categorized baseline           (1w)
Phase 0.5 — Test-infra hardening (NEW)                 (2w)  ← QA
Phase 0.7 — Addon compat matrix + RFC draft (NEW)      (2w)  ← Domain
Phase 0.9 — Rollup resolver-alias proof of concept (NEW) (1w)  ← Bundling
Phase 1   — Promote compat layer to gxt-backend        (1w)
Phase 2   — Rollup adapter seam + metal coverage       (3w)
Phase 3   — Dual-build CI + smoke/full tier + UX       (2w)
Phase 4   — FastBoot bridging + compat removals        (2-4w)
Phase 5   — RFC merge + preview release + docs         (1-2w)
```

**New total**: 15-19 weeks to opt-in release (was 6-8). The
additional time is entirely the infra and RFC work the original
plan assumed away.

## Proof-of-concept (before Phase 2)

The bundling reviewer proposes a **3-5 day experiment** that
de-risks Phase 2 before committing to it:

1. Add `EMBER_RENDER_BACKEND=gxt` branch to `rollup.config.mjs:255`
   (`exposedDependencies()`)
2. Alias `@glimmer/validator|manager|reference|destroyable|runtime`
   to existing `packages/demo/compat/*.ts` shims
3. Run `pnpm build` on both backends
4. For classic: `diff -r` rollup output against `master` (must be
   zero delta — this is the byte-identity proof)
5. For GXT: confirm `@glimmer/runtime`, `@glimmer/opcode-compiler`,
   `@glimmer/program` are entirely absent from the output

**If it works**: Phase 2 collapses to a 3-week import audit and no
new `render-backend` runtime package is needed.

**If the classic diff is non-zero**: root cause is almost certainly
a side-effect in vendored `@glimmer/*` — a finding that must block
Phase 2 until addressed, learned in a week instead of month 2.

## New deliverables required

From the four reviews, these must be added to the plan:

1. **Validated feature matrix** — every RFC-shipped Ember feature
   marked `pass / fail / untested` on GXT
2. **Addon compatibility matrix** — top-20 addons with pass /
   classic-only / untested status
3. **RFC document** covering the 11 items in the domain review's
   section 4
4. **Production test runner** replacing `run-gxt-tests.mjs` with
   deterministic timeout, structured JSON output, retry, quarantine
5. **Per-test diff baseline tool** — `gxt-diff baseline.json
   last-run.json` CLI
6. **Smoke + full tier split** in CI (target <10 min smoke per PR,
   full nightly)
7. **Contract tests at the adapter seam** — sub-minute feedback on
   upstream GXT regression
8. **Weekly upstream-bump cron job** — auto-bump + test + PR on
   green, file issue on red
9. **`ember-cli-gxt enable` one-command install flow**
10. **GXT-flavored `RehydrationDelegate`** (one file) for the
    existing integration test suite — unblocks 393 test failures
11. **FastBoot DOM-provider abstraction** — upstream PR in glimmer-
    next to replace hard `happy-dom` import with an injected factory
12. **`@glimmer/component-gxt` sibling package** — or negotiate
    protocol-package extraction with Glimmer team
13. **Bundle-size check** via `size-limit` with per-entry budgets
14. **Perf baseline** — initial render, update throughput, memory,
    bundle size, hot-update latency. Nightly + release gate.
15. **Debug inspector parity plan** — GXT component tree for
    Ember Inspector

## Final recommendation

**Merge Phases 0 and 1 as is.** They are internal refactors with
zero consumer-visible surface and zero risk.

**Block Phases 2-5 on**:
1. The bundling POC (3-5 days)
2. An Ember RFC covering the 11 items in the domain review
3. Scoping Phase 0.5 (test infra) as a 2-week block before Phase 1
4. Explicitly correcting the SSR claim and rescoping Phase 4.4

**Revised time-to-opt-in-release**: 15-19 weeks.

**Revised time-to-default-candidate**: remove from plan; re-
evaluate after opt-in ships and runs through one LTS cycle.
