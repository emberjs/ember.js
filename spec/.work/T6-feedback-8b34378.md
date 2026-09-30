# T6–T10: feedback from 8b343781b3 and STATUS todos

Resume from the first unticked item. Commit after each item: `spec(T6): ...` etc.

## T6 — author feedback (Opus)
- [ ] T6a hbs round-trip ruling: published hbs must execute faithfully; addon pre-publication
      tooling (babel `hbs` re-printing) is outside the primary scope. Update STATUS decision,
      §0.2 (if it mentions it), §0.7.1 item 1 (remove blockquote), §0.7.5, §01-1.11 item 15, §02-10.
- [ ] T6b AST-transform non-goal (plan.md "Non-goals"): the behavior of Ember's internal
      transforms is normative, the transforms themselves are not; custom user AST plugins and
      the ASTv1 shape are not part of the spec. Survey every chapter, recast, add to §0.2 and
      STATUS decisions.

## T7 — landed fixes (Opus)
- [ ] §02-6.9, §02-9 (error catalogue), §02-11 items 1, 2, 7 rewritten for #21635
- [ ] §03-10 item 11 and any §03 normative text on each-in
- [ ] §01-1.2.4 and §01-1.11 item 7 for content-tag 4.2.1
- [ ] §0.7 entries, STATUS "Still to do" cleared

## T8 — citation refresh after merging main (Sonnet agent) — checklist .work/T8-citations.md
## T9 — verification gaps (Sonnet agents, one at a time)
- [ ] T9a run babel plugin + runtime `template()` eval against §01/§03 claims — .work/T9a-compile-paths.md
- [ ] T9b orderings in §05-14 item 20 via throwaway tests — .work/T9b-orderings.md
## T10 — hand-check remaining §-cross-references (Sonnet agent) — .work/T10-xrefs.md

## Not attempted (need author decisions or are separate projects)
- §0.7.1 items 2–10 decisions, [Proposed] primitive review, suspected-bug rulings
- Conformance suite (Next steps item 5)
