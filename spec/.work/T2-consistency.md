# T2 — Cross-chapter consistency pass

For each item in STATUS.md "Cross-chapter findings":
1. check the source code to decide which chapter is right;
2. fix the wrong text;
3. make the non-owner chapters cross-reference the owner (see the chapter table in
   CONVENTIONS.md);
4. tick the item and add a one-line note of what changed;
5. commit every 2–3 items.

A first attempt was interrupted. It may have edited some chapters without recording anything,
so check the current text before editing.

- [x] 1 terminology (§07-0 vocabulary; "region", "re-validated", "render transaction", "commit phase")
  — §07-0 now defines commit phase and component region and maps §05's "update pass" to revalidation; 05 and 06 intros point to §07-0.
- [x] 2 no default modifier/component manager
  — no chapter claimed otherwise; §05-3.2, §05-10.2 and §08-5.4 now cite §06-1.5.
- [x] 3 updateComponent/didUpdate fire on region changes
  — §05-1.6 owns the rule, §06-4.4 cites it; §08-6.7 said "only when args changed or rerender()" (wrong, fixed from curly.ts:442-472); open question merged into §06-12 Q12 (07-5 item 6 and 05 Q4 now point there; 07's "only test changes an argument" was wrong).
- [x] 4 commit-phase and destruction ordering
  — source (environment.ts:50-96, dom.ts:137-191) confirms installs post-order, updates pre-order; §06-11 now owns the order (05-1.4, 07-1.10, 07-4.10 point to it); §05-11.2 now cites §06-10.2's algorithm; §06-10.3 cites §05-11 for order; 06 Q10 merged into 05 Q11. Fixed §08-6.7: classic willDestroy runs in the `actions` queue (scheduled by component.destroy()), not `destroy`. Also fixed six §05-12 refs that meant §05-11 (Destruction).
- [x] 5 curried-component owner
  — 05/06 already agreed with component.ts:304-360,420-440,815-853; 05 Q3 now points to §06-12 Q3 (which adds the definition-record owner); §08-8.6 gained an engine paragraph.
- [x] 6 outlet is `<@outlet/>`, lexical
  — 03/04/05 did not call it dynamic, but §05-5.8 and §04-4.6.12/4.8.17 said Ember outlets use the dynamic-var keywords; no current Ember code emits them (grep), fixed. §03-7.10 now states lexical scoping and cites §08-8.3.
- [x] 7 action keyword vs removed runtime
  — probed: loose `{{action …}}` append is a keyword-misuse compile error, strict compiles all forms; §03-7.3 fixed, §08-2.20 now gives per-position runtime errors (modifier message says "it was not in scope"); 03-10 #15 points to §08-14 Q7.
- [x] 8 loose-mode free names (argument position; silent `{{foo}}`)
  — chapters agreed (probed `{{foo bar}}` → `[31,1]`); §03-5.3 owns static side and cites §08-14 Q1/Q16; 04 Q2/Q3 now point to 08.
- [x] 9 auto-imported strict built-ins list identical everywhere
  — all three lists match auto-import-builtins.ts:10-25 (14 names); §08-1.2/Q3 no longer call them "keywords"; 01-1.6.3 and 08-1.3(a) cite §03-7.1 as normative.
- [x] 10 lexical scope timing
  — §01-1.8.5 owns it; corrected "at most once" (thunk can run up to 3 times; values captured once) and added that a component's layout (and scope) is built at definition creation, possibly before it renders (constants.ts:197-219); 04-4.3.3 and 05-1.1 point there.
- [x] 11 component-definition cache ignores owner
  — new §06-12 Q15 owns it (cache is per renderer, base-renderer.ts:627); §06-1.7, §01-1.8.2 note, 01 Q11 and 04 Q4 point there.
- [x] 12 trackLocals bug described once
  — confirmed in utils.ts:28-65; §03-10 item 12 now holds both parts (count bug with 01's example, element-param visibility); 01 Q5 points there.
- [x] 13 `{{this.fn}}` plain function → helper
  — 05 and 06 agreed with content.ts:34-69; 06-1.6 cites §05-3.2/§05-3.5; 06 Q14 merged into 05 Q8.
- [x] 14 eager helper creation vs lazy values
  — §05-1.1 now separates eager static-helper instance creation (creation order from opcode-compiler syntax/expressions.ts:104-110) from lazy value computation, incl. the template-only unreferenced-arg case; §05-9.1 and §07-4.5 cite it.
- [x] 15 triple-curly keyword/string literal renders as text
  — probed (`{{{"<b>"}}}`→[2,…] text; `{{{if}}}`, `{{{(if)}}}`, `{{{helper h}}}`, `{{{has-block}}}`, `{{{log}}}`→non-trusting append); owner §05-3.5 item 6 + new 05 open question 18; 03-10 #5 and 04 Q6 point there.
- [x] 16 babel hbs round-trip (now compat-relevant; ensure §01-1.5 states it normatively or as an open question)
  — re-verified the three lossy cases with built @glimmer/syntax; §01-1.5.6 now states the emitted source normatively (plugin uses its own @glimmer/syntax) and new §01-1.11 item 15 owns the decision; 02 Q15 points there.
- [x] 17 Ember transforms summary in 05 vs §03-7 / §08-1.4
  — probed each/each-in/style/in-element in both modes. Double `-track-array` confirmed in both modes; now §03-7.8 + new 03-10 item 22 (04 Q9, 08-1.4(8), 05-5.4.1 cite it). Fixed §08-1.4(1)/§08-10.6: `style="a {{x}}"` does warn (dynamic.ts:31-33). 05-5.7 now says `-in-el-null` depends on `isProduction`.
- [x] 18 duplicate attributes / hash keys runtime meaning
  — from source + compile probes: §05-4.9 (simple element last-wins, no class merge; deferred last-wins with merge; duplicate `type` keeps only the last, verified) and §05-7.3 (layout `@a` = first occurrence, manager args = last); new 05 open question 19 (untested); 02 Q20 points there.
- [x] 19 element parameter order; unless → if(not)
  — probed; §05-4.1 owns the order (type moved at compile time whenever there is no `...attributes`, even with modifiers; case-sensitive); fixed §04-4.5.8/§04-4.8.10 ("in source order") and the wrong range-input explanation in §05-4.5.2; unless→if(not) verified, §05-5.2 cites §03-4.4.
- [x] 20 renderComponent inside a transaction
  — base-renderer.ts:282-360: a root added mid-render is rendered in a later loop iteration = new runtime transaction with its own commit; §05-1.4 now states Ember's deferral, §07-1.10 item 5.1 corrected ("same transaction" was wrong; old roots are revalidated again), §08-9.1 aligned; Q9 stays open in 08.
- [x] 21 terms 07 and 06 must define
  — constant (§07-0/§07-1.5), component region (added in item 1), `[]` cell (§07-3.6.6) and the default helper manager's trailing named-args proxy (§06-6.3/§06-3.2) were already defined; 05-1.6/05-1.7/08 intro/08-2.6 now cite them. Fixed 08 intro claim that tracked arrays dirty `[]` (they use their own collection cell; -track-array.ts:17-30).
- [ ] Also: grep all chapters for references/tags/revisions/opcodes in normative prose (not citations, paths, or marked implementation notes; opcodes are fine in 04), and rephrase using §07 terms
- [ ] Update STATUS.md: remove reconciled findings and mark T2 done
- [ ] Final `python3 spec/tools/xref.py` and commit
