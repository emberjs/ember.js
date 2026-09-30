# T5 — Final read-through

- [x] Each chapter complies with CONVENTIONS.md: normative language, the [Loose mode], [Legacy], [Dev] and [Proposed] markers, and an Open questions section
  - Every chapter 01–08 ends with an Open questions section; 00's §0.7 is the consolidated index, so no separate section was added.
  - Markers added: 05 §3.5 item 1, §7.1 rows, §7.2 string branch, §7.3 `positionalParams`, §7.6 heading, §7.8 string curry ([Loose mode]/[Legacy]); 01 §1.7.3 and §1.9 headings [Loose mode]; 07-3.7 and 08 §3 headings [Legacy] (to match 06 §6.5); [Dev] on 02 §7 builder assertions, 03-7.11 DEBUG rewrite, 07-3.1.2 classic-decorator marking.
  - Normalized `[Dev, Ember]` (03) and `[Dev, test support]` (06) to `**[Dev]** (…)`.
  - MUST inside non-normative *Note:* / *Implementation note:* labels (06 §4.x region trigger, 08 §1 AST-plugin note): dropped the label so the requirement is normative. No other MUST/SHOULD misuse found; 04 has none.
- [ ] 00-overview §0.6 verification status is accurate (use STATUS.md)
- [ ] No remaining normative wire-format requirements
- [x] §00-0.4 says the [Proposed] primitive is used by "the other chapters". Only 07 and 08 use `isValid`/`onInvalidate`, so fix the wording
  - In fact only 07 uses it: 08's `isValid` (§08-9) is the renderer's own method. Fixed §0.4 and §0.7.10 wording and disambiguated the 08 sentence.
- [ ] Spot-check about 30 `§NN-x.y` cross-references for pointing at the *intended* section. xref.py only checks that the target exists (see the T2 note in STATUS.md)
- [ ] Run xref.py and check-citations.py cleanly
- [ ] STATUS.md reflects the final state
- [ ] Commit
