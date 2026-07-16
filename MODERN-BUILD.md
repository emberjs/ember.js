# The Modern Build Variant

ember-source ships a second build of itself containing only modern (Octane
and later) patterns. The classic object model — `EmberObject`, `Mixin`,
computed properties, observers-as-public-API, `ArrayProxy`/`ObjectProxy`,
`EmberArray`, `Evented` — and classic (curly) components are absent from its
module graph entirely, enforced by `bin/assert-modern-dist.mjs` in CI.

## Opting in

The variant is published inside the regular `ember-source` package under the
`ember-modern` export condition, resolving to `dist/modern/{dev,prod}`. In an
Embroider + Vite app:

```js
// vite.config.mjs
import { defineConfig, defaultClientConditions } from 'vite';

export default defineConfig({
  resolve: {
    conditions: ['ember-modern', ...defaultClientConditions],
  },
  // ...
});
```

`smoke-tests/v2-app-modern-template` is a working example.

## Build sections and custom variants

Legacy code is organized into sections, each controlled by a flag in
`@ember/legacy-features`:

| Flag                      | Covers                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `CLASSIC_OBJECT_MODEL`    | EmberObject, Mixin, computed, observers as public API, array/object proxies, EmberArray, Evented |
| `CLASSIC_COMPONENTS`      | classic (curly) components and the EventDispatcher (requires `CLASSIC_OBJECT_MODEL`)             |
| `CONTROLLER_QUERY_PARAMS` | controllers and the controller-based query params system                                         |

Each flag owns three coordinated levers in `rollup.config.mjs` (see
`legacySections()`): debug-macro folding for inline branches, module swaps
that substitute modern implementations at resolve time, and entrypoint
prunes. The published variants are **standard** (all flags on) and **modern**
(all off except `CONTROLLER_QUERY_PARAMS`, which stays until a Route
Manager-based query params replacement exists — see
[RFC #1169](https://github.com/emberjs/rfcs/blob/master/text/1169-route-manager-api.md)).
Other combinations can be built locally:

```sh
EMBER_LEGACY_FLAGS="CLASSIC_COMPONENTS=false" pnpm build:js  # -> dist/custom
```

## What breaks, and what to do instead

All breaks are limited to legacy imports; idiomatic Octane code runs
unchanged. Breaking changes are intended to be codemoddable:

| Removed                                                     | Replacement / codemod                                                                                                                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EmberObject`, `.extend()`, `.create()`, `Mixin`            | Native classes; [ember-native-class-codemod](https://github.com/ember-codemods/ember-native-class-codemod)                                                                    |
| `computed()` / `@computed` and macros                       | Native getters, `@cached`; simple cases codemod cleanly, macros need manual conversion                                                                                        |
| Observers                                                   | `@tracked` state + getters, or render modifiers; detection is automatable, conversion is not                                                                                  |
| `ArrayProxy` / `ObjectProxy` / `A()`                        | [tracked-built-ins](https://github.com/tracked-tools/tracked-built-ins) for simple cases; `unknownProperty`/`objectAt` overrides need redesign                                |
| Classic components                                          | Glimmer components; [ember-angle-brackets-codemod](https://github.com/ember-codemods/ember-angle-brackets-codemod) plus manual `tagName`/lifecycle-hook → modifier conversion |
| `this.get()` / `this.set()` on framework objects            | Imported `get`/`set` from `@ember/object` (still available), or plain access for tracked state                                                                                |
| `owner.lookup('data-adapter:main')`, classic inspector glue | Not available; `@embroider/legacy-inspector-support` is incompatible with the variant                                                                                         |
| Overriding `init()` without `super.init(...arguments)`      | Call super; the framework-object contract now applies to Router, Route, Locations, etc.                                                                                       |

Kept deliberately, even in the modern build: `action`, `get`/`set`/
`getProperties`/`setProperties`/`notifyPropertyChange` (they work on plain
and tracked objects and are widely used by tooling), `Input`/`Textarea`/
`LinkTo` (implemented on the modern internal-component base), class-based
`Helper`, and controllers with query params (gated for later removal).

## Known limitations

- `@ember/test-helpers` currently calls `EmberObject.extend` at module scope
  in its mock-owner support (`dist/-internal/build-registry.js`), which
  breaks dev/test builds of modern-variant apps until that load is made lazy
  upstream. Production app builds are unaffected.
- ember-inspector support is degraded: the `DataAdapter` and the classic
  inspector glue depend on the classic object model.
- `ControllerMixin`, `cacheFor`, and other classic exports simply do not
  exist in the variant's modules; imports of them fail at build time.

## Verifying changes against the variant

- `node bin/assert-modern-dist.mjs` — asserts no classic modules in
  `dist/modern/prod` (run after `pnpm build:js`).
- `pnpm test:modern` — runs the curated test suite (see `index-modern.html`)
  against the variant's module swaps. Grow its globs as suites become clean
  of classic patterns in their test code.
- `smoke-tests/v2-app-modern-template` — a real Embroider/Vite app consuming
  the variant.
