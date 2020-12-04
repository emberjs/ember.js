## v0.68.0 (2020-12-04)

#### :boom: Breaking Change
* `@glimmer/benchmark-env`, `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/manager`, `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/util`
  * [#1222](https://github.com/glimmerjs/glimmer-vm/pull/1222) [REFACTOR] Align resolver and internals with strict mode ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/destroyable`, `@glimmer/integration-tests`, `@glimmer/manager`, `@glimmer/owner`, `@glimmer/runtime`
  * [#1221](https://github.com/glimmerjs/glimmer-vm/pull/1221) [REFACTOR] Extract Owner and Destroyables into their own packages ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/benchmark-env`, `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/runtime`
  * [#1215](https://github.com/glimmerjs/glimmer-vm/pull/1215) [REFACTOR] Use constants pool for definitions ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/benchmark-env`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/manager`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/util`
  * [#1213](https://github.com/glimmerjs/glimmer-vm/pull/1213) [REFACTOR] Upstream custom managers, TO managers ([@pzuraq](https://github.com/pzuraq))

#### :bug: Bug Fix
* `@glimmer/compiler`, `@glimmer/integration-tests`
  * [#1218](https://github.com/glimmerjs/glimmer-vm/pull/1218)  Fix splattributes handling of type attribute. [rebased] ([@locks](https://github.com/locks))

#### :house: Internal
* `@glimmer/benchmark-env`
  * [#1220](https://github.com/glimmerjs/glimmer-vm/pull/1220) [BUGFIX] Absorb breakage in benchmark-env instead of benchmark ([@pzuraq](https://github.com/pzuraq))
  * [#1217](https://github.com/glimmerjs/glimmer-vm/pull/1217) Revert "[BREAKING] Update benchmark-env API" ([@pzuraq](https://github.com/pzuraq))
  * [#1216](https://github.com/glimmerjs/glimmer-vm/pull/1216) [BREAKING] Update benchmark-env API ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/integration-tests`
  * [#1214](https://github.com/glimmerjs/glimmer-vm/pull/1214) [REFACTOR] Update tests to match actual Glimmer component API ([@pzuraq](https://github.com/pzuraq))

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Ricardo Mendes ([@locks](https://github.com/locks))

## v0.67.0 (2020-11-24)

#### :boom: Breaking Change
* `@glimmer/compiler`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/syntax`
  * [#1206](https://github.com/glimmerjs/glimmer-vm/pull/1206) [BUGFIX] Ensures keywords and elements can always be shadowed ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/benchmark-env`, `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/encoder`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`
  * [#1171](https://github.com/glimmerjs/glimmer-vm/pull/1171) Refactor resolver for strict ([@pzuraq](https://github.com/pzuraq))

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/runtime`
  * [#1209](https://github.com/glimmerjs/glimmer-vm/pull/1209) Ensure `<output form="some-value">` works properly ([@KrishnaRPatel](https://github.com/KrishnaRPatel))
* `@glimmer/validator`
  * [#1205](https://github.com/glimmerjs/glimmer-vm/pull/1205) Ensure `@tracked` assertion can be made a deprecation. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/syntax`
  * [#1204](https://github.com/glimmerjs/glimmer-vm/pull/1204) Ensure `loc` is populated by `builders.element(...)` ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Krishna Patel ([@KrishnaRPatel](https://github.com/KrishnaRPatel))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v0.66.1 (2020-11-20)

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/runtime`
  * [#1209](https://github.com/glimmerjs/glimmer-vm/pull/1209) Ensure `<output form="some-value">`
 works properly ([@KrishnaRPatel](https://github.com/KrishnaRPatel))

* `@glimmer/validator`
  * [#1205](https://github.com/glimmerjs/glimmer-vm/pull/1205) Ensure `@tracked` assertion can be
made a deprecation. ([@rwjblue](https://github.com/rwjblue))

* `@glimmer/syntax`
  * [#1204](https://github.com/glimmerjs/glimmer-vm/pull/1204) Ensure `loc` is populated by `build
ers.element(...)` ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Krishna Patel ([@KrishnaRPatel](https://github.com/KrishnaRPatel))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))



## v0.66.0 (2020-11-17)

#### :boom: Breaking Change
* `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/local-debug-flags`, `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/validator`, `@glimmer/wire-format`
  * [#1170](https://github.com/glimmerjs/glimmer-vm/pull/1170) Refactor `@glimmer/syntax` and `@glimmer/compiler` to enable future strict mode functionality. ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.65.0 (2020-11-13)

#### :boom: Breaking Change
* `@glimmer/benchmark-env`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/runtime`
  * [#1197](https://github.com/glimmerjs/glimmer-vm/pull/1197) [REFACTOR] Upstreams basic manager infrastructure and types ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.64.0 (2020-11-12)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/validator`
  * [#1192](https://github.com/glimmerjs/glimmer-vm/pull/1192) [REFACTOR] Integrate DebugRenderTree ([@pzuraq](https://github.com/pzuraq))

#### :bug: Bug Fix
* `@glimmer/benchmark-env`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/runtime`
  * [#1189](https://github.com/glimmerjs/glimmer-vm/pull/1189) [UPSTREAM] DebugRenderTree ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.63.5 (2020-11-10)

#### :bug: Bug Fix
* `@glimmer/util`
  * [#1193](https://github.com/glimmerjs/glimmer-vm/pull/1193) [BUGFIX] Use custom symbol whenever native is not present ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.63.4 (2020-11-10)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#1191](https://github.com/glimmerjs/glimmer-vm/pull/1191) [BUGFIX] Exports Owner for IE11 ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.63.3 (2020-11-10)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#1190](https://github.com/glimmerjs/glimmer-vm/pull/1190) [BUGFIX] Exports Owner for IE11 ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.63.2 (2020-11-10)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#1188](https://github.com/glimmerjs/glimmer-vm/pull/1188) [BUGFIX] Upstream ember.js#19253 ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.63.1 (2020-11-10)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#1187](https://github.com/glimmerjs/glimmer-vm/pull/1187) [BUGFIX] Don't strip out setComponentTemplate assertions ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.63.0 (2020-11-09)

#### :boom: Breaking Change
* `@glimmer/benchmark-env`, `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/vm`
  * [#1185](https://github.com/glimmerjs/glimmer-vm/pull/1185) [REFACTOR] Upstreams Owner, simplifies template meta/ownership ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/benchmark-env`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/runtime`
  * [#1184](https://github.com/glimmerjs/glimmer-vm/pull/1184) [REFACTOR] Upstream `setComponentTemplate` ([@pzuraq](https://github.com/pzuraq))

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/opcode-compiler`, `@glimmer/runtime`
  * [#1186](https://github.com/glimmerjs/glimmer-vm/pull/1186) [BUGFIX] Prevent args from being created/evaluated twice ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.62.4 (2020-10-26)

#### :rocket: Enhancement
* `@glimmer/integration-tests`, `@glimmer/runtime`
  * [#1179](https://github.com/glimmerjs/glimmer-vm/pull/1179) Adding support for partial rehydration ([@chiragpat](https://github.com/chiragpat))

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/opcode-compiler`, `@glimmer/runtime`
  * [#1181](https://github.com/glimmerjs/glimmer-vm/pull/1181) [REFACTOR] Combines/refactors Basic and Fragment components ([@pzuraq](https://github.com/pzuraq))

#### :house: Internal
* [#1175](https://github.com/glimmerjs/glimmer-vm/pull/1175) Add `yarn lint` script and stop aliasing `yarn eslint`. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3
- Chirag Patel ([@chiragpat](https://github.com/chiragpat))
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.62.3 (2020-10-14)

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/syntax`
  * [#1174](https://github.com/glimmerjs/glimmer-vm/pull/1174) Update simple-html-tokenizer and use its codemod mode. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.62.2 (2020-10-14)

#### :rocket: Enhancement
* `@glimmer/integration-tests`, `@glimmer/runtime`, `@glimmer/validator`
  * [#1169](https://github.com/glimmerjs/glimmer-vm/pull/1169) [FEAT] Adds better logging for render errors ([@pzuraq](https://github.com/pzuraq))

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#1172](https://github.com/glimmerjs/glimmer-vm/pull/1172) Ensure "pause on uncaught" exceptions pauses in correct location. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.62.1 (2020-09-24)

#### :bug: Bug Fix
* `@glimmer/benchmark-env`, `@glimmer/integration-tests`, `@glimmer/runtime`, `@glimmer/util`
  * [#1162](https://github.com/glimmerjs/glimmer-vm/pull/1162) Simplify `SimpleDOM` casting (allow for proper production mode stripping) ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/benchmark-env`, `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/dom-change-list`, `@glimmer/encoder`, `@glimmer/integration-tests`, `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/vm`, `@glimmer/wire-format`
  * [#1161](https://github.com/glimmerjs/glimmer-vm/pull/1161) [BUGFIX] Pin all package versions ([@pzuraq](https://github.com/pzuraq))

#### :house: Internal
* `@glimmer/syntax`
  * [#1164](https://github.com/glimmerjs/glimmer-vm/pull/1164) Add test confirming parsing + printing `{{#in-element` is safe. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Volodymyr Radchenko ([@rreckonerr](https://github.com/rreckonerr))

## v0.62.0 (2020-09-18)

#### :boom: Breaking Change
* `@glimmer/syntax`
  * [#1160](https://github.com/glimmerjs/glimmer-vm/pull/1160) [REFACTOR] Converts to using @handlebars/parser ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/benchmark-env`, `@glimmer/compiler`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/low-level`, `@glimmer/node`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/validator`
  * [#1154](https://github.com/glimmerjs/glimmer-vm/pull/1154) Upgrade to TypeScript 4.0 ([@wycats](https://github.com/wycats))

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#1155](https://github.com/glimmerjs/glimmer-vm/pull/1155) Ensure `protocolForUrl` works in `fastboot@3.1.0` environment ([@rwjblue](https://github.com/rwjblue))

#### :house: Internal
* [#1156](https://github.com/glimmerjs/glimmer-vm/pull/1156) Update PerformanceCheck CI run to fetch full git history. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Yehuda Katz ([@wycats](https://github.com/wycats))


## v0.61.2 (2020-09-02)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#1155](https://github.com/glimmerjs/glimmer-vm/pull/1155) Ensure `protocolForUrl` works in `fastboot@3.1.0` environment ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.61.1 (2020-09-02)

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/runtime`
  * [#1152](https://github.com/glimmerjs/glimmer-vm/pull/1152) [BUGFIX] Prevent accidental dynamic component lookup ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.61.0 (2020-09-02)

#### :boom: Breaking Change
* `@glimmer/benchmark-env`, `@glimmer/bundle-compiler`, `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/vm`
  * [#1148](https://github.com/glimmerjs/glimmer-vm/pull/1148) [REFACTOR] Removes AoT mode ([@pzuraq](https://github.com/pzuraq))

#### :house: Internal
* Other
  * [#1151](https://github.com/glimmerjs/glimmer-vm/pull/1151) Ensure version numbers are bumped for benchmark and local-linker. ([@rwjblue](https://github.com/rwjblue))
  * [#1147](https://github.com/glimmerjs/glimmer-vm/pull/1147) GH Actions Workflow cleanup ([@krisselden](https://github.com/krisselden))
* `@glimmer/benchmark-env`, `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/dom-change-list`, `@glimmer/integration-tests`, `@glimmer/low-level`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/validator`, `@glimmer/wire-format`
  * [#1146](https://github.com/glimmerjs/glimmer-vm/pull/1146) Update Prettier to 2.1 ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Kris Selden ([@krisselden](https://github.com/krisselden))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.60.0 (2020-08-27)

#### :boom: Breaking Change
* `@glimmer/benchmark-env`, `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/util`, `@glimmer/validator`, `@glimmer/vm`
  * [#1142](https://github.com/glimmerjs/glimmer-vm/pull/1142) [REFACTOR] Monomorphic Reference ([@pzuraq](https://github.com/pzuraq))

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Kris Selden ([@krisselden](https://github.com/krisselden))

## v0.59.0 (2020-08-22)

#### :boom: Breaking Change
* `@glimmer/benchmark-env`, `@glimmer/global-context`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/validator`
  * [#1138](https://github.com/glimmerjs/glimmer-vm/pull/1138) [REFACTOR] Extract environment variables into global context ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/benchmark-env`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/validator`
  * [#1139](https://github.com/glimmerjs/glimmer-vm/pull/1139) Add Benchmark Interface ([@krisselden](https://github.com/krisselden))

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Kris Selden ([@krisselden](https://github.com/krisselden))


## v0.58.0 (2020-08-19)

#### :boom: Breaking Change
* `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/reference`, `@glimmer/runtime`
  * [#1135](https://github.com/glimmerjs/glimmer-vm/pull/1135) [REFACTOR] Simplify CapturedArguments ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/runtime`
  * [#1136](https://github.com/glimmerjs/glimmer-vm/pull/1136) [CLEANUP] Consolidate Scope classes ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.57.2 (2020-08-19)

#### :bug: Bug Fix
* `@glimmer/validator`
  * [#1134](https://github.com/glimmerjs/glimmer-vm/pull/1134) [BUGFIX] Fix string repeat ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.57.1 (2020-08-19)

#### :bug: Bug Fix
* `@glimmer/validator`
  * [#1133](https://github.com/glimmerjs/glimmer-vm/pull/1133) [BUGFIX] Avoid String.prototype.repeat ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.57.0 (2020-08-18)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/validator`, `@glimmer/vm`
  * [#1115](https://github.com/glimmerjs/glimmer-vm/pull/1115) [REFACTOR] Converts VM to use tracking internally ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.56.1 (2020-08-11)

#### :house: Internal
* `@glimmer/bundle-compiler`, `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/util`
  * [#1131](https://github.com/glimmerjs/glimmer-vm/pull/1131) [REFACTOR] Simplifies immediate and handle encoding ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.56.0 (2020-08-05)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/validator`
  * [#1126](https://github.com/glimmerjs/glimmer-vm/pull/1126) [REFACTOR] Expose tagMeta and simplify property lookups ([@pzuraq](https://github.com/pzuraq))

#### :house: Internal
* Other
  * [#1129](https://github.com/glimmerjs/glimmer-vm/pull/1129) set more timeouts for browserstack ([@krisselden](https://github.com/krisselden))
* `@glimmer/integration-tests`
  * [#1130](https://github.com/glimmerjs/glimmer-vm/pull/1130) [BUGFIX] Reduce test iteration count to prevent timeouts ([@pzuraq](https://github.com/pzuraq))
  * [#1127](https://github.com/glimmerjs/glimmer-vm/pull/1127) fix test memory leaks ([@krisselden](https://github.com/krisselden))

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Kris Selden ([@krisselden](https://github.com/krisselden))


## v0.55.3 (2020-08-02)

#### :house: Internal
* `@glimmer/validator`
  * [#1124](https://github.com/glimmerjs/glimmer-vm/pull/1124) [REFACTOR] Simplify and warm tag computation ([@pzuraq](https://github.com/pzuraq))
  * [#1108](https://github.com/glimmerjs/glimmer-vm/pull/1108) Remove $REVISION optimization ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.55.2 (2020-07-30)

#### :rocket: Enhancement
* `@glimmer/bundle-compiler`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/program`, `@glimmer/runtime`
  * [#1122](https://github.com/glimmerjs/glimmer-vm/pull/1122) [Refactor] Use a map to dedupe constants instead of indexOf ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/runtime`
  * [#1121](https://github.com/glimmerjs/glimmer-vm/pull/1121) Expose the destroyables on the error thrown by `assertDestroyablesDestroyed` ([@rwjblue](https://github.com/rwjblue))

#### :house: Internal
* `@glimmer/validator`
  * [#1120](https://github.com/glimmerjs/glimmer-vm/pull/1120) Fix `MonomorphicTag` type error for downstream consumers ([@dfreeman](https://github.com/dfreeman))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Dan Freeman ([@dfreeman](https://github.com/dfreeman))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.55.1 (2020-07-26)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#1119](https://github.com/glimmerjs/glimmer-vm/pull/1119) Ensure `isDestroying`/`isDestroyed` without children or destructors does not fail `assertDestroyablesDestroyed` ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.55.0 (2020-07-17)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/util`
  * [#1114](https://github.com/glimmerjs/glimmer-vm/pull/1114) [REFACTOR] Remove LinkedList and simplify iteration ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.54.1 (2020-07-02)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#1113](https://github.com/glimmerjs/glimmer-vm/pull/1113) Fix a memory leak with `{{each}}` ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.54.0 (2020-06-17)

#### :boom: Breaking Change / :rocket: Enhancement
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/runtime`, `@glimmer/util`
  * [#1110](https://github.com/glimmerjs/glimmer-vm/pull/1110) Implement Destroyables RFC ([@pzuraq](https://github.com/pzuraq))

#### :bug: Bug Fix
* `@glimmer/validator`
  * [#1103](https://github.com/glimmerjs/glimmer-vm/pull/1103) [BUGFIX] Adds an assertion to prevent duplicate validator packages ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.53.0 (2020-05-18)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/validator`
  * [#1090](https://github.com/glimmerjs/glimmer-vm/pull/1090) Implement `@glimmer/tracking/primatives/cache` (see [emberjs/rfcs#615](https://github.com/emberjs/rfcs/blob/master/text/0615-autotracking-memoization.md) for details) ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/validator`
  * [#1088](https://github.com/glimmerjs/glimmer-vm/pull/1088) Rename `memoizeTracked` to `memo` ([@pzuraq](https://github.com/pzuraq))
  * [#1089](https://github.com/glimmerjs/glimmer-vm/pull/1089) Remove unused EPOCH tag ([@pzuraq](https://github.com/pzuraq))

#### :rocket: Enhancement
* `@glimmer/integration-tests`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/validator`
  * [#1090](https://github.com/glimmerjs/glimmer-vm/pull/1090) Implement `@glimmer/tracking/primatives/cache` (see [emberjs/rfcs#615](https://github.com/emberjs/rfcs/blob/master/text/0615-autotracking-memoization.md) for details) ([@pzuraq](https://github.com/pzuraq))

#### :bug: Bug Fix
* `@glimmer/compiler`
  * [#1102](https://github.com/glimmerjs/glimmer-vm/pull/1102) Add a compile time error when passing arguments to regular HTML elements (e.g. `<a @foo=`) ([@fivetanley](https://github.com/fivetanley))
* `@glimmer/integration-tests`, `@glimmer/reference`
  * [#1100](https://github.com/glimmerjs/glimmer-vm/pull/1100) Rerender an `{{#each`s block only when the specific item has changed ([@pzuraq](https://github.com/pzuraq))

#### :house: Internal
* [#1099](https://github.com/glimmerjs/glimmer-vm/pull/1099) Re-roll yarn.lock. ([@rwjblue](https://github.com/rwjblue))
* [#1098](https://github.com/glimmerjs/glimmer-vm/pull/1098) Remove .travis.yml ([@rwjblue](https://github.com/rwjblue))
* [#1096](https://github.com/glimmerjs/glimmer-vm/pull/1096) Add GitHub Actions ([@rwjblue](https://github.com/rwjblue))
* [#1097](https://github.com/glimmerjs/glimmer-vm/pull/1097) Remove bin/run-qunit.js test script. ([@rwjblue](https://github.com/rwjblue))
* [#1095](https://github.com/glimmerjs/glimmer-vm/pull/1095) Update release dependencies. ([@rwjblue](https://github.com/rwjblue))
* [#1094](https://github.com/glimmerjs/glimmer-vm/pull/1094) Update pinned Node version ([@rwjblue](https://github.com/rwjblue))
* [#1093](https://github.com/glimmerjs/glimmer-vm/pull/1093) Update pinned yarn version to 1.22.4. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Stanley Stuart ([@fivetanley](https://github.com/fivetanley))


## v0.52.1 (2020-05-08)

#### :bug: Bug Fix
* `@glimmer/compiler`, `@glimmer/integration-tests`, `@glimmer/opcode-compiler`, `@glimmer/syntax`
  * [#1086](https://github.com/glimmerjs/glimmer-vm/pull/1086) [BUGFIX] Process in-element in compiler not parser ([@gitKrystan](https://github.com/gitKrystan))

#### Committers: 1
- Krystan HuffMenne ([@gitKrystan](https://github.com/gitKrystan))


## v0.52.0 (2020-05-01)

#### :boom: Breaking Change
* `@glimmer/compiler`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`
  * [#1056](https://github.com/glimmerjs/glimmer-vm/pull/1056) Reduce template size increase ([@krisselden](https://github.com/krisselden))

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/runtime`
  * [#1080](https://github.com/glimmerjs/glimmer-vm/pull/1080) Ensure destructors run for items added to an `{{#each` after initial render ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/reference`
  * [#1081](https://github.com/glimmerjs/glimmer-vm/pull/1081) Fix key uniqueness implementation ([@pzuraq](https://github.com/pzuraq))

#### :house: Internal
* `@glimmer/integration-tests`
  * [#1070](https://github.com/glimmerjs/glimmer-vm/pull/1070) Add a previously failing test for destroyables not being called on items added to an `{{#each` after initial render ([@scottmessinger](https://github.com/scottmessinger))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Kris Selden ([@krisselden](https://github.com/krisselden))
- Scott Ames-Messinger ([@scottmessinger](https://github.com/scottmessinger))


## v0.51.1 (2020-04-27)

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#1079](https://github.com/glimmerjs/glimmer-vm/pull/1079) Ensure overriding with an empty Hash does not add extra whitespace. ([@rwjblue](https://github.com/rwjblue))

#### :house: Internal
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/dom-change-list`, `@glimmer/encoder`, `@glimmer/integration-tests`, `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/vm`, `@glimmer/wire-format`
  * [#1078](https://github.com/glimmerjs/glimmer-vm/pull/1078) Fix package.json versions. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.51.0 (2020-04-20)

#### :boom: Breaking Change
* [#1075](https://github.com/glimmerjs/glimmer-vm/pull/1075) Update main key in package json to reference es2017 bundles ([@chiragpat](https://github.com/chiragpat))

#### Committers: 1
- Chirag Patel ([@chiragpat](https://github.com/chiragpat))


## v0.50.4 (2020-04-16)

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/runtime`
  * [#1073](https://github.com/glimmerjs/glimmer-vm/pull/1073) Ensure errors during component creation do not cause secondary errors during DOM cleanup ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))


## v0.50.3 (2020-04-15)

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#1071](https://github.com/glimmerjs/glimmer-vm/pull/1071) Bump minimum `handlebars.js` version to 4.7.4 (fixes security alert for `optimist`) ([@dcyriller](https://github.com/dcyriller))

#### Committers: 1
- Cyrille David ([@dcyriller](https://github.com/dcyriller))


## v0.50.2 (2020-04-13)

#### :bug: Bug Fix
* `@glimmer/validator`
  * [#1069](https://github.com/glimmerjs/glimmer-vm/pull/1069) Ensure tracking frames do not get unbalanced ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/vm`
  * [#1068](https://github.com/glimmerjs/glimmer-vm/pull/1068) Fix issue when using named blocks with wrapped components (e.g. `@ember/component`) ([@locks](https://github.com/locks))

#### :house: Internal
* `@glimmer/compiler`, `@glimmer/opcode-compiler`, `@glimmer/program`
  * [#1064](https://github.com/glimmerjs/glimmer-vm/pull/1064) Add dev time addon to enable easier local linking (e.g. to test in Glimmer.js or Ember.js from a local dev server). ([@pzuraq](https://github.com/pzuraq))

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Ricardo Mendes ([@locks](https://github.com/locks))


## v0.50.1 (2020-04-03)

#### :bug: Bug Fix
* `@glimmer/validator`
  * [#1066](https://github.com/glimmerjs/glimmer-vm/pull/1066) Improve development build performance (remove the `Error` instances created for autotracking transactions) ([@pzuraq](https://github.com/pzuraq))

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


# Changelog

## v0.50.0 (2020-03-26)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/validator`
  * [#1060](https://github.com/glimmerjs/glimmer-vm/pull/1060)  [FEAT] Adds `memoizeTracked` ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.48.0 (2020-03-11)

#### :boom: Breaking Change
* `@glimmer/program`, `@glimmer/reference`
  * [#1053](https://github.com/glimmerjs/glimmer-vm/pull/1053) Upgrade TypeScript version to 3.7.5 ([@krisselden](https://github.com/krisselden))
* `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/util`
  * [#1047](https://github.com/glimmerjs/glimmer-vm/pull/1047) Remove runtime dep on opcode-compiler ([@krisselden](https://github.com/krisselden))
* `@glimmer/integration-tests`, `@glimmer/reference`, `@glimmer/runtime`
  * [#1028](https://github.com/glimmerjs/glimmer-vm/pull/1028) Simplifies `JitRuntime`, `JitContext`, `Environment` setup ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/runtime`
  * [#1044](https://github.com/glimmerjs/glimmer-vm/pull/1044) Remove `@glimmer/opcode-compiler` dependency on `@glimmer/runtime` ([@krisselden](https://github.com/krisselden))
* `@glimmer/interfaces`, `@glimmer/runtime`
  * [#1043](https://github.com/glimmerjs/glimmer-vm/pull/1043) Fix `@glimmer/interfaces` dependency on `@glimmer/runtime` ([@krisselden](https://github.com/krisselden))

#### :bug: Bug Fix
* `@glimmer/debug`, `@glimmer/node`, `@glimmer/object-reference`, `@glimmer/program`, `@glimmer/reference`
  * [#1049](https://github.com/glimmerjs/glimmer-vm/pull/1049) Enable eslint-plugin-node's no-extraneous-import rule (mostly). ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/runtime`
  * [#1041](https://github.com/glimmerjs/glimmer-vm/pull/1041) runtime: Add missing `@glimmer/opcode-compiler` dependency ([@Turbo87](https://github.com/Turbo87))
* `@glimmer/util`
  * [#1040](https://github.com/glimmerjs/glimmer-vm/pull/1040) util: Promote `@glimmer/interfaces` to non-dev dependency ([@Turbo87](https://github.com/Turbo87))

#### :memo: Documentation
* [#984](https://github.com/glimmerjs/glimmer-vm/pull/984) Remove obsolete BREAKING.md file ([@Turbo87](https://github.com/Turbo87))

#### :house: Internal
* `@glimmer/integration-tests`
  * [#1055](https://github.com/glimmerjs/glimmer-vm/pull/1055) bugfix: -test not -tests ([@chadhietala](https://github.com/chadhietala))
  * [#991](https://github.com/glimmerjs/glimmer-vm/pull/991) Add a set of "chaos monkey" tests for rehydration. ([@rwjblue](https://github.com/rwjblue))
  * [#1045](https://github.com/glimmerjs/glimmer-vm/pull/1045) integration-tests: Add missing `@glimmer/runtime` dependency ([@Turbo87](https://github.com/Turbo87))
* `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/dom-change-list`, `@glimmer/integration-tests`, `@glimmer/node`, `@glimmer/object`, `@glimmer/opcode-compiler`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/validator`
  * [#1050](https://github.com/glimmerjs/glimmer-vm/pull/1050) Remove unused and update eslint and prettier. ([@krisselden](https://github.com/krisselden))
* Other
  * [#1048](https://github.com/glimmerjs/glimmer-vm/pull/1048) [CLEANUP] Remove long deprecated emberjs-build usage ([@krisselden](https://github.com/krisselden))
  * [#1042](https://github.com/glimmerjs/glimmer-vm/pull/1042)  ESLint: Enable `node/no-unpublished-import` rule  ([@Turbo87](https://github.com/Turbo87))
* `@glimmer/interfaces`, `@glimmer/opcode-compiler`
  * [#1046](https://github.com/glimmerjs/glimmer-vm/pull/1046) Fix TS performance regression in compiler types ([@krisselden](https://github.com/krisselden))
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/dom-change-list`, `@glimmer/low-level`, `@glimmer/object-reference`, `@glimmer/object`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/validator`
  * [#1039](https://github.com/glimmerjs/glimmer-vm/pull/1039) Add `.npmignore` files to each public package with a `test` folder ([@Turbo87](https://github.com/Turbo87))
* `@glimmer/runtime`, `@glimmer/syntax`
  * [#1038](https://github.com/glimmerjs/glimmer-vm/pull/1038) Replace imports from own package with relative imports  ([@Turbo87](https://github.com/Turbo87))
* `@glimmer/interfaces`
  * [#1037](https://github.com/glimmerjs/glimmer-vm/pull/1037) interfaces: Remove unused imports ([@Turbo87](https://github.com/Turbo87))

#### Committers: 5
- Chad Hietala ([@chadhietala](https://github.com/chadhietala))
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Kris Selden ([@krisselden](https://github.com/krisselden))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Tobias Bieniek ([@Turbo87](https://github.com/Turbo87))

## v0.47.9 (2020-02-14)

#### :bug: Bug Fix
* `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/wire-format`
  * [#1035](https://github.com/glimmerjs/glimmer-vm/pull/1035) Fix static component attributes ([@krisselden](https://github.com/krisselden))
* `@glimmer/integration-tests`, `@glimmer/runtime`
  * [#1034](https://github.com/glimmerjs/glimmer-vm/pull/1034) Fixes {{has-block}} when used with curried components as a variable ([@pzuraq](https://github.com/pzuraq))

#### :house: Internal
* `@glimmer/debug`, `@glimmer/integration-tests`
  * [#1036](https://github.com/glimmerjs/glimmer-vm/pull/1036) IE11 doesn't support Number.MAX_SAFE_INTEGER / Number.MIN_SAFE_INTEGER ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Kris Selden ([@krisselden](https://github.com/krisselden))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.47.8 (2020-02-13)

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/low-level`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/util`
  * [#1027](https://github.com/glimmerjs/glimmer-vm/pull/1027) [BUGFIX] Fix immediate encoding ([@krisselden](https://github.com/krisselden))

#### :house: Internal
* Other
  * [#1033](https://github.com/glimmerjs/glimmer-vm/pull/1033) Specify tsconfigRootDir in parserOptions for TS files. ([@rwjblue](https://github.com/rwjblue))
  * [#1032](https://github.com/glimmerjs/glimmer-vm/pull/1032) Fix TravisCI configuration. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/local-debug-flags`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/vm`
  * [#1031](https://github.com/glimmerjs/glimmer-vm/pull/1031) [BUGFIX] Update HasBlockParams metadata ([@pzuraq](https://github.com/pzuraq))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Kris Selden ([@krisselden](https://github.com/krisselden))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v0.47.7 (2020-02-12)

#### :bug: Bug Fix
* `@glimmer/util`
  * [#1030](https://github.com/glimmerjs/glimmer-vm/pull/1030) Add @glimmer/env to @glimmer/util's package.json. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v0.47.6 (2020-02-11)

#### :rocket: Enhancement
* `@glimmer/syntax`
  * [#1024](https://github.com/glimmerjs/glimmer-vm/pull/1024) Add `parents()` generator method to the `Path` class ([@Turbo87](https://github.com/Turbo87))

#### :bug: Bug Fix
* `@glimmer/reference`, `@glimmer/util`
  * [#1022](https://github.com/glimmerjs/glimmer-vm/pull/1022) [BUGFIX] Ensure Iterables work with dictionaries ([@pzuraq](https://github.com/pzuraq))

#### Committers: 3
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Godfrey Chan ([@chancancode](https://github.com/chancancode))
- Tobias Bieniek ([@Turbo87](https://github.com/Turbo87))

## v0.47.5 (2020-02-07)

#### :rocket: Enhancement
* `@glimmer/syntax`
  * [#1021](https://github.com/glimmerjs/glimmer-vm/pull/1021) chore: improve error for unrecachable statements ([@lifeart](https://github.com/lifeart))

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/runtime`
  * [#1023](https://github.com/glimmerjs/glimmer-vm/pull/1023) Avoid double-clearing `{{in-element}}` ([@chancancode](https://github.com/chancancode))

#### Committers: 2
- Alex Kanunnikov ([@lifeart](https://github.com/lifeart))
- Godfrey Chan ([@chancancode](https://github.com/chancancode))

## v0.47.4 (2020-01-30)

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/syntax`
  * [#1019](https://github.com/glimmerjs/glimmer-vm/pull/1019) Update simple-html-tokenizer to at least 0.5.9. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v0.47.3 (2020-01-28)

#### :bug: Bug Fix
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/dom-change-list`, `@glimmer/encoder`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/local-debug-flags`, `@glimmer/low-level`, `@glimmer/node`, `@glimmer/object-reference`, `@glimmer/object`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/util`, `@glimmer/validator`, `@glimmer/vm`, `@glimmer/wire-format`
  * [#1017](https://github.com/glimmerjs/glimmer-vm/pull/1017) Fix publishing issues in v0.47.2 ([@chancancode](https://github.com/chancancode))

#### Committers: 1
- Godfrey Chan ([@chancancode](https://github.com/chancancode))

## v0.47.2 (2020-01-28)

#### :bug: Bug Fix
* `@glimmer/validator`
  * [#1015](https://github.com/glimmerjs/glimmer-vm/pull/1015) Ensure tracked initializers have access to `this` ([@chancancode](https://github.com/chancancode))

#### Committers: 1

## v0.47.1 (2020-01-24)

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/opcode-compiler`, `@glimmer/runtime`
  * [#1012](https://github.com/glimmerjs/glimmer-vm/pull/1012) [BUGFIX] Converts partial meta to template meta in constants pool ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.47.0 (2020-01-24)

#### :boom: Breaking Change
* `@glimmer/bundle-compiler`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`
  * [#1011](https://github.com/glimmerjs/glimmer-vm/pull/1011) [PERF] Splits out template metas and serializables in constant pool ([@pzuraq](https://github.com/pzuraq))

#### :bug: Bug Fix
* `@glimmer/validator`
  * [#1010](https://github.com/glimmerjs/glimmer-vm/pull/1010) [BUGFIX] Makes UpdatableTag updates lazy ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.46.0 (2020-01-16)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`
  * [#1009](https://github.com/glimmerjs/glimmer-vm/pull/1009) [BUGFIX] Don't serialize template metas in the JIT constant pool ([@pzuraq](https://github.com/pzuraq))

#### :house: Internal
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/dom-change-list`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/low-level`, `@glimmer/object-reference`, `@glimmer/object`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/validator`
  * [#1005](https://github.com/glimmerjs/glimmer-vm/pull/1005) Replace imports from own package with relative imports ([@Turbo87](https://github.com/Turbo87))

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Tobias Bieniek ([@Turbo87](https://github.com/Turbo87))

## v0.45.3 (2020-01-06)

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#1006](https://github.com/glimmerjs/glimmer-vm/pull/1006) Ensure spacing before `Hash` exists when printing with overrides. ([@rwjblue](https://github.com/rwjblue))

#### :house: Internal
* `@glimmer/syntax`
  * [#1004](https://github.com/glimmerjs/glimmer-vm/pull/1004) syntax/test/plugin-node: Replace relative imports with package imports ([@Turbo87](https://github.com/Turbo87))
* `@glimmer/dom-change-list`, `@glimmer/integration-tests`
  * [#1003](https://github.com/glimmerjs/glimmer-vm/pull/1003) Use type signatures from `@types/qunit` and `qunit` instead of local copy ([@Turbo87](https://github.com/Turbo87))
* Other
  * [#1002](https://github.com/glimmerjs/glimmer-vm/pull/1002) Use Yarn workspaces ([@Turbo87](https://github.com/Turbo87))
  * [#998](https://github.com/glimmerjs/glimmer-vm/pull/998) ESLint: Enable `node/no-missing-import` rule ([@Turbo87](https://github.com/Turbo87))
  * [#1001](https://github.com/glimmerjs/glimmer-vm/pull/1001) Remove outdated `typescript` dev dependencies ([@Turbo87](https://github.com/Turbo87))
  * [#1000](https://github.com/glimmerjs/glimmer-vm/pull/1000) Add missing `@simple-dom` dependencies ([@Turbo87](https://github.com/Turbo87))
  * [#997](https://github.com/glimmerjs/glimmer-vm/pull/997) ESLint: Add `qunit` plugin ([@Turbo87](https://github.com/Turbo87))

#### Committers: 2
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Tobias Bieniek ([@Turbo87](https://github.com/Turbo87))

## v0.45.2 (2020-01-02)

#### :rocket: Enhancement
* `@glimmer/syntax`
  * [#985](https://github.com/glimmerjs/glimmer-vm/pull/985) Add optional `path` argument to visitor functions ([@Turbo87](https://github.com/Turbo87))

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#835](https://github.com/glimmerjs/glimmer-vm/pull/835) Refactor printer ([@krisselden](https://github.com/krisselden))

#### :house: Internal
* Other
  * [#996](https://github.com/glimmerjs/glimmer-vm/pull/996) Update run-types-test.js to use local `tsc`. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/reference`, `@glimmer/syntax`
  * [#995](https://github.com/glimmerjs/glimmer-vm/pull/995) ESLint: Add `node` plugin ([@Turbo87](https://github.com/Turbo87))

#### Committers: 3
- Kris Selden ([@krisselden](https://github.com/krisselden))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Tobias Bieniek ([@Turbo87](https://github.com/Turbo87))

## v0.45.1 (2019-12-20)

#### :bug: Bug Fix
* `@glimmer/util`
  * [#994](https://github.com/glimmerjs/glimmer-vm/pull/994) [BUGFIX] Avoid in operator with symbols ([@pzuraq](https://github.com/pzuraq))

#### Committers: 1
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))

## v0.45.0 (2019-12-18)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/object-reference`, `@glimmer/object`, `@glimmer/opcode-compiler`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/util`, `@glimmer/validator`
  * [#993](https://github.com/glimmerjs/glimmer-vm/pull/993) [REFACTOR] Refactors while integrating with Ember ([@pzuraq](https://github.com/pzuraq))
    * `@glimmer/runtime`
      * Removed `DefaultEnvironment`
      * `RuntimeEnvironmentDelegate` -> `EnvironmentDelegate`
        * `iterable` -> `toIterator`, now returns an `IteratorDelegate`
      * Changed `JitRuntime` creation methods to receive EnvironmentOptions instead
        a `document` object
      * Added `willDestroy` component capability. Should generally be avoided, it's
        just for classic interop.
    * `@glimmer/reference`
      * Removed `MapReference`
      * Removed `UpdatableReference`, replaced it with `UpdatableRootReference` and
        `IterationItemReference`
      * Most references now require the `env`
      * Refactor property and root references generally, not a complete rewrite, but
        large enough that embedders should really pay attention to that code and
        will have to rewrite some things.
      * Major changes
    * `@glimmer/validator`
      * Simplified `meta` implementation in general. `tagFor` and `dirtyTagFor` have
        changed decently.
      * Added assertions to tags to prevent incorrect usage

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.44.0 (2019-11-08)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/object-reference`, `@glimmer/object`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/validator`
  * [#987](https://github.com/glimmerjs/glimmer-vm/pull/987) Extract validation system and tags into `@glimmer/validator` package ([@pzuraq](https://github.com/pzuraq))

#### :house: Internal
* Other
  * [#989](https://github.com/glimmerjs/glimmer-vm/pull/989) Allow test runner to rerender between modules. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/syntax`
  * [#986](https://github.com/glimmerjs/glimmer-vm/pull/986) Update to handlebars@4.5.1. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v0.43.0 (2019-10-27)

#### :boom: Breaking Change
* `@glimmer/syntax`
  * [#983](https://github.com/glimmerjs/glimmer-vm/pull/983) Ensure codemod mode ignores whitespace control. ([@rwjblue](https://github.com/rwjblue))

#### :rocket: Enhancement
* [#972](https://github.com/glimmerjs/glimmer-vm/pull/972) Lay groundwork for lexical scope & improve errors ([@wycats](https://github.com/wycats) / [@tomdale](https://github.com/tomdale))

#### :house: Internal
* Other
  * [#981](https://github.com/glimmerjs/glimmer-vm/pull/981) Update ember-cli-browserstack so that BrowserStack tests will continue to work ([@kategengler](https://github.com/kategengler))
* `@glimmer/runtime`
  * [#980](https://github.com/glimmerjs/glimmer-vm/pull/980) Avoid duplicate `indexOf` in `BlockArguments` ([@bekzod](https://github.com/bekzod))

#### Committers: 3
- Katie Gengler ([@kategengler](https://github.com/kategengler))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- bek ([@bekzod](https://github.com/bekzod))


## v0.42.2 (2019-10-11)

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#979](https://github.com/glimmerjs/glimmer-vm/pull/979) Fix AST loc info for `ConcatStatement`s containing `TextNode`s ([@rwjblue](https://github.com/rwjblue))

#### :house: Internal
* `@glimmer/compiler`, `@glimmer/integration-tests`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/syntax`
  * [#976](https://github.com/glimmerjs/glimmer-vm/pull/976) Replace TSLint with ESLint ([@Turbo87](https://github.com/Turbo87))
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/dom-change-list`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/syntax`
  * [#975](https://github.com/glimmerjs/glimmer-vm/pull/975) Update `prettier` to v1.18.2 ([@Turbo87](https://github.com/Turbo87))
* Other
  * [#977](https://github.com/glimmerjs/glimmer-vm/pull/977) CI: Use Node 8 ([@Turbo87](https://github.com/Turbo87))

#### Committers: 2
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Tobias Bieniek ([@Turbo87](https://github.com/Turbo87))

## v0.42.1 (2019-09-26)

#### :bug: Bug Fix
* `@glimmer/util`
  * [#969](https://github.com/glimmerjs/glimmer-vm/pull/969) util/string: Fix broken array length conditions ([@Turbo87](https://github.com/Turbo87))
* `@glimmer/runtime`
  * [#971](https://github.com/glimmerjs/glimmer-vm/pull/971) Handle missing remote element marker gracefully. ([@melmerp](https://github.com/melmerp))

#### :house: Internal
* [#968](https://github.com/glimmerjs/glimmer-vm/pull/968) Run ESLint on *all* JS files in the project ([@Turbo87](https://github.com/Turbo87))
* [#973](https://github.com/glimmerjs/glimmer-vm/pull/973) Upgrade amd-name-resolver dependency to 1.3.1 ([@tomdale](https://github.com/tomdale))
* [#970](https://github.com/glimmerjs/glimmer-vm/pull/970) build/debug: Use `prettier` API directly instead of going through TSLint ([@Turbo87](https://github.com/Turbo87))
* [#967](https://github.com/glimmerjs/glimmer-vm/pull/967) Cleanup Node.js files ([@Turbo87](https://github.com/Turbo87))

#### Committers: 2
- Tobias Bieniek ([@Turbo87](https://github.com/Turbo87))
- Tom Dale ([@tomdale](https://github.com/tomdale))

## v0.42.0 (2019-08-13)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/reference`, `@glimmer/runtime`
  * [#964](https://github.com/glimmerjs/glimmer-vm/pull/964) [FEAT] Perf Tuning + Functional API ([@pzuraq](https://github.com/pzuraq))

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/node`, `@glimmer/runtime`
  * [#961](https://github.com/glimmerjs/glimmer-vm/pull/961) Fix `<title>`, `<script>`, and `<style>` rehydration ([@CvX](https://github.com/CvX))
* `@glimmer/integration-tests`, `@glimmer/syntax`
  * [#960](https://github.com/glimmerjs/glimmer-vm/pull/960) Update simple-html-tokenizer to v0.5.8 ([@josemarluedke](https://github.com/josemarluedke))

#### Committers: 4
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Jarek Radosz ([@CvX](https://github.com/CvX))
- Josemar Luedke ([@josemarluedke](https://github.com/josemarluedke))
- bek ([@bekzod](https://github.com/bekzod))

## v0.41.4 (2019-07-11)

#### :rocket: Enhancement
* `@glimmer/syntax`
  * [#957](https://github.com/glimmerjs/glimmer-vm/pull/957) Add ability to override printing of specific AST nodes. ([@rwjblue](https://github.com/rwjblue))

#### :bug: Bug Fix
* `@glimmer/integration-tests`, `@glimmer/node`
  * [#956](https://github.com/glimmerjs/glimmer-vm/pull/956) Fix table thead and tfoot rehydration ([@josemarluedke](https://github.com/josemarluedke))

#### Committers: 2
- Josemar Luedke ([@josemarluedke](https://github.com/josemarluedke))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v0.41.2 (2019-07-04)

#### :rocket: Enhancement
* `@glimmer/syntax`
  * [#951](https://github.com/glimmerjs/glimmer-vm/pull/951) Preserve mustache whitespace stripping information in AST and printer ([@CvX](https://github.com/CvX))

#### Committers: 1
- Jarek Radosz ([@CvX](https://github.com/CvX))


## v0.41.1 (2019-06-25)

#### :rocket: Enhancement
* `@glimmer/reference`
  * [#945](https://github.com/glimmerjs/glimmer-vm/pull/945) Performance improvements for keyed lists changes ([@lifeart](https://github.com/lifeart))

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#949](https://github.com/glimmerjs/glimmer-vm/pull/949) Print unescaped statements correctly ([@paddyobrien](https://github.com/paddyobrien))

#### Committers: 2
- Alex Kanunnikov ([@lifeart](https://github.com/lifeart))
- Paddy O'Brien ([@paddyobrien](https://github.com/paddyobrien))


## v0.41.0 (2019-05-13)

#### :boom: Breaking Change
* `@glimmer/syntax`
  * [#942](https://github.com/glimmerjs/glimmer-vm/pull/942) Add support for `chained` inverse blocks ([@Turbo87](https://github.com/Turbo87))

#### :house: Internal
* [#927](https://github.com/glimmerjs/glimmer-vm/pull/927) Update yarn-link-all script to print out commands to run in project ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### Committers: 2
- L. Preston Sego III ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
- Tobias Bieniek ([@Turbo87](https://github.com/Turbo87))


## v0.40.2 (2019-05-13)

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#941](https://github.com/glimmerjs/glimmer-vm/pull/941) Fix printer support for self-closing angle bracket component invocations ([@Turbo87](https://github.com/Turbo87))
  * [#932](https://github.com/glimmerjs/glimmer-vm/pull/932) Fix printing of MustacheStatement with literal path ([@ef4](https://github.com/ef4))

#### :house: Internal
* `@glimmer/runtime`
  * [#943](https://github.com/glimmerjs/glimmer-vm/pull/943) Remove redundant "this" ([@2hu12](https://github.com/2hu12))

#### Committers: 4
- 2hu ([@2hu12](https://github.com/2hu12))
- Edward Faulkner ([@ef4](https://github.com/ef4))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Tobias Bieniek ([@Turbo87](https://github.com/Turbo87))


## v0.40.1 (2019-04-16)

#### :rocket: Enhancement
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/runtime`, `@glimmer/syntax`
  * [#931](https://github.com/glimmerjs/glimmer-vm/pull/931) Modifying in-element semantics to support non-null insertBefore elements ([@chiragpat](https://github.com/chiragpat))

#### Committers: 1
- Chirag Patel ([@chiragpat](https://github.com/chiragpat))


## v0.40.0 (2019-04-08)

#### :boom: Breaking Change
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/syntax`
  * [#918](https://github.com/glimmerjs/glimmer-vm/pull/918) [FEATURE | BREAKING] Change semantics of in-element to match emberjs/rfcs#287 ([@chadhietala](https://github.com/chadhietala))

#### :rocket: Enhancement
* `@glimmer/compiler`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/runtime`, `@glimmer/wire-format`
  * [#923](https://github.com/glimmerjs/glimmer-vm/pull/923) Allow forward element modifiers into component invocations via ...attributes ([@cibernox](https://github.com/cibernox))
* `@glimmer/integration-tests`, `@glimmer/runtime`
  * [#924](https://github.com/glimmerjs/glimmer-vm/pull/924) Add ability to pass in dynamic scope to render component apis ([@chiragpat](https://github.com/chiragpat))
* `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/syntax`
  * [#918](https://github.com/glimmerjs/glimmer-vm/pull/918) [FEATURE | BREAKING] Change semantics of in-element to match emberjs/rfcs#287 ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* `@glimmer/compiler`, `@glimmer/integration-tests`, `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/wire-format`
  * [#928](https://github.com/glimmerjs/glimmer-vm/pull/928) Fix modifiers order ([@chancancode](https://github.com/chancancode))
* `@glimmer/compiler`, `@glimmer/integration-tests`
  * [#869](https://github.com/glimmerjs/glimmer-vm/pull/869) Ensure passing attribute as mustache properly forwards the current namespace (e.g. svg) ([@mhankus](https://github.com/mhankus))

#### Committers: 6
- Chad Hietala ([@chadhietala](https://github.com/chadhietala))
- Chirag Patel ([@chiragpat](https://github.com/chiragpat))
- Edward Faulkner ([@ef4](https://github.com/ef4))
- Godfrey Chan ([@chancancode](https://github.com/chancancode))
- Miguel Camba ([@cibernox](https://github.com/cibernox))
- Mirek Hankus ([@mhankus](https://github.com/mhankus))

## v0.39.3 (2019-03-15)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#922](https://github.com/glimmerjs/glimmer-vm/pull/922) Use type generic for `scope()` function ([@pzuraq](https://github.com/pzuraq))
* `@glimmer/interfaces`
  * [#921](https://github.com/glimmerjs/glimmer-vm/pull/921) ComponentManager types - fix typeParam shadowing ([@mike-north](https://github.com/mike-north))
* `@glimmer/syntax`
  * [#919](https://github.com/glimmerjs/glimmer-vm/pull/919) fix: security audit handlebars update ([@knownasilya](https://github.com/knownasilya))

#### :house: Internal
* `@glimmer/bundle-compiler`
  * [#917](https://github.com/glimmerjs/glimmer-vm/pull/917) Fixed typo on method name; compilerModuleLocatorResolver ([@wondersloth](https://github.com/wondersloth))

#### Committers: 4
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Ilya Radchenko ([@knownasilya](https://github.com/knownasilya))
- Matthew Edwards ([@wondersloth](https://github.com/wondersloth))
- Mike North ([@mike-north](https://github.com/mike-north))

## 0.37.0 (2018-11-29)

#### :bug: Bug Fix
* Other
  * [#863](https://github.com/glimmerjs/glimmer-vm/pull/863) Fixed Windows Build Error. ([@mattselden12](https://github.com/mattselden12))
* `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/runtime`
  * [#856](https://github.com/glimmerjs/glimmer-vm/pull/856) `Bounds` must be non-empty. ([@chancancode](https://github.com/chancancode))

#### :memo: Documentation
* [#862](https://github.com/glimmerjs/glimmer-vm/pull/862) [DOCS] Adds runtime documentation. ([@pzuraq](https://github.com/pzuraq))

#### Committers: 5
- Chris Garrett ([pzuraq](https://github.com/pzuraq))
- Godfrey Chan ([chancancode](https://github.com/chancancode))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Tom Dale ([tomdale](https://github.com/tomdale))
- [mattselden12](https://github.com/mattselden12)

## v0.36.5 (2018-10-16)

#### :rocket: Enhancement
* `@glimmer/runtime`
  * [#858](https://github.com/glimmerjs/glimmer-vm/pull/858) Export RenderComponentArgs. ([@chiragpat](https://github.com/chiragpat))
* `@glimmer/bundle-compiler`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#850](https://github.com/glimmerjs/glimmer-vm/pull/850) Exposing a primitive renderComponent API. ([@chiragpat](https://github.com/chiragpat))

#### :bug: Bug Fix
* `@glimmer/bundle-compiler`, `@glimmer/opcode-compiler`, `@glimmer/vm`
  * [#857](https://github.com/glimmerjs/glimmer-vm/pull/857) Fix debug issues reported in glimmerjs/glimmer-vm#846. ([@chiragpat](https://github.com/chiragpat))

#### Committers: 1
- Chirag Patel ([chiragpat](https://github.com/chiragpat))

## v031.0 (2018-02-08)

#### :boom: Breaking Change
* `@glimmer/bundle-compiler`, `@glimmer/interfaces`, `@glimmer/test-helpers`
  * [#778](https://github.com/glimmerjs/glimmer-vm/pull/778) Move ModuleLocator and related interfaces to @glimmer/interfaces. ([@tomdale](https://github.com/tomdale))

#### :rocket: Enhancement
* `@glimmer/node`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#775](https://github.com/glimmerjs/glimmer-vm/pull/775) Serialized format renaming. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/encoder`, `@glimmer/opcode-compiler`, `@glimmer/program`
  * [#774](https://github.com/glimmerjs/glimmer-vm/pull/774) Fix args alloc. ([@krisselden](https://github.com/krisselden))
* `@glimmer/runtime`
  * [#771](https://github.com/glimmerjs/glimmer-vm/pull/771) improve nested transaction error message. ([@GavinJoyce](https://github.com/GavinJoyce))

#### :memo: Documentation
* [#768](https://github.com/glimmerjs/glimmer-vm/pull/768) Start fleshing out the precompiler docs. ([@smfoote](https://github.com/smfoote))

#### :house: Internal
* `@glimmer/runtime`, `@glimmer/vm`
  * [#773](https://github.com/glimmerjs/glimmer-vm/pull/773) Encode component capabilities using bitmasks. ([@tomdale](https://github.com/tomdale))

#### Committers: 5
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Gavin Joyce ([GavinJoyce](https://github.com/GavinJoyce))
- Kris Selden ([krisselden](https://github.com/krisselden))
- Steven ([smfoote](https://github.com/smfoote))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.30.4 (2018-01-12)

#### :bug: Bug Fix
* `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/vm`
  * [#767](https://github.com/glimmerjs/glimmer-vm/pull/767) Fix nested currying.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/runtime`
  * [#762](https://github.com/glimmerjs/glimmer-vm/pull/762) Allow null for iterable keys. ([@smfoote](https://github.com/smfoote))
  * [#761](https://github.com/glimmerjs/glimmer-vm/pull/761) Fix has-block-params in prod mode. ([@wycats](https://github.com/wycats))

#### Committers: 5
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Kris Selden ([krisselden](https://github.com/krisselden))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Steven ([smfoote](https://github.com/smfoote))
- Yehuda Katz ([wycats](https://github.com/wycats))


## v0.30.3 (2017-11-27)

#### :house: Internal
* [#742](https://github.com/glimmerjs/glimmer-vm/pull/742) Upgrade broccoli-rollup. ([@t-sauer](https://github.com/t-sauer))

#### Committers: 2
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Thomas Sauer ([t-sauer](https://github.com/t-sauer))


## v0.30.2 (2017-11-14)

#### :bug: Bug Fix
* `@glimmer/encoder`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/test-helpers`
  * [#741](https://github.com/glimmerjs/glimmer-vm/pull/741) Fix bytecode recursive component invocation. ([@tomdale](https://github.com/tomdale))

#### :house: Internal
* `@glimmer/test-helpers`
  * [#740](https://github.com/glimmerjs/glimmer-vm/pull/740) Mark @glimmer/test-helpers as private. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 2
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.30.0 (2017-11-08)

#### :rocket: Enhancement
* `@glimmer/bundle-compiler`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#735](https://github.com/glimmerjs/glimmer-vm/pull/735) Allow passing additional template metadata to BundleCompiler. ([@tomdale](https://github.com/tomdale))
* `@glimmer/bundle-compiler`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/vm`
  * [#701](https://github.com/glimmerjs/glimmer-vm/pull/701) Initial work towards the renderComponent API. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#727](https://github.com/glimmerjs/glimmer-vm/pull/727) [CLEANUP] Use correct environment. ([@Serabe](https://github.com/Serabe))
  * [#730](https://github.com/glimmerjs/glimmer-vm/pull/730) Fix nested partials within a `{{#with}}` block (#728). ([@GavinJoyce](https://github.com/GavinJoyce))
* `@glimmer/interfaces`, `@glimmer/runtime`
  * [#733](https://github.com/glimmerjs/glimmer-vm/pull/733) Fix Bounds and ElementBuilder interfaces.. ([@krisselden](https://github.com/krisselden))

#### :memo: Documentation
* [#724](https://github.com/glimmerjs/glimmer-vm/pull/724) guides: Fix several issues in TS codeblocks. ([@Turbo87](https://github.com/Turbo87))

#### :house: Internal
* `@glimmer/bundle-compiler`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/wire-format`
  * [#738](https://github.com/glimmerjs/glimmer-vm/pull/738) Unify eager and lazy compilation metadata semantics. ([@tomdale](https://github.com/tomdale))
* `@glimmer/bundle-compiler`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#737](https://github.com/glimmerjs/glimmer-vm/pull/737) Add tests for basic #each use cases. ([@chadhietala](https://github.com/chadhietala))
* Other
  * [#725](https://github.com/glimmerjs/glimmer-vm/pull/725) Remove obsolete "lerna.json" file. ([@Turbo87](https://github.com/Turbo87))

#### Committers: 6
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Gavin Joyce ([GavinJoyce](https://github.com/GavinJoyce))
- Kris Selden ([krisselden](https://github.com/krisselden))
- Sergio Arbeo ([Serabe](https://github.com/Serabe))
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.29.1 (2017-10-27)

#### :rocket: Enhancement
* `@glimmer/program`
  * [#721](https://github.com/glimmerjs/glimmer-vm/pull/721) Compact Heap Table. ([@chadhietala](https://github.com/chadhietala))

#### :memo: Documentation
* [#717](https://github.com/glimmerjs/glimmer-vm/pull/717) Add Changelog file. ([@Turbo87](https://github.com/Turbo87))

#### :house: Internal
* `@glimmer/node`, `@glimmer/runtime`
  * [#723](https://github.com/glimmerjs/glimmer-vm/pull/723) Don't infer the return type of the builder factories. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 2
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))


## v0.29.10 (2017-10-27)

#### :rocket: Enhancement
* `@glimmer/program`
  * [#721](https://github.com/glimmerjs/glimmer-vm/pull/721) Compact Heap Table. ([@chadhietala](https://github.com/chadhietala))

#### :memo: Documentation
* [#717](https://github.com/glimmerjs/glimmer-vm/pull/717) Add Changelog file. ([@Turbo87](https://github.com/Turbo87))

#### :house: Internal
* `@glimmer/node`, `@glimmer/runtime`
  * [#723](https://github.com/glimmerjs/glimmer-vm/pull/723) Don't infer the return type of the builder factories. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 2
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))


## v0.29.9 (2017-10-25)

#### :rocket: Enhancement
* `@glimmer/compiler`, `@glimmer/opcode-compiler`, `@glimmer/wire-format`
  * [#720](https://github.com/glimmerjs/glimmer-vm/pull/720) [Cleanup] Remove top-level invocations. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/bundle-compiler`, `@glimmer/program`
  * [#712](https://github.com/glimmerjs/glimmer-vm/pull/712) Special case an empty array constant. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#718](https://github.com/glimmerjs/glimmer-vm/pull/718) [BUGFIX] Fix Frozen Args When Currying. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/bundle-compiler`
  * [#714](https://github.com/glimmerjs/glimmer-vm/pull/714) Don't continuously recompile the layout. ([@chadhietala](https://github.com/chadhietala))

#### :house: Internal
* `@glimmer/object-reference`, `@glimmer/object`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/util`
  * [#585](https://github.com/glimmerjs/glimmer-vm/pull/585) Remove the use of angle type assertion. ([@Serabe](https://github.com/Serabe))

#### Committers: 2
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Sergio Arbeo ([Serabe](https://github.com/Serabe))


## v0.29.8 (2017-10-16)

#### :bug: Bug Fix
* `@glimmer/bundle-compiler`
  * [#711](https://github.com/glimmerjs/glimmer-vm/pull/711) fix(bundle-compiler): Properly cache compileOptions. ([@tomdale](https://github.com/tomdale))
* `@glimmer/runtime`
  * [#710](https://github.com/glimmerjs/glimmer-vm/pull/710) Cache value instead of reading from the element. ([@chadhietala](https://github.com/chadhietala))
  * [#708](https://github.com/glimmerjs/glimmer-vm/pull/708) Check if attribute value actually changed before setting it. ([@t-sauer](https://github.com/t-sauer))
* `@glimmer/compiler`, `@glimmer/runtime`
  * [#707](https://github.com/glimmerjs/glimmer-vm/pull/707) Fix path lookup inside helpers. ([@tomdale](https://github.com/tomdale))

#### :memo: Documentation
* `@glimmer/interfaces`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#709](https://github.com/glimmerjs/glimmer-vm/pull/709) Document capabilities. ([@tomdale](https://github.com/tomdale))

#### :house: Internal
* `@glimmer/runtime`
  * [#575](https://github.com/glimmerjs/glimmer-vm/pull/575) Custom element modifiers. ([@robbiepitts](https://github.com/robbiepitts))
* `@glimmer/object-reference`
  * [#568](https://github.com/glimmerjs/glimmer-vm/pull/568) reuse `referenceFromParts`. ([@bekzod](https://github.com/bekzod))

#### Committers: 5
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Robbie Pitts ([robbiepitts](https://github.com/robbiepitts))
- Thomas Sauer ([t-sauer](https://github.com/t-sauer))
- Tom Dale ([tomdale](https://github.com/tomdale))
- bek ([bekzod](https://github.com/bekzod))


## v0.29.7 (2017-10-12)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#703](https://github.com/glimmerjs/glimmer-vm/pull/703) Initialize v0 register. ([@tomdale](https://github.com/tomdale))
* Other
  * [#704](https://github.com/glimmerjs/glimmer-vm/pull/704) Fix stripped return statements in production builds. ([@tomdale](https://github.com/tomdale))

#### Committers: 1
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.29.5 (2017-10-11)

#### :bug: Bug Fix
* `@glimmer/wire-format`
  * [#700](https://github.com/glimmerjs/glimmer-vm/pull/700) Remove temporary enum value. ([@chadhietala](https://github.com/chadhietala))

#### :house: Internal
* `@glimmer/bundle-compiler`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/test-helpers`
  * [#702](https://github.com/glimmerjs/glimmer-vm/pull/702) Move In-Element Specific Transform Into Visitor. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 1
- Chad Hietala ([chadhietala](https://github.com/chadhietala))


## v0.29.4 (2017-10-10)

#### :rocket: Enhancement
* `@glimmer/runtime`
  * [#693](https://github.com/glimmerjs/glimmer-vm/pull/693) Guard for idempotent sets. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* `@glimmer/program`, `@glimmer/test-helpers`
  * [#699](https://github.com/glimmerjs/glimmer-vm/pull/699) Fix floats and negative numbers. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#697](https://github.com/glimmerjs/glimmer-vm/pull/697) Fix Memory Leaks. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`
  * [#694](https://github.com/glimmerjs/glimmer-vm/pull/694) Skip setting attributes if backing reference is not dirty. ([@tomdale](https://github.com/tomdale))

#### :memo: Documentation
* [#696](https://github.com/glimmerjs/glimmer-vm/pull/696) Correct typos for clarity. ([@smfoote](https://github.com/smfoote))

#### :house: Internal
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#698](https://github.com/glimmerjs/glimmer-vm/pull/698) Migrate Attribute Tests. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/bundle-compiler`, `@glimmer/test-helpers`
  * [#676](https://github.com/glimmerjs/glimmer-vm/pull/676) Eager Mode testing needs to delegate to the correct method. ([@chadhietala](https://github.com/chadhietala))
  * [#695](https://github.com/glimmerjs/glimmer-vm/pull/695) Cleanup bundle compiler. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 3
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Steven ([smfoote](https://github.com/smfoote))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.29.3 (2017-10-05)

#### :boom: Breaking Change
* `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/util`
  * [#680](https://github.com/glimmerjs/glimmer-vm/pull/680) Remove support for IE9/IE10/Phantom. ([@chadhietala](https://github.com/chadhietala))

#### :rocket: Enhancement
* `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/util`
  * [#680](https://github.com/glimmerjs/glimmer-vm/pull/680) Remove support for IE9/IE10/Phantom. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* `@glimmer/dom-change-list`, `@glimmer/node`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/util`
  * [#690](https://github.com/glimmerjs/glimmer-vm/pull/690) Fix Rehydration. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`
  * [#686](https://github.com/glimmerjs/glimmer-vm/pull/686) Targeted fix for SVG rehydration. ([@chadhietala](https://github.com/chadhietala))

#### :house: Internal
* `@glimmer/node`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#691](https://github.com/glimmerjs/glimmer-vm/pull/691) Cleanup some of the rehydration code. ([@chadhietala](https://github.com/chadhietala))
* `benchmark`, `glimmer-benchmarks`, `glimmer-demos`
  * [#688](https://github.com/glimmerjs/glimmer-vm/pull/688) Remove Demos And Benches From Repo. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`
  * [#684](https://github.com/glimmerjs/glimmer-vm/pull/684) Return early for common text appending cases. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 1
- Chad Hietala ([chadhietala](https://github.com/chadhietala))


## v0.29.2 (2017-09-29)

#### :rocket: Enhancement
* `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/test-helpers`, `@glimmer/vm`
  * [#678](https://github.com/glimmerjs/glimmer-vm/pull/678) Rehydrate in-element. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#681](https://github.com/glimmerjs/glimmer-vm/pull/681) Fix metamorphs during rehydration. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/node`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#679](https://github.com/glimmerjs/glimmer-vm/pull/679) Node is not a thing in SSR. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 1
- Chad Hietala ([chadhietala](https://github.com/chadhietala))


## v0.29.1 (2017-09-26)

#### :house: Internal
* `@glimmer/runtime`
  * [#671](https://github.com/glimmerjs/glimmer-vm/pull/671) Move the element builder factory functions to their respective files. ([@chadhietala](https://github.com/chadhietala))
* Other
  * [#673](https://github.com/glimmerjs/glimmer-vm/pull/673) Explicitly publish public packages during deploy. ([@tomdale](https://github.com/tomdale))
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/opcode-compiler`, `@glimmer/syntax`, `@glimmer/test-helpers`
  * [#674](https://github.com/glimmerjs/glimmer-vm/pull/674) Use simple-html-tokenizer's built-in types. ([@tomdale](https://github.com/tomdale))

#### Committers: 2
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.29.0 (2017-09-20)

#### :boom: Breaking Change
* `@glimmer/node`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#667](https://github.com/glimmerjs/glimmer-vm/pull/667) [Breaking] Pass Instances Of Element Builders. ([@chadhietala](https://github.com/chadhietala))

#### :rocket: Enhancement
* Other
  * [#670](https://github.com/glimmerjs/glimmer-vm/pull/670) Nuke the debugging imports from opcode-compiler. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/node`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#667](https://github.com/glimmerjs/glimmer-vm/pull/667) [Breaking] Pass Instances Of Element Builders. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* Other
  * [#672](https://github.com/glimmerjs/glimmer-vm/pull/672) Path for expanding debug APIs correction. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/program`, `@glimmer/test-helpers`
  * [#669](https://github.com/glimmerjs/glimmer-vm/pull/669) Don't use subarray to dump heap. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/interfaces`
  * [#666](https://github.com/glimmerjs/glimmer-vm/pull/666) Break @glimmer/interfaces circular dependency. ([@tomdale](https://github.com/tomdale))

#### :memo: Documentation
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/util`, `@glimmer/vm`
  * [#663](https://github.com/glimmerjs/glimmer-vm/pull/663) Component terminology cleanup. ([@tomdale](https://github.com/tomdale))
* `@glimmer/program`
  * [#664](https://github.com/glimmerjs/glimmer-vm/pull/664) Document Heap. ([@chadhietala](https://github.com/chadhietala))

#### :house: Internal
* `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/test-helpers`
  * [#668](https://github.com/glimmerjs/glimmer-vm/pull/668) Smoke test types before publishing. ([@tomdale](https://github.com/tomdale))
* `@glimmer/debug`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/vm`
  * [#662](https://github.com/glimmerjs/glimmer-vm/pull/662) Refactor call protocol. ([@mmun](https://github.com/mmun))
* `@glimmer/bundle-compiler`, `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/object-reference`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/util`
  * [#661](https://github.com/glimmerjs/glimmer-vm/pull/661) Use an ArrayBuffer for storing the heap. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/program`
  * [#665](https://github.com/glimmerjs/glimmer-vm/pull/665) Intern Constants Pool. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 3
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Martin Muñoz ([mmun](https://github.com/mmun))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.28.3 (2017-09-13)

#### :rocket: Enhancement
* [#660](https://github.com/glimmerjs/glimmer-vm/pull/660) Update nukable import to allow for binaryexpr stripping. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 1
- Chad Hietala ([chadhietala](https://github.com/chadhietala))


## v0.28.2 (2017-09-13)

#### :house: Internal
* `@glimmer/opcode-compiler`
  * [#659](https://github.com/glimmerjs/glimmer-vm/pull/659) Convert `@glimmer/local-debug-flags` to dev dependency. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 1
- Chad Hietala ([chadhietala](https://github.com/chadhietala))


## v0.28.1 (2017-09-13)

#### :house: Internal
* `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/vm`
  * [#658](https://github.com/glimmerjs/glimmer-vm/pull/658) Fix deps on @glimmer/debug. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 1
- Chad Hietala ([chadhietala](https://github.com/chadhietala))


## v0.28.0 (2017-09-13)

#### :boom: Breaking Change
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/interfaces`, `@glimmer/object`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/vm`, `@glimmer/wire-format`
  * [#631](https://github.com/glimmerjs/glimmer-vm/pull/631) [Breaking] Introduce Bundle Compiler. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`
  * [#619](https://github.com/glimmerjs/glimmer-vm/pull/619) Make in-element a public construct. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/compiler`, `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/test-helpers`, `@glimmer/wire-format`, `glimmer-demos`
  * [#602](https://github.com/glimmerjs/glimmer-vm/pull/602) Capital components. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/compiler`, `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/test-helpers`, `@glimmer/util`, `@glimmer/vm`, `@glimmer/wire-format`
  * [#599](https://github.com/glimmerjs/glimmer-vm/pull/599) All internals now support serialization. ([@chancancode](https://github.com/chancancode))

#### :rocket: Enhancement
* `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/vm`
  * [#646](https://github.com/glimmerjs/glimmer-vm/pull/646) Don't rely on callerScope to yield. ([@mmun](https://github.com/mmun))
* `@glimmer/program`
  * [#649](https://github.com/glimmerjs/glimmer-vm/pull/649) use `length` returned from push. ([@bekzod](https://github.com/bekzod))
* `@glimmer/encoder`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/util`
  * [#643](https://github.com/glimmerjs/glimmer-vm/pull/643) First Pass At Encoder. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/debug`, `@glimmer/local-debug-flags`, `@glimmer/opcode-compiler`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#639](https://github.com/glimmerjs/glimmer-vm/pull/639) Add stack assertions. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/opcode-compiler`
  * [#634](https://github.com/glimmerjs/glimmer-vm/pull/634) Fix dependencies and add ability to compile with flags. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`
  * [#630](https://github.com/glimmerjs/glimmer-vm/pull/630) Don't allocate empty arguments. ([@chadhietala](https://github.com/chadhietala))
  * [#619](https://github.com/glimmerjs/glimmer-vm/pull/619) Make in-element a public construct. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/interfaces`, `@glimmer/object`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/vm`, `@glimmer/wire-format`
  * [#631](https://github.com/glimmerjs/glimmer-vm/pull/631) [Breaking] Introduce Bundle Compiler. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* Other
  * [#655](https://github.com/glimmerjs/glimmer-vm/pull/655) Retain opcode metadata if RETAIN_FLAGS is set. ([@tomdale](https://github.com/tomdale))
* `@glimmer/bundle-compiler`, `@glimmer/debug`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/vm`
  * [#650](https://github.com/glimmerjs/glimmer-vm/pull/650) Fix deps on the @glimmer/vm. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/opcode-compiler`, `@glimmer/test-helpers`
  * [#647](https://github.com/glimmerjs/glimmer-vm/pull/647) fixed issue negative number rendering. ([@bekzod](https://github.com/bekzod))
* `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/vm`
  * [#644](https://github.com/glimmerjs/glimmer-vm/pull/644) Pop args from the stack for static invocations. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/opcode-compiler`, `@glimmer/runtime`
  * [#645](https://github.com/glimmerjs/glimmer-vm/pull/645) Fix logging... off by one 👺. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`
  * [#621](https://github.com/glimmerjs/glimmer-vm/pull/621) don't store negative numbers in constants. ([@bekzod](https://github.com/bekzod))
  * [#573](https://github.com/glimmerjs/glimmer-vm/pull/573) fix for constant float/negative values/references. ([@bekzod](https://github.com/bekzod))
* `@glimmer/syntax`
  * [#616](https://github.com/glimmerjs/glimmer-vm/pull/616) Start location fix for dynamic attributes. ([@initram](https://github.com/initram))
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#601](https://github.com/glimmerjs/glimmer-vm/pull/601) Fix Mixins For Rehydration. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/test-helpers`
  * [#582](https://github.com/glimmerjs/glimmer-vm/pull/582) Fix issues with generating invocations. ([@chadhietala](https://github.com/chadhietala))

#### :house: Internal
* `@glimmer/bundle-compiler`, `@glimmer/node`, `@glimmer/test-helpers`
  * [#654](https://github.com/glimmerjs/glimmer-vm/pull/654) Add Node Bundle Compiler Tests. ([@chadhietala](https://github.com/chadhietala))
  * [#653](https://github.com/glimmerjs/glimmer-vm/pull/653) Move bundle compiler and node infra into test-helpers. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`
  * [#656](https://github.com/glimmerjs/glimmer-vm/pull/656) Remove absolute path to sibling. ([@chadhietala](https://github.com/chadhietala))
  * [#626](https://github.com/glimmerjs/glimmer-vm/pull/626) Remove all Opcode.toJSON references. ([@chadhietala](https://github.com/chadhietala))
  * [#624](https://github.com/glimmerjs/glimmer-vm/pull/624) Cleanup DOM Helper. ([@chadhietala](https://github.com/chadhietala))
  * [#623](https://github.com/glimmerjs/glimmer-vm/pull/623) Actually run the has-block-param-helper tests. ([@chadhietala](https://github.com/chadhietala))
  * [#618](https://github.com/glimmerjs/glimmer-vm/pull/618) Use const enums for primitive value type flag. ([@tomdale](https://github.com/tomdale))
  * [#574](https://github.com/glimmerjs/glimmer-vm/pull/574) refactor constant flags. ([@bekzod](https://github.com/bekzod))
  * [#572](https://github.com/glimmerjs/glimmer-vm/pull/572) use index returned by `push`. ([@bekzod](https://github.com/bekzod))
  * [#604](https://github.com/glimmerjs/glimmer-vm/pull/604) Remove references from Constants. ([@chadhietala](https://github.com/chadhietala))
  * [#583](https://github.com/glimmerjs/glimmer-vm/pull/583) Port in element tests. ([@piotrpalek](https://github.com/piotrpalek))
  * [#567](https://github.com/glimmerjs/glimmer-vm/pull/567) Remove commented out tests 😞. ([@chadhietala](https://github.com/chadhietala))
  * [#566](https://github.com/glimmerjs/glimmer-vm/pull/566) Migrate compile and syntax errors. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/node`, `@glimmer/test-helpers`
  * [#652](https://github.com/glimmerjs/glimmer-vm/pull/652) Introduce Node test infra. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/bundle-compiler`, `@glimmer/compiler`, `@glimmer/debug`, `@glimmer/interfaces`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#641](https://github.com/glimmerjs/glimmer-vm/pull/641) Rename all instances of `referer` to `referrer`. ([@tomdale](https://github.com/tomdale))
* `@glimmer/test-helpers`
  * [#642](https://github.com/glimmerjs/glimmer-vm/pull/642) Remove absolute path to test components. ([@chadhietala](https://github.com/chadhietala))
  * [#590](https://github.com/glimmerjs/glimmer-vm/pull/590) Adding tests around snapshots and setting properties. ([@chadhietala](https://github.com/chadhietala))
  * [#586](https://github.com/glimmerjs/glimmer-vm/pull/586) Allow to skip tests completely through test decorator. ([@chadhietala](https://github.com/chadhietala))
  * [#578](https://github.com/glimmerjs/glimmer-vm/pull/578) CallExpression `@test` decorator. ([@chadhietala](https://github.com/chadhietala))
  * [#563](https://github.com/glimmerjs/glimmer-vm/pull/563) Stop publishing @glimmer/test-helpers. ([@robbiepitts](https://github.com/robbiepitts))
* Other
  * [#636](https://github.com/glimmerjs/glimmer-vm/pull/636) Suppress Rollup warnings. ([@mixonic](https://github.com/mixonic))
  * [#617](https://github.com/glimmerjs/glimmer-vm/pull/617) Cleanup multiple watchers during build. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/bundle-compiler`, `@glimmer/opcode-compiler`, `@glimmer/runtime`, `@glimmer/util`, `@glimmer/vm`
  * [#640](https://github.com/glimmerjs/glimmer-vm/pull/640) Wycats stack check. ([@wycats](https://github.com/wycats))
* `@glimmer/bundle-compiler`
  * [#638](https://github.com/glimmerjs/glimmer-vm/pull/638) Bundle Compiler refactoring pass. ([@tomdale](https://github.com/tomdale))
* `@glimmer/reference`
  * [#625](https://github.com/glimmerjs/glimmer-vm/pull/625) Remove ToBoolean conversions. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/bundle-compiler`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#633](https://github.com/glimmerjs/glimmer-vm/pull/633) Move Migrated Tests To Suites. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#627](https://github.com/glimmerjs/glimmer-vm/pull/627) Port Debugger Tests. ([@chadhietala](https://github.com/chadhietala))
  * [#614](https://github.com/glimmerjs/glimmer-vm/pull/614) Upgrade qunit. ([@chadhietala](https://github.com/chadhietala))
  * [#598](https://github.com/glimmerjs/glimmer-vm/pull/598) serializing in tests should serialize the Simple DOM document. ([@chadhietala](https://github.com/chadhietala))
  * [#596](https://github.com/glimmerjs/glimmer-vm/pull/596) Use TS mixin pattern for tests. ([@chadhietala](https://github.com/chadhietala))
  * [#588](https://github.com/glimmerjs/glimmer-vm/pull/588) Introduce tests for the test harness. ([@chadhietala](https://github.com/chadhietala))
  * [#580](https://github.com/glimmerjs/glimmer-vm/pull/580) Component Testing Infrastructure. ([@chadhietala](https://github.com/chadhietala))
  * [#560](https://github.com/glimmerjs/glimmer-vm/pull/560) More targeted test harnesses. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/local-debug-flags`, `@glimmer/node`, `@glimmer/object`, `@glimmer/runtime`, `@glimmer/syntax`, `@glimmer/test-helpers`, `@glimmer/util`, `@glimmer/vm`, `@glimmer/wire-format`, `glimmer`
  * [#606](https://github.com/glimmerjs/glimmer-vm/pull/606) Unify Broccoli build. ([@tomdale](https://github.com/tomdale))
* `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/vm`
  * [#609](https://github.com/glimmerjs/glimmer-vm/pull/609) Moar GC Sweep. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/compiler`, `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/util`
  * [#608](https://github.com/glimmerjs/glimmer-vm/pull/608) GC Sweep. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/local-debug-flags`, `@glimmer/node`
  * [#593](https://github.com/glimmerjs/glimmer-vm/pull/593) Revive Node tests. ([@tomdale](https://github.com/tomdale))
* `@glimmer/object`
  * [#595](https://github.com/glimmerjs/glimmer-vm/pull/595) Upgrade to TS 2.4. ([@chancancode](https://github.com/chancancode))
* `@glimmer/object-model`
  * [#594](https://github.com/glimmerjs/glimmer-vm/pull/594) Remove unused object model. ([@chancancode](https://github.com/chancancode))

#### Committers: 10
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Godfrey Chan ([chancancode](https://github.com/chancancode))
- Martin Midtgaard ([initram](https://github.com/initram))
- Martin Muñoz ([mmun](https://github.com/mmun))
- Matthew Beale ([mixonic](https://github.com/mixonic))
- Peter ([piotrpalek](https://github.com/piotrpalek))
- Robbie Pitts ([robbiepitts](https://github.com/robbiepitts))
- Tom Dale ([tomdale](https://github.com/tomdale))
- Yehuda Katz ([wycats](https://github.com/wycats))
- bek ([bekzod](https://github.com/bekzod))


## v0.26.1 (2017-07-03)

#### :house: Internal
* `@glimmer/runtime`
  * [#562](https://github.com/glimmerjs/glimmer-vm/pull/562) Fix import. ([@robbiepitts](https://github.com/robbiepitts))

#### Committers: 1
- Robbie Pitts ([robbiepitts](https://github.com/robbiepitts))


## v0.25.2 (2017-06-30)

#### :boom: Breaking Change
* `@glimmer/syntax`
  * [#557](https://github.com/glimmerjs/glimmer-vm/pull/557) [BREAKING] Update ASTPluginResult to use `visitor` (no plural form).. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/reference`, `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#558](https://github.com/glimmerjs/glimmer-vm/pull/558) [BREAKING] Make the manager decide what tag to use. ([@chancancode](https://github.com/chancancode))

#### :rocket: Enhancement
* `@glimmer/interfaces`, `@glimmer/node`, `@glimmer/object`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/util`, `glimmer-demos`, `simple-dom`
  * [#549](https://github.com/glimmerjs/glimmer-vm/pull/549) Rehydration. ([@wycats](https://github.com/wycats))

#### :house: Internal
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#559](https://github.com/glimmerjs/glimmer-vm/pull/559) Migrate initial render tests. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 4
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Godfrey Chan ([chancancode](https://github.com/chancancode))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Yehuda Katz ([wycats](https://github.com/wycats))


## v0.25.0 (2017-06-20)

#### :boom: Breaking Change
* `@glimmer/compiler`, `@glimmer/syntax`
  * [#551](https://github.com/glimmerjs/glimmer-vm/pull/551) [BREAKING] Use plain functions for AST plugins.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v0.24.0 (2017-06-20)

#### :rocket: Enhancement
* `@glimmer/compiler`, `@glimmer/syntax`
  * [#548](https://github.com/glimmerjs/glimmer-vm/pull/548) Types for AST transform plugins. ([@tomdale](https://github.com/tomdale))
  * [#540](https://github.com/glimmerjs/glimmer-vm/pull/540) Adds `SyntaxError`. ([@twokul](https://github.com/twokul))
* `@glimmer/runtime`, `@glimmer/util`
  * [#527](https://github.com/glimmerjs/glimmer-vm/pull/527) Implement memory compaction. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`
  * [#474](https://github.com/glimmerjs/glimmer-vm/pull/474) Unify dom. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#555](https://github.com/glimmerjs/glimmer-vm/pull/555) Fix static multi select test for Edge 15. ([@t-sauer](https://github.com/t-sauer))
  * [#534](https://github.com/glimmerjs/glimmer-vm/pull/534) Use correct casing for `Element.prototype.insertAdjacentHTML` position.. ([@rwjblue](https://github.com/rwjblue))
  * [#523](https://github.com/glimmerjs/glimmer-vm/pull/523) Fix scanner. ([@chadhietala](https://github.com/chadhietala))
  * [#505](https://github.com/glimmerjs/glimmer-vm/pull/505) Ensure transactions are always. ([@stefanpenner](https://github.com/stefanpenner))
  * [#503](https://github.com/glimmerjs/glimmer-vm/pull/503) Use older syntax for binary operations.. ([@rwjblue](https://github.com/rwjblue))
  * [#502](https://github.com/glimmerjs/glimmer-vm/pull/502) Remove usage of `for...of`.. ([@rwjblue](https://github.com/rwjblue))
  * [#497](https://github.com/glimmerjs/glimmer-vm/pull/497) Don't leak objects on the stack. ([@chadhietala](https://github.com/chadhietala))
  * [#495](https://github.com/glimmerjs/glimmer-vm/pull/495) Avoid errors in debug tooling when handling circular structures.. ([@rwjblue](https://github.com/rwjblue))
  * [#499](https://github.com/glimmerjs/glimmer-vm/pull/499) Ensure positional arguments are accounted for in builder.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/syntax`
  * [#550](https://github.com/glimmerjs/glimmer-vm/pull/550) Fix handlebars `parse` error. ([@robbiepitts](https://github.com/robbiepitts))
  * [#491](https://github.com/glimmerjs/glimmer-vm/pull/491) Fix @glimmer/syntax type errors. ([@tomdale](https://github.com/tomdale))
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#509](https://github.com/glimmerjs/glimmer-vm/pull/509) Fix types 2. ([@krisselden](https://github.com/krisselden))
  * [#501](https://github.com/glimmerjs/glimmer-vm/pull/501) Ensure return value from `prepareArgs` properly handles @foo interop.. ([@rwjblue](https://github.com/rwjblue))
  * [#500](https://github.com/glimmerjs/glimmer-vm/pull/500) Ensure `hasDefault` and `hasInverse` function properly.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/node`
  * [#507](https://github.com/glimmerjs/glimmer-vm/pull/507) Update NodeDOMTreeConstruction to match arg signature of `insertHTMLBefore`.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/runtime`, `@glimmer/test-helpers`, `simple-html-tokenizer`
  * [#504](https://github.com/glimmerjs/glimmer-vm/pull/504) Fix types. ([@krisselden](https://github.com/krisselden))

#### :house: Internal
* `@glimmer/syntax`
  * [#552](https://github.com/glimmerjs/glimmer-vm/pull/552) Convert `SyntaxError` and `TraversalError` to ES5 syntax. ([@robbiepitts](https://github.com/robbiepitts))
* `@glimmer/public-runtime`
  * [#538](https://github.com/glimmerjs/glimmer-vm/pull/538) Remove `packages/public-runtime`.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/runtime`
  * [#533](https://github.com/glimmerjs/glimmer-vm/pull/533) Consolidate DOM Compat. ([@chadhietala](https://github.com/chadhietala))
  * [#531](https://github.com/glimmerjs/glimmer-vm/pull/531) Copy custom element tests forward from 0.22.x.. ([@rwjblue](https://github.com/rwjblue))
  * [#524](https://github.com/glimmerjs/glimmer-vm/pull/524) Add regression test for invoking component from another.. ([@rwjblue](https://github.com/rwjblue))
  * [#513](https://github.com/glimmerjs/glimmer-vm/pull/513) Remaining updating-test strict type checking fixes. ([@krisselden](https://github.com/krisselden))
  * [#506](https://github.com/glimmerjs/glimmer-vm/pull/506) Update DOMOperations to allow creation of the useless element to be customized.. ([@rwjblue](https://github.com/rwjblue))
  * [#498](https://github.com/glimmerjs/glimmer-vm/pull/498) Remove InitializeComponentState Opcode. ([@chadhietala](https://github.com/chadhietala))
  * [#489](https://github.com/glimmerjs/glimmer-vm/pull/489) Remove unused reserved NULL_REFERENCE and UNDEFINED_REFERENCE from consts. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#528](https://github.com/glimmerjs/glimmer-vm/pull/528) Add more tests for `-in-element`.. ([@rwjblue](https://github.com/rwjblue))
  * [#510](https://github.com/glimmerjs/glimmer-vm/pull/510) more updating-test fixes. ([@krisselden](https://github.com/krisselden))
* Other
  * [#525](https://github.com/glimmerjs/glimmer-vm/pull/525) Skipped tests are bad. Hiding them doesn't fix anything.. ([@rwjblue](https://github.com/rwjblue))
  * [#522](https://github.com/glimmerjs/glimmer-vm/pull/522) Fix prod builds.. ([@rwjblue](https://github.com/rwjblue))
  * [#520](https://github.com/glimmerjs/glimmer-vm/pull/520) Fix production build.. ([@rwjblue](https://github.com/rwjblue))
  * [#517](https://github.com/glimmerjs/glimmer-vm/pull/517) update lockfile. ([@stefanpenner](https://github.com/stefanpenner))
  * [#516](https://github.com/glimmerjs/glimmer-vm/pull/516) bump ember-cli, because it has nice things. ([@stefanpenner](https://github.com/stefanpenner))
* `@glimmer/local-debug-flags`
  * [#512](https://github.com/glimmerjs/glimmer-vm/pull/512) Speed up tests by 73x by making logging opt-in. ([@stefanpenner](https://github.com/stefanpenner))

#### Committers: 8
- Alex Navasardyan ([twokul](https://github.com/twokul))
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Kris Selden ([krisselden](https://github.com/krisselden))
- Robbie Pitts ([robbiepitts](https://github.com/robbiepitts))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))
- Thomas Sauer ([t-sauer](https://github.com/t-sauer))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.24.0-beta.6 (2017-06-16)

#### :rocket: Enhancement
* `@glimmer/compiler`, `@glimmer/syntax`
  * [#548](https://github.com/glimmerjs/glimmer-vm/pull/548) Types for AST transform plugins. ([@tomdale](https://github.com/tomdale))

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#550](https://github.com/glimmerjs/glimmer-vm/pull/550) Fix handlebars `parse` error. ([@robbiepitts](https://github.com/robbiepitts))

#### Committers: 2
- Robbie Pitts ([robbiepitts](https://github.com/robbiepitts))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.24.0-beta.5 (2017-06-13)

#### :rocket: Enhancement
* `@glimmer/compiler`, `@glimmer/syntax`
  * [#540](https://github.com/glimmerjs/glimmer-vm/pull/540) Adds `SyntaxError`. ([@twokul](https://github.com/twokul))
* `@glimmer/runtime`, `@glimmer/util`
  * [#527](https://github.com/glimmerjs/glimmer-vm/pull/527) Implement memory compaction. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#491](https://github.com/glimmerjs/glimmer-vm/pull/491) Fix @glimmer/syntax type errors. ([@tomdale](https://github.com/tomdale))
* `@glimmer/runtime`
  * [#534](https://github.com/glimmerjs/glimmer-vm/pull/534) Use correct casing for `Element.prototype.insertAdjacentHTML` position.. ([@rwjblue](https://github.com/rwjblue))

#### :house: Internal
* `@glimmer/public-runtime`
  * [#538](https://github.com/glimmerjs/glimmer-vm/pull/538) Remove `packages/public-runtime`.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/runtime`
  * [#533](https://github.com/glimmerjs/glimmer-vm/pull/533) Consolidate DOM Compat. ([@chadhietala](https://github.com/chadhietala))
  * [#531](https://github.com/glimmerjs/glimmer-vm/pull/531) Copy custom element tests forward from 0.22.x.. ([@rwjblue](https://github.com/rwjblue))
  * [#524](https://github.com/glimmerjs/glimmer-vm/pull/524) Add regression test for invoking component from another.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#528](https://github.com/glimmerjs/glimmer-vm/pull/528) Add more tests for `-in-element`.. ([@rwjblue](https://github.com/rwjblue))
* Other
  * [#525](https://github.com/glimmerjs/glimmer-vm/pull/525) Skipped tests are bad. Hiding them doesn't fix anything.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 4
- Alex Navasardyan ([twokul](https://github.com/twokul))
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.24.0-beta.4 (2017-05-26)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#523](https://github.com/glimmerjs/glimmer-vm/pull/523) Fix scanner. ([@chadhietala](https://github.com/chadhietala))
  * [#505](https://github.com/glimmerjs/glimmer-vm/pull/505) Ensure transactions are always. ([@stefanpenner](https://github.com/stefanpenner))
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#509](https://github.com/glimmerjs/glimmer-vm/pull/509) Fix types 2. ([@krisselden](https://github.com/krisselden))

#### :house: Internal
* Other
  * [#522](https://github.com/glimmerjs/glimmer-vm/pull/522) Fix prod builds.. ([@rwjblue](https://github.com/rwjblue))
  * [#520](https://github.com/glimmerjs/glimmer-vm/pull/520) Fix production build.. ([@rwjblue](https://github.com/rwjblue))
  * [#517](https://github.com/glimmerjs/glimmer-vm/pull/517) update lockfile. ([@stefanpenner](https://github.com/stefanpenner))
  * [#516](https://github.com/glimmerjs/glimmer-vm/pull/516) bump ember-cli, because it has nice things. ([@stefanpenner](https://github.com/stefanpenner))
* `@glimmer/runtime`
  * [#513](https://github.com/glimmerjs/glimmer-vm/pull/513) Remaining updating-test strict type checking fixes. ([@krisselden](https://github.com/krisselden))
* `@glimmer/local-debug-flags`
  * [#512](https://github.com/glimmerjs/glimmer-vm/pull/512) Speed up tests by 73x by making logging opt-in. ([@stefanpenner](https://github.com/stefanpenner))
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#510](https://github.com/glimmerjs/glimmer-vm/pull/510) more updating-test fixes. ([@krisselden](https://github.com/krisselden))

#### Committers: 4
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Kris Selden ([krisselden](https://github.com/krisselden))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))


## v0.24.0-beta.3 (2017-05-24)

#### :bug: Bug Fix
* `@glimmer/node`
  * [#507](https://github.com/glimmerjs/glimmer-vm/pull/507) Update NodeDOMTreeConstruction to match arg signature of `insertHTMLBefore`.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/runtime`, `@glimmer/test-helpers`, `simple-html-tokenizer`
  * [#504](https://github.com/glimmerjs/glimmer-vm/pull/504) Fix types. ([@krisselden](https://github.com/krisselden))

#### :house: Internal
* `@glimmer/runtime`
  * [#506](https://github.com/glimmerjs/glimmer-vm/pull/506) Update DOMOperations to allow creation of the useless element to be customized.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2
- Kris Selden ([krisselden](https://github.com/krisselden))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v0.24.0-beta.2 (2017-05-23)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#503](https://github.com/glimmerjs/glimmer-vm/pull/503) Use older syntax for binary operations.. ([@rwjblue](https://github.com/rwjblue))
  * [#502](https://github.com/glimmerjs/glimmer-vm/pull/502) Remove usage of `for...of`.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v0.24.0-beta.1 (2017-05-23)

#### :bug: Bug Fix
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#501](https://github.com/glimmerjs/glimmer-vm/pull/501) Ensure return value from `prepareArgs` properly handles @foo interop.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/runtime`
  * [#497](https://github.com/glimmerjs/glimmer-vm/pull/497) Don't leak objects on the stack. ([@chadhietala](https://github.com/chadhietala))

#### :house: Internal
* `@glimmer/runtime`
  * [#498](https://github.com/glimmerjs/glimmer-vm/pull/498) Remove InitializeComponentState Opcode. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 2
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v0.24.0-alpha.2 (2017-05-23)

#### :rocket: Enhancement
* `@glimmer/runtime`
  * [#474](https://github.com/glimmerjs/glimmer-vm/pull/474) Unify dom. ([@chadhietala](https://github.com/chadhietala))

#### :bug: Bug Fix
* `@glimmer/runtime`, `@glimmer/test-helpers`
  * [#500](https://github.com/glimmerjs/glimmer-vm/pull/500) Ensure `hasDefault` and `hasInverse` function properly.. ([@rwjblue](https://github.com/rwjblue))
* `@glimmer/runtime`
  * [#495](https://github.com/glimmerjs/glimmer-vm/pull/495) Avoid errors in debug tooling when handling circular structures.. ([@rwjblue](https://github.com/rwjblue))
  * [#499](https://github.com/glimmerjs/glimmer-vm/pull/499) Ensure positional arguments are accounted for in builder.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v0.24.0-alpha.1 (2017-05-19)

#### :house: Internal
* `@glimmer/runtime`
  * [#489](https://github.com/glimmerjs/glimmer-vm/pull/489) Remove unused reserved NULL_REFERENCE and UNDEFINED_REFERENCE from consts. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 1
- Chad Hietala ([chadhietala](https://github.com/chadhietala))


## v0.23.0-alpha.15 (2017-05-16)

#### :bug: Bug Fix
* `@glimmer/runtime`
  * [#487](https://github.com/glimmerjs/glimmer-vm/pull/487) Fix predicate for iterator to be more declarative. ([@chadhietala](https://github.com/chadhietala))
* Other
  * [#485](https://github.com/glimmerjs/glimmer-vm/pull/485) Update @glimmer/build to 0.8.1. ([@tomdale](https://github.com/tomdale))
* `@glimmer/runtime`, `@glimmer/wire-format`
  * [#481](https://github.com/glimmerjs/glimmer-vm/pull/481) Fix some of the content deopt cases. ([@chadhietala](https://github.com/chadhietala))

#### :house: Internal
* `@glimmer/object-model`, `@glimmer/runtime`, `@glimmer/test-helpers`, `@glimmer/util`
  * [#486](https://github.com/glimmerjs/glimmer-vm/pull/486) Remove forEach/map where we are creating context objects. ([@chadhietala](https://github.com/chadhietala))
* `@glimmer/local-debug-flags`, `@glimmer/runtime`
  * [#482](https://github.com/glimmerjs/glimmer-vm/pull/482) Skip top level custom element tests for now.. ([@krisselden](https://github.com/krisselden))

#### Committers: 3
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Kris Selden ([krisselden](https://github.com/krisselden))
- Tom Dale ([tomdale](https://github.com/tomdale))


## v0.23.0-alpha.13 (2017-05-09)

#### :rocket: Enhancement
* `@glimmer/compiler`, `@glimmer/object`, `@glimmer/runtime`, `@glimmer/syntax`
  * [#475](https://github.com/glimmerjs/glimmer-vm/pull/475) More type fixes. ([@chadhietala](https://github.com/chadhietala))

#### :memo: Documentation
* [#478](https://github.com/glimmerjs/glimmer-vm/pull/478) Publish packages with licenses. ([@chadhietala](https://github.com/chadhietala))

#### :house: Internal
* `@glimmer/local-debug-flags`, `@glimmer/runtime`
  * [#472](https://github.com/glimmerjs/glimmer-vm/pull/472) Introduce local dev flags. ([@chadhietala](https://github.com/chadhietala))

#### Committers: 2
- Chad Hietala ([chadhietala](https://github.com/chadhietala))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v0.21.2 (2017-01-18)

#### :bug: Bug Fix
* `@glimmer/syntax`
  * [#390](https://github.com/glimmerjs/glimmer-vm/pull/390) Test nested 'else if' body location with whitespace eaten. ([@fhrbek](https://github.com/fhrbek))

#### Committers: 2
- Filip Hrbek ([fhrbek](https://github.com/fhrbek))
- Robbie Pitts ([robbiepitts](https://github.com/robbiepitts))
