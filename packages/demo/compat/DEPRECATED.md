# DEPRECATED — GXT compat layer old location

This directory (`packages/demo/compat/`) is the **original** location for the
GXT compat layer. It is preserved here during the dual-backend transition
period to avoid breaking any local tooling or developer scripts that reference
these files directly.

## Where the code lives now

The canonical location is:

```
packages/@ember/-internals/gxt-backend/
```

This move happened in Phase 1 of the dual-backend integration plan
(commit `9f86bc2276`). See the status table in `GXT_INTEGRATION_PLAN.md`
at the repository root for the full phase-to-commit mapping.

## What references the new location

Both the Rollup alias table (`rollup.config.mjs`) and the Vite alias table
(`packages/demo/vite.config.mts`) have been updated to resolve
`@glimmer/*`, `ember-template-compiler`, and `@lifeart/gxt` imports through
`packages/@ember/-internals/gxt-backend/`. The files in this directory are
**not** referenced by either alias table and are therefore not included in
any build output.

## Cleanup plan

This directory will be removed in a future cleanup task once all downstream
consumers (local scripts, IDE workspace configs, any external forks) confirm
they have updated their references to the new location. A tracking issue
should be opened against this repository before deletion.

Do not add new files here. Direct all compat-layer changes to
`packages/@ember/-internals/gxt-backend/`.
