# T5 — Final read-through

- [x] Each chapter complies with CONVENTIONS.md: normative language, the [Loose mode], [Legacy], [Dev] and [Proposed] markers, and an Open questions section
  - Every chapter 01–08 ends with an Open questions section; 00's §0.7 is the consolidated index, so no separate section was added.
  - Markers added: 05 §3.5 item 1, §7.1 rows, §7.2 string branch, §7.3 `positionalParams`, §7.6 heading, §7.8 string curry ([Loose mode]/[Legacy]); 01 §1.7.3 and §1.9 headings [Loose mode]; 07-3.7 and 08 §3 headings [Legacy] (to match 06 §6.5); [Dev] on 02 §7 builder assertions, 03-7.11 DEBUG rewrite, 07-3.1.2 classic-decorator marking.
  - Normalized `[Dev, Ember]` (03) and `[Dev, test support]` (06) to `**[Dev]** (…)`.
  - MUST inside non-normative *Note:* / *Implementation note:* labels (06 §4.4 region trigger, 08 §1.4 AST-plugin note): dropped the label so the requirement is normative. No other MUST/SHOULD misuse found; 04 has none.
- [x] 00-overview §0.6 verification status is accurate (use STATUS.md)
  - §01 no longer says "a few citations spot-checked"; added that T3 hand-checked flagged citations in every chapter and that the two unsupported claims were rewritten.
- [x] No remaining normative wire-format requirements
  - 04 has no MUST/SHOULD. Softened 02 §8.2 heading ("normative for … the wire format's debug info") and 05 intro ("represented as the constructs of the wire format"). 01 §1.10 and 08 §14 already say wire format need not be accepted.
- [x] §00-0.4 says the [Proposed] primitive is used by "the other chapters". Only 07 and 08 use `isValid`/`onInvalidate`, so fix the wording
  - In fact only 07 uses it: 08's `isValid` (§08-9.1) is the renderer's own method. Fixed §0.4 and §0.7.10 wording and disambiguated the 08 sentence.
- [x] Spot-check about 30 `§NN-x.y` cross-references for pointing at the *intended* section. xref.py only checks that the target exists (see the T2 note in STATUS.md)
  - 30 refs sampled at random across all chapters (6 from 05, 2 from 00, 3 from each other chapter), plus the 11 cross-chapter refs to §06-10/§06-11 and a search for §05-12 refs (none remain). 41 checked, 1 fixed: §01-1.7.3 cited §1.5.6 (hbs output) for bindings added by AST transforms; now cites §1.5.7 (jsutils) and §1.5.6.
- [x] Run xref.py and check-citations.py cleanly (xref prints nothing; every chapter total=ok)
- [x] STATUS.md reflects the final state (T5 done, chapter table refreshed, Next steps added)
- [x] Commit
