# v2-app-gxt-template

A minimal Ember app shaped the way a **consumer of the GXT-backend
`ember-source` build (`ember-source-gxt`)** builds and boots — the Tier-2
runtime vehicle for the consumable-package work (see
`docs-internal-gxt-packaging-design.md` and
`rfcs/text/0000-gxt-dual-backend.md`).

## How it differs from `v2-app-template`

| | v2-app-template (classic) | this template (GXT) |
| --- | --- | --- |
| ember-source | classic build | `dist-gxt-package/` (`node scripts/build-gxt-package.mjs`) |
| build pipeline | `@embroider/vite` `classicEmberSupport()` + `ember()` | `@lifeart/gxt/compiler` + a ~40-line `ember-source-resolver` vite plugin (see `vite.config.mjs`) |
| template compilation | build-time wire-format (`babel-plugin-ember-template-compilation`) | **both**: `.gjs`/`.gts` `<template>` compiled at BUILD time by the GXT compiler (`app/components/counter.gjs`), route templates compiled at RUNTIME through the GXT `@ember/template-compilation` shim (`app/templates/application.js`) |
| babel | template + decorator transforms | only what the GXT compiler runs internally over `.gjs` (`decorator-transforms`, whose output `vite.config.mjs` makes import `decorator-transforms/runtime`, as an Embroider app's babel config does); plain app modules need none |

The Embroider template pipeline and GXT's compiler are mutually exclusive
(RFC §5.5), so this template demonstrates the supported non-Embroider path:
bare `@ember/*` / `@glimmer/*` imports resolve straight into the prebuilt
`ember-source` dist via the package `exports` map, and route templates are
authored as `precompileTemplate('...')` modules compiled in the browser by
`@lifeart/gxt/runtime-compiler`.

## Running it

```bash
# from the repo root
node scripts/build-gxt-package.mjs          # assemble dist-gxt-package/
cd smoke-tests/v2-app-gxt-template
# point ember-source at the assembled package (the gxt-boot smoke scenario
# does this automatically via scenario-tester):
rm node_modules/ember-source && ln -s ../../../dist-gxt-package node_modules/ember-source
npx vite          # dev server
npx vite build && npx vite preview   # production build
```

The app renders an application route template with a counter; the `+1`
button exercises `{{on "click"}}` → classic `set()` → GXT cell reactivity.
`<Counter />` is a BUILD-TIME-compiled `.gjs` component resolved by name
from the owner registry (the strict resolver's `./components/*.gjs` glob);
its `@count`/`@increment` args prove reactivity flows across the
runtime↔build-time boundary in both directions. `<ForwardedLink>`, another
build-time `.gjs` component, proves the invocation's attributes and
`{{on}}` modifier reach its element through `...attributes`, with a bound
`javascript:` URL sanitized as Glimmer does, and that its block renders
with the yielded block param. `<ClassCounter>` is a `.gjs` component class
(`@glimmer/component`) whose template is a class-body `<template>`: its
component manager creates it with `this.args`, and its template renders its
own field and `@count`, kept current in place. `<TrackedCounter>` is a `.gjs`
component class written with decorators (`@tracked`, `@action`, `@service`):
the GXT compiler lowers them with decorator-transforms, and the
`importsDecoratorRuntime` step in `vite.config.mjs` makes the compiled module
import `decorator-transforms/runtime` (the app lists `decorator-transforms`),
so no `dt7948` global is needed.

CI coverage: `smoke-tests/scenarios/gxt-boot-test.ts` (build + headless boot
+ click reactivity over both pipelines), matrix name
`emberSourceGxt-gxt-boot`.
