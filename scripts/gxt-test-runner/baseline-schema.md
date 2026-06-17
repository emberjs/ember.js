# GXT baseline JSON schema

The GXT test runner emits two artifacts per run into `test-results/`:

- `gxt-summary.json` — compact per-module and per-failing-test record. This is
  the **baseline format** used for regression gating.
- `gxt-last-run.json` — verbose artifact with per-test assertion messages,
  timeouts, and harness-error traces. Not consumed by the baseline diff.

Only `gxt-summary.json` is checked into baselines and compared by `diff.mjs`.

## Top-level shape

```json
{
  "meta": {
    "runner": "scripts/gxt-test-runner/runner.mjs@v1",
    "capturedAt": "2026-04-13T18:22:04.112Z",
    "gxtVersion": "0.0.53",
    "emberCommit": "8928ee9e2a",
    "totalTests": 44213,
    "totalAssertions": 128934,
    "totalAssertionsPassing": 128012,
    "totalModules": 612,
    "quarantinedTests": 4
  },
  "modules": {
    "Components test: curly components": {
      "total": 120,
      "passing": 120,
      "assertionsTotal": 412,
      "assertionsPassing": 412,
      "failingTests": []
    },
    "rehydration: basic": {
      "total": 310,
      "passing": 48,
      "assertionsTotal": 1201,
      "assertionsPassing": 812,
      "failingTests": [
        {
          "name": "renders content-less void element",
          "category": "gxt:rehydration-delegate"
        }
      ]
    }
  },
  "categories": {
    "gxt:triage": 850,
    "gxt:rehydration-delegate": 393,
    "gxt:upstream-bug": 0
  }
}
```

## Field reference

### `meta`

| field              | type    | notes                                              |
| ------------------ | ------- | -------------------------------------------------- |
| `runner`           | string  | runner identity + version tag                      |
| `capturedAt`       | string  | ISO-8601 timestamp                                 |
| `gxtVersion`       | string  | `@lifeart/gxt` version pulled from `packages/demo` |
| `emberCommit`      | string  | short git SHA of ember.js at capture time          |
| `totalTests`       | integer | sum of `modules.*.total`                           |
| `totalModules`     | integer | count of modules that completed                    |
| `quarantinedTests` | integer | count of tests with mixed retry outcomes           |

### `modules`

Keys are QUnit module names (from `QUnit.config.modules[].name`). Values:

| field               | type    | notes                                                      |
| ------------------- | ------- | ---------------------------------------------------------- |
| `total`             | integer | number of tests emitted by the module (post-retry dedup)   |
| `passing`           | integer | `total - failingTests.length` (quarantined counts as fail) |
| `assertionsTotal`   | integer | QUnit `stats.all` (cumulative across retries)              |
| `assertionsPassing` | integer | `assertionsTotal - stats.bad`                              |
| `failingTests`      | array   | one entry per **final-failing** test (see below)           |

Passing modules have `failingTests: []`.

### `modules.*.failingTests[]`

Per-test record for failing tests only. Deliberately minimal:

| field      | type   | notes                                                    |
| ---------- | ------ | -------------------------------------------------------- |
| `name`     | string | `QUnit.testDone` test name (not prefixed with module)    |
| `category` | string | triage bucket (default `gxt:triage`, see categorize.mjs) |

No error messages, no stack traces, no source links — that keeps the baseline
small (roughly 3k failing entries fit in ~200 KB). Detail goes to
`gxt-last-run.json`.

### `categories`

Rollup of `failingTests[*].category`. The runner writes every observed
category; unused categories in `diff.mjs --allow` lists are silently ignored.

## Retry semantics

QUnit-level retries are handled by `QUnit.config.testTimeout` + a local retry
loop built around `QUnit.testDone`. For a given test:

- All `outcomes` are `pass` → counted as passing, not recorded.
- All `outcomes` are `fail` → recorded in `failingTests` (hard fail).
- Mixed → recorded in `failingTests` AND counted in `meta.quarantinedTests`.
  Mixed-outcome tests never count as passing.

## Completion semantics

The runner only trusts `QUnit.on('runEnd', ...)` (falling back to
`QUnit.done` for legacy) as the signal that a module finished. A module that
does not emit `runEnd` within `--module-timeout` (default 300 s) is recorded
as a timeout in `gxt-last-run.json` and does **not** appear in
`gxt-summary.json.modules`. This is by design: partial counts must never
contaminate the baseline.
