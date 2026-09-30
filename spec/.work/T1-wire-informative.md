# T1 — Recast chapter 04 as informative

Context: see STATUS.md "Decisions". Wire format is not a compatibility requirement, and addons ship
template source. Chapter 04 keeps its content as documentation of the current encoding, but
contains no conformance requirements.

- [ ] 04 §4.1: rewrite "Status, scope and conformance" to say the chapter is informative. Remove
      "must accept / should accept as legacy / may reject", and state the decision with a
      pointer to §00-0.2.
- [ ] 04: change the remaining MUST/SHOULD/MAY in 04 to descriptive language ("the current
      compiler emits…", "the runtime reads…"), leaving quoted source untouched.
- [ ] 04 §4.11 (version history): keep it as history. Drop the compatibility recommendations
      (e.g. "accept the 5.9–6.3 shape as legacy") and reframe them as notes.
- [ ] 04 §4.13 consumer checklist: retitle as a reading aid, or remove its normative force.
- [ ] 04 §4.14 open questions: remove or reword items that only matter if wire compatibility
      were required.
- [ ] CONVENTIONS.md: in the chapter table and "Abstraction rules", describe 04 as informative
      and drop "the wire format that precompiled templates ship in" as a normative example.
- [ ] Other chapters: `grep -n -i "wire" spec/0[1-35-8]*.md`. Wherever a chapter *requires*
      accepting wire format, or treats it as a compat surface, reword it. Plain
      cross-references to §04 for "how this is encoded" are fine.
- [ ] Run `python3 spec/tools/xref.py` (must print nothing) and commit.
