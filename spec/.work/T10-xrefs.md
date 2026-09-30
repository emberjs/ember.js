# T10 — hand-check §-cross-references

`xref.py` only checks that a target exists. T2 found six refs pointing at the wrong section
and T5 spot-checked 41 (1 wrong). This task checks the rest.

Run `python3 spec/tools/xref-context.py <chapter.md>`. Each entry shows the reference, the
heading it resolves to, and the line it appears on. For each, judge whether the target
section is about what the sentence means. Only flag real mismatches (e.g. "destruction order
(§05-12)" when §05-12 is "Errors"); a reference to a parent section instead of the exact
subsection is fine. For each mismatch, find the right section and fix the reference. If you
cannot tell, list it under "Unsure" below instead of changing it.

Resume from the first unticked item. Commit after each chapter: `spec(T10): <chapter>`.

- [x] 00-overview.md (84 refs, 0 fixed)
- [x] 01-authoring-formats.md (104 refs, 0 fixed)
- [x] 02-syntax.md (77 refs, 0 fixed)
- [x] 03-static-semantics.md (119 refs, 0 fixed)
- [x] 04-wire-format.md (145 refs, 0 fixed)
- [x] 05-runtime-semantics.md (172 refs, 0 fixed)
- [x] 06-managers.md (105 refs, 0 fixed)
- [x] 07-reactivity.md (123 refs, 0 fixed)
- [ ] 08-ember-integration.md
- [ ] `python3 spec/tools/xref.py` prints nothing

## Fixed
## Unsure
