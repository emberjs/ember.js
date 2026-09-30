# T5 — Final read-through

- [ ] Each chapter complies with CONVENTIONS.md: normative language, the [Loose mode], [Legacy], [Dev] and [Proposed] markers, and an Open questions section
- [ ] 00-overview §0.6 verification status is accurate (use STATUS.md)
- [ ] No remaining normative wire-format requirements
- [ ] §00-0.4 says the [Proposed] primitive is used by "the other chapters". Only 07 and 08 use `isValid`/`onInvalidate`, so fix the wording
- [ ] Spot-check about 30 `§NN-x.y` cross-references for pointing at the *intended* section. xref.py only checks that the target exists (see the T2 note in STATUS.md)
- [ ] Run xref.py and check-citations.py cleanly
- [ ] STATUS.md reflects the final state
- [ ] Commit
