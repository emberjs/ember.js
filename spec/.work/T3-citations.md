# T3 — Citation verification

Tools: `spec/tools/check-citations.py` (existence and range),
`spec/tools/check-citation-semantics.py <chapter> --only NEAR,MISS` (whether the cited lines
contain the identifiers named in the prose), and `spec/tools/fix-citations.py` (apply a fix
and log it to `tools/fixes.log`). Only change the numbers or paths inside citations. When the
code doesn't support a claim, do not rewrite the prose. Record it under "Unsupported claims"
below, with the chapter, the spec line and the reason.

- [ ] Range errors: fix the 2 in 07 (tracked-test.js continuation ranges)
- [ ] Semantic pass 06-managers.md (NEAR/MISS triaged and fixed)
- [ ] Semantic pass 07-reactivity.md
- [ ] Semantic pass 05-runtime-semantics.md
- [ ] Semantic pass 01-authoring-formats.md
- [ ] Semantic pass 08-ember-integration.md
- [ ] Semantic pass 03, 02 (lower priority; those were checked more closely when written)
- [ ] Commit after each chapter

## Unsupported claims
