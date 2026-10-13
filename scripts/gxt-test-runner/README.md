# GXT test runner

A Playwright + QUnit runner for the Ember.js GXT test pages (compat
`index.html` and gxt-native `native.html`).

## Design rules

1. **`QUnit.on('runEnd', ...)` (or `QUnit.done`) is the only completion
   signal.** No stuck-detection. Hangs are recorded as timeouts and never
   enter the baseline.
2. **Per-module isolation.** Every module runs in its own browser context.
3. **Deterministic ordering.** Modules are sorted lexicographically, sharding
   uses a stable SHA-1 bucket on the module name.
4. **Retries at the QUnit level.** `--retries` controls how many additional
   attempts QUnit gives a failing test. Mixed outcomes are quarantined, never
   counted as passing.
5. **Structured outputs.** `test-results/gxt-summary.json` (compact, for
   baseline) + `test-results/gxt-last-run.json` (verbose diagnostics).

## Prerequisites

The runner talks to a running Vite dev server with `GXT_MODE=true`. Start
one in another terminal:

```bash
GXT_MODE=true pnpm vite --port 5180
```

Or pass `--auto-serve` and the runner will spawn it for you and tear it down
on exit.

## Common commands

### Smoke run (14 modules, ~2 min)

```bash
node scripts/gxt-test-runner/runner.mjs --smoke
```

Expected on the session baseline: 333/333 tests, 2365/2365 assertions across
14 modules. The runner reports both counts on the summary line; failures in
either dimension gate the run.

### Full run

```bash
node scripts/gxt-test-runner/runner.mjs --full
```

### Filter by name

```bash
node scripts/gxt-test-runner/runner.mjs --filter "Syntax test:"
```

### Sharded run (for CI parallelism)

```bash
# Shard 2 of 4 — run only ~1/4 of matching modules
node scripts/gxt-test-runner/runner.mjs --smoke --shard 2/4
```

### Baseline gating

```bash
node scripts/gxt-test-runner/runner.mjs --full \
  --baseline test-results/gxt-baseline.json
```

The runner prints `baseline ok` or `BASELINE REGRESSION: N` (the tests that
were passing in the baseline and are failing now, green -> red). Its exit code
is 1 whenever any test fails, the baseline's known reds included; for a
pass/fail verdict on a baseline run use `baseline-gate.mjs` (see CI below).
Add `--allow <category>` on `diff.mjs` for known gaps.

### Standalone diff

```bash
node scripts/gxt-test-runner/diff.mjs \
  test-results/gxt-baseline.json \
  test-results/gxt-summary.json \
  --allow gxt:rehydration-delegate
```

## Updating the baseline

1. Run `runner.mjs --full` on a clean working tree.
2. Inspect `test-results/gxt-summary.json`.
3. Copy the file into the repo baseline:

```bash
cp test-results/gxt-summary.json test-results/gxt-baseline.json
git add test-results/gxt-baseline.json
```

4. Commit with a message that references the runner version and the SHA of
   the run.

## CI

- `.github/workflows/gxt-smoke.yml` — runs on every PR, 4 shards, required
  check. Should finish in under 5 minutes. Each shard is gated by
  `baseline-gate.mjs --subset` against `test-results/gxt-baseline.json`: only
  the shard's modules are compared (a smoke module missing from the page is a
  runner exit 3).
- `.github/workflows/gxt-full.yml` — nightly, compares against
  `test-results/gxt-baseline.json`, files an issue on regression.
- `.github/workflows/gxt-native.yml` — every PR: the native suite
  (`--url http://localhost:5181/native.html`, `EMBER_RENDER_BACKEND=gxt-native`)
  against `test-results/native-baseline.json`. The runner exits 1 on any
  failing test, known reds included, so the job's verdict comes from
  `baseline-gate.mjs`: no green->red test, no baseline module missing, no
  timeout or harness error.

```bash
status=0
node scripts/gxt-test-runner/runner.mjs … --baseline <file> || status=$?
node scripts/gxt-test-runner/baseline-gate.mjs --baseline <file> --runner-exit "$status"
```

## Exit codes

| code | meaning                                           |
| ---- | ------------------------------------------------- |
| 0    | clean run (no regressions if baseline)            |
| 1    | at least one hard failure / green->red regression |
| 2    | at least one module timed out                     |
| 3    | harness error (server down, browser launch, etc.) |

## Schema

See [baseline-schema.md](./baseline-schema.md).
