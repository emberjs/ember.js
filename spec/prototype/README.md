# Prototypes

Throwaway implementations of **[Proposed]** API, used to test what the spec claims about it.
They are not part of the specification and are not meant to ship.

| Directory | Spec | What it is |
|---|---|---|
| `reactive/` | §07-2.2, §07-2.7, §07-2.8 | `cached`, `isValid`, `isConst`, `untrack`, `effect`, the `createCache`/`@cached` compat layer, an asynchronous resource, and a fake RFC 957 frame strategy, layered on the built `@glimmer/validator`. |

Run with `node --test spec/prototype/reactive/test.mjs` after `pnpm build` (it imports
`dist/dev`). Each test names the rule it checks.
