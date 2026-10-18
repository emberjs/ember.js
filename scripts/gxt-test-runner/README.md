# GXT test runner

A Playwright + QUnit runner for the Ember.js GXT test pages (compat
`index.html` and gxt-native `native.html`).

## Design rules

1. **`QUnit.on('runEnd', ...)` (or `QUnit.done`) is the only completion
   signal.** No stuck-detection. Hangs are recorded as timeouts and never
   enter the baseline.
2. **Per-module isolation.** One browser and one tab run every module, one
   at a time. Each module loads the test page anew (`?module=<name>`), so it
   runs in a fresh document and JS realm, and the runner clears the page's
   web storage after it. The tab is replaced when a module times out or its
   page fails, and every 50 modules to bound the renderer's memory.
3. **Deterministic ordering.** Modules are sorted lexicographically; shard
   N of M runs every Mth module of the sorted list, starting at the Nth.
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

The smoke modules (`smoke-modules.json`) hold 277 tests and 1,814 assertions.
Five tests of `Components test: curly components` are known reds in
`test-results/gxt-baseline.json`, so a run on the baseline reports 272/277
tests and 1,809/1,814 assertions. The runner prints both counts on its summary
line; see [Baseline gating](#baseline-gating) for the verdict.

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

Merge the shards of one run (one directory per shard, each holding that
shard's `gxt-summary.json` and `gxt-last-run.json`) into the two files an
unsharded run writes, e.g. to gate the whole suite or to regenerate a
baseline:

```bash
node scripts/gxt-test-runner/merge-runs.mjs --shards 4 --out-dir test-results \
  shard-1 shard-2 shard-3 shard-4
```

`merge-runs.mjs` fails when a shard is missing, when the shards ran
different code or when a module ran in two shards.

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
  `test-results/gxt-baseline.json`, files an issue on regression. Runs in 5
  shards (`--full --shard i/5`, each gated with `--subset`); the
  `GXT full suite` job merges them with `merge-runs.mjs`, gates the merged run
  without `--subset` (so every baseline module must have run in some shard),
  and uploads the merged files as `gxt-full-run` / `gxt-candidate-baseline`.
- `.github/workflows/gxt-native.yml` — every PR: the native suite
  (`--url http://localhost:5181/native.html`, `EMBER_RENDER_BACKEND=gxt-native`)
  against `test-results/native-baseline.json`, in 4 shards merged the same way
  by the `gxt-native test suite` job (artifact `gxt-native-suite`). The runner
  exits 1 on any failing test, known reds included, so the job's verdict comes
  from `baseline-gate.mjs`: no green->red test, no baseline module missing, no
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
