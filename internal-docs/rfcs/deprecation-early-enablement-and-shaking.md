---
stage: draft
start-date: 2026-07-16
release-date:
release-versions:
teams:
  - framework
  - learning
prs:
  accepted:
project-link:
---

# Per-Deprecation Early Enablement and Deprecation Shaking

## Summary

Two connected additions to Ember's deprecation system, building on the staging
model from [RFC 0649](https://rfcs.emberjs.com/id/0649-deprecation-staging/):

1. **Per-deprecation stage configuration.** Apps can turn on individual
   "available"-stage deprecations before they reach the "enabled" stage, and
   can declare *compliance* — making deprecations they have already migrated
   away from throw instead of warn, so they can't creep back in.
2. **Deprecation shaking.** A build-time mechanism to strip deprecated *code
   paths* — not just the warning calls — from an app's bundle, configured
   per-deprecation or by compliance version.

## Motivation

RFC 0649 gave deprecations a two-stage lifecycle: `available` (merged, but off
by default in apps) and `enabled`. In practice the `available` stage is inert
today: `ember-source` ships available-stage deprecations, but an app has no
supported way to see them. The only switch is the internal, all-or-nothing
`EmberENV._ALL_DEPRECATIONS_ENABLED`, which is unusable in real apps — turning
on *every* in-flight deprecation at once produces noise no team can act on.

This blocks a workflow the framework increasingly needs: **merging
deprecations before they are fully approved for enablement**. Deprecating a
large legacy surface (for example, the classic object model) requires landing
deprecation calls incrementally, letting early adopters and app CI opt in
per-deprecation to get signal, and only later flipping each one to `enabled`.
Without per-id opt-in, every deprecation must be born fully enabled, which
makes large deprecation efforts all-or-nothing.

The second gap is on the other end of the lifecycle. Once an app has migrated
off a deprecated API, today it gets nothing back:

- Nothing *prevents backsliding*. RFC 0649 explicitly anticipated letting
  users opt in to deprecations becoming assertions; this RFC specifies that.
- Nothing *removes the code*. The deprecated implementation ships in every
  app bundle until the next Ember major, even for apps that provably don't
  use it (their CI would throw if they did). Both RFC 0649 and
  [RFC 0830](https://rfcs.emberjs.com/id/0830-evolving-embers-major-version-process/)
  name "deprecation shaking" / compiling away deprecated features as intended
  future work; neither specifies it. The old `@ember/deprecated-features`
  package (the "svelte" effort, see
  [RFC PR #512](https://github.com/emberjs/rfcs/pull/512) discussion) was an
  earlier attempt whose build-integration story predates Embroider and
  prebuilt ESM dists.

Compliance-that-throws is what makes shaking safe: a deprecation that throws
when used cannot be depended on, so its implementation can be removed and the
app keeps working.

## Detailed design

### Part 1: `EmberENV.DEPRECATION_STAGES`

A new `EmberENV` key configures deprecation behavior for the app. It is read
once at boot (before any deprecation can fire) and is development-only: in
production builds `deprecate` is already compiled away and this configuration
has no effect.

```ts
interface DeprecationStagesConfig {
  /**
   * Turn on available-stage deprecations early.
   * `true` enables all of them; an array enables specific ids.
   */
  enable?: true | string[];

  /**
   * Compliance declaration: "we do not use any deprecated API that was
   * enabled as of this version of this package." Any deprecation from that
   * package whose `since.enabled` is <= the declared version *throws*
   * instead of warning. A bare string is shorthand for
   * `{ 'ember-source': version }`.
   */
  compliance?: string | Record<string, string>;

  /**
   * Individual deprecation ids that should throw when triggered, regardless
   * of stage. This is how an app locks in migration away from an
   * available-stage deprecation it opted into via `enable`.
   */
  assert?: string[];

  /**
   * Escape hatch: ids exempted from `compliance`/`assert` throwing.
   */
  except?: string[];
}
```

Example `config/environment.js`:

```js
EmberENV: {
  DEPRECATION_STAGES: {
    enable: ['ember-source.classic-object-model'],
    compliance: '6.8.0',
    assert: ['some-migrated.available-stage-id'],
    except: ['deprecation-we-are-still-working-on'],
  },
}
```

Semantics:

- `enable` affects only whether a deprecation *fires* (it flips the
  available-stage suppression off for the listed ids). It composes with the
  existing `since: { available, enabled }` metadata from RFC 0649:
  enabled-stage deprecations always fire; available-stage deprecations fire
  if listed (or `enable: true`).
- Throwing (via `compliance`/`assert`) happens in `deprecate` itself, before
  the handler chain, mirroring the existing behavior of deprecations past
  their `until` version. It therefore applies to *all* deprecations flowing
  through `@ember/debug` — including addon deprecations with their own `for`
  — not only Ember's own.
- Precedence: `except` > `assert` > `compliance`.
- A compliance declaration for a package version newer than the installed
  version is invalid (asserts), mirroring RFC 0649's rule against optimistic
  declarations.
- `_ALL_DEPRECATIONS_ENABLED` becomes an alias for `enable: true` and is
  eventually deprecated itself.

Relationship to existing tools: `registerDeprecationHandler` and
ember-cli-deprecation-workflow continue to control how *warnings* are
reported/silenced. `DEPRECATION_STAGES` controls which deprecations exist at
all for this app (fire early / throw). Workflow files remain the right tool
for triaging warnings; compliance is the tool for locking in finished
migrations.

A private `setDeprecationStagesConfig()` API allows test harnesses to swap
configuration at runtime. It stays private in this RFC: the eventual consumer
is a test-helpers/ember-qunit integration ("run this module with deprecation
X enabled"), and blessing a public shape before that integration exists would
lock in an API nobody has used. A follow-up RFC can promote it once the shape
has proven out — the same path `registerDeprecationHandler` took.

### Part 2: Deprecation shaking

#### Guard convention in ember-source

Every *shakable* deprecation gets a boolean flag constant in
`@ember/deprecated-features`, named identically to its entry in Ember's
internal `DEPRECATIONS` registry:

```ts
// @ember/deprecated-features
/** id: deprecate-comparable-mixin, since: 7.2.0/7.2.0, until: 7.5.0 */
export const DEPRECATE_COMPARABLE_MIXIN = true;
```

Deprecated code paths are guarded by the flag. When the deprecated thing has
a post-removal replacement shape, the deprecation call sits inside the guard
(it is stripped with the code) and the other branch holds the post-removal
behavior:

```ts
import { DEPRECATE_COMPARABLE_MIXIN } from '@ember/deprecated-features';

const Comparable = DEPRECATE_COMPARABLE_MIXIN
  ? Mixin.create({
      init() {
        deprecateUntil(msg, DEPRECATIONS.DEPRECATE_COMPARABLE_MIXIN);
        // ...
      },
      compare: null,
    })
  : undefined; // post-removal shape
```

When the deprecated thing is itself an entrypoint (a deprecated function or
import with no replacement shape), the `deprecateUntil` call instead sits
*before* the guard: it survives shaking as the throwing stub while the
guarded implementation is eliminated:

```ts
export function inject(...args) {
  deprecateUntil(msg, DEPRECATIONS.DEPRECATE_IMPORT_INJECT); // throws when shaken
  if (DEPRECATE_IMPORT_INJECT) {
    return metalInject('service', ...args);
  }
}
```

The registry entry is linked to the flag, so when the flag is `false` the
deprecation reports itself as *removed*: any unguarded reach of the API
throws the same "has been removed" error that shipping past `until` would
produce. This makes shaking a pure size optimization layered on
already-correct runtime semantics — a build in which the flags are `false`
behaves identically whether or not the guarded code was actually stripped.

#### How the flags reach apps

`ember-source`'s published dist keeps the flag module *live* rather than
inlining it: every dist chunk imports the flags from a single emitted
`@ember/deprecated-features` module whose constants are all `true`. Alongside
it, the package publishes `dist/deprecation-flags.json` describing each flag
(`id`, constant name, `since`, `until`).

Apps opt in via a build plugin published as `ember-source/deprecation-shaking`:

```js
// vite.config / ember-cli-build
import { deprecationShaking } from 'ember-source/deprecation-shaking';

deprecationShaking({
  // strip everything with `until` <= this ember-source version
  compliantThrough: '6.8.0',
  // and/or individual flags
  strip: ['deprecate-comparable-mixin'],
  keep: [],
});
```

The plugin replaces the flag module's contents with the computed constants.
The app's bundler then dead-code-eliminates the guarded branches in
production builds. In development the flags are simply `false` at runtime,
which — per the linkage above — yields the exact "removed" behavior, so dev
and prod agree even where a bundler's DCE is conservative.

For those building `ember-source` from source, an
`EMBER_DEPRECATION_FLAGS` environment variable produces a custom dist with
the flags compile-time folded (the guaranteed-DCE path, also used by Ember's
own CI to verify each shakable deprecation actually leaves the bundle).

#### What this asks of deprecation authors

Adding a shakable deprecation means: a `DEPRECATIONS` registry entry, a flag
constant, guards following the convention above, and a bundle-scan marker in
CI. Not every deprecation must be shakable — tiny ones with no meaningful
implementation weight can remain plain runtime deprecations — but
deprecations of substantial subsystems should be.

Deprecations with *dynamic* ids (registry factories like
`DEPRECATE_IMPORT_EMBER`, which mints one id per legacy import name) take a
single flag for the whole family: shaking is a statement about the guarded
implementation, and the family shares one. The existing
`deprecate-import-*-from-ember` family itself is deliberately not flagged —
it is already past its `until` version, so its entire surface throws today
and is deleted at the next major regardless.

## How we teach this

- Each deprecation guide entry gains an "early opt-in" snippet
  (`DEPRECATION_STAGES.enable`) while the deprecation is available-stage, and
  a "lock it in" snippet (`assert`/`compliance`) once migrated.
- The Configuring Ember guide gains a section on `DEPRECATION_STAGES`.
- The CLI/build guides document `ember-source/deprecation-shaking`.
- CONTRIBUTING in ember.js documents the guard convention for deprecation
  authors.

## Drawbacks

- **Flag proliferation**: one constant per shakable deprecation, plus
  registry linkage and scan markers, is real maintenance overhead in
  ember-source.
- **Two sources of truth** (registry entry + flag constant) require a
  conformance test to stay aligned.
- **Bundler-dependent stripping**: app-side shaking relies on the app
  bundler's constant propagation and DCE. Mitigated by the runtime-false
  semantics (correct behavior regardless) and by ember-source CI asserting
  strippability with its own toolchain.
- The externalized flags module is a novel shape in the published dist.

## Alternatives

- **Export-condition build variants** (as used for prebuilt dev/prod): can't
  express per-deprecation choices — the variant space is combinatorial.
- **Publish-time folding only** (the original svelte plan via
  ember-cli-babel): predates prebuilt ESM dists; apps no longer re-transpile
  ember-source, so publish-time folding gives apps no control at all.
- **`@embroider/macros`** (`getGlobalConfig` + `macroCondition`, configured
  via `setConfig`): the ecosystem-standard tool for app-configured build-time
  conditionals, and how ember-data expressed its deprecation flags for years.
  It was not chosen here because:
  - ember-source's published dist would gain a runtime import of
    `@embroider/macros` (today it is dependency-free plain ESM, which
    matters for consumers like the node-side template compiler and any
    non-Ember tooling that imports dist modules directly).
  - Folding only happens inside Embroider pipelines with static config;
    every other consumer needs the macros runtime just to boot, and the
    compile-only `macroCondition` form breaks plain-module consumption
    outright.
  - The externalized-flags-module approach is bundler-agnostic: any
    vite/rollup pipeline can shake, Embroider or not.

  Notably, warp-drive arrived at the same conclusion: it moved off
  `@embroider/macros` to `@warp-drive/build-config`, whose architecture — an
  externalized flags module in the published dist plus an app-side build
  transform assigning the values — is structurally what this RFC proposes.
  A future integration could still layer `setConfig`-style configuration on
  top as sugar over the same flags module.
- **Handler-based compliance** (build throwing on top of
  `registerDeprecationHandler`): works for warnings but cannot make the
  *removed* semantics (throw even in paths that suppress warnings) or feed
  build-time stripping.
- **Per-id-list-only compliance** (no version form): simpler, but loses the
  monotonic "compliant through X" declaration RFC 0649 designed for, where
  upgrading ember-source never silently reduces your protection.

## Unresolved questions

- **Should `compliance` also cover available-stage ids the app opted into
  via `enable`?** The proposed default is no: `compliance` is a statement
  about `since.enabled` — a fact about the package — so its meaning never
  shifts based on another config key. Early adopters lock in available-stage
  migrations explicitly via `assert`. A rejected middle ground is a per-id
  stage value (`enable: { 'some-id': 'assert' }`), which is more expressive
  but grows the API surface before there is demand.
- **Shaken value-exports become `undefined` rather than a build error.** A
  true removal at a major deletes the export and fails the app's build;
  shaking resolves the import to `undefined` (e.g. the `Comparable` mixin).
  The proposed default is to accept this: any code path that goes through
  the deprecation still throws the removal error via the runtime backstop,
  and `undefined` is a faithful rendering of "this API is gone." The
  candidate improvement is build-time: the shaking plugin knows exactly
  which exports it emptied and could warn (or error) when an app module
  imports one. Worth doing if silent `undefined` bites in practice.
- Glimmer VM deprecations use their own override table upstream; wiring them
  into this system is future work.
