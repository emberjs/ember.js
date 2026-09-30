# T3 — Citation verification

Tools: `spec/tools/check-citations.py` (existence and range),
`spec/tools/check-citation-semantics.py <chapter> --only NEAR,MISS` (whether the cited lines
contain the identifiers named in the prose), and `spec/tools/fix-citations.py` (apply a fix
and log it to `tools/fixes.log`). Only change the numbers or paths inside citations. When the
code doesn't support a claim, do not rewrite the prose. Record it under "Unsupported claims"
below, with the chapter, the spec line and the reason.

- [x] Range errors: fix the 2 in 07 (tracked-test.js continuation ranges)
- [x] Semantic pass 06-managers.md (NEAR/MISS triaged and fixed)
- [x] Semantic pass 07-reactivity.md
- [ ] Semantic pass 05-runtime-semantics.md
- [ ] Semantic pass 01-authoring-formats.md
- [ ] Semantic pass 08-ember-integration.md
- [ ] Semantic pass 03, 02 (lower priority; those were checked more closely when written)
- [ ] Commit after each chapter

## Unsupported claims

- 07-reactivity.md:1281-1284 (§07-4.3): the cited test `components/tracked-test.js:529-580` passes
  args down and reads `@person.full` / writes via `this.args.person`, but no test compares
  `@x` with `this.args.x` directly. The equivalence is source-derived (args-proxy.ts:32-56),
  not test-pinned.

Notes: `check-citation-semantics.py` could not import `check` (it lives in check-citations.py);
patched to load it by path. Its NEAR/MISS output has many false positives: test-name strings that
live in a different file than the resolved one, and labels resolved to the wrong file (for
example bare `:560-601` after an `rfcs/...` mention in 07-3.x, which is really `computed.ts`).
Chapters 06 and 07: every NEAR/MISS was opened and confirmed correct except as listed above.
