# Memory benchmarks (V8)

Measure how much heap ember-source allocates and keeps for common render work.
The scripts run in Node with [happy-dom](https://github.com/capricorn86/happy-dom) as the DOM, and [mitata](https://github.com/evanwashere/mitata) does the measurement.

## Compare two builds

1. Build each ember-source checkout: `pnpm build` in its root.
2. Run the compare script with the "before" checkout first:

   ```sh
   node compare.js ~/code/ember.js-main ~/code/ember.js-my-branch
   ```

The script runs each bench once per checkout and prints a Markdown table.

## Run one script

```sh
node if-toggle.js
```

Without `EMBER_SOURCE`, a script uses the ember-source of this workspace.
To use another build, set `EMBER_SOURCE` to an ember-source checkout with a built `dist/`:

```sh
EMBER_SOURCE=~/code/ember.js-main node if-toggle.js
```

Add `--json` to print one line of JSON instead of text.

## What the numbers mean

- "allocated" is the heap that one iteration allocates. mitata runs a full GC before each iteration and reads `used_heap_size` before and after it. A smaller number means less GC work.
- "retained" is the heap growth per iteration over 2000 iterations, after a full GC. A number near zero means that the work keeps nothing alive. A number that grows with the iteration count is a leak.
- "time" is the median time of one iteration. It is only a rough guide here. Use `pnpm bench` in the repo root for render speed.

The scripts use the production build (`dist/prod`), so DEBUG-only code does not change the result.

## Scripts

- `if-toggle.js`: `{{#if}}` blocks that change branch.
- `each.js`: `{{#each}}` lists that gain, lose and replace items.
- `initial-render.js`: a first render and its destruction. No block renders again here, so this is the control.

Each iteration must leave the app as it found it, so that the iterations can repeat. Add a new script with `measure(name, fn)` and `runBenches()` from `lib/bench.js`.
