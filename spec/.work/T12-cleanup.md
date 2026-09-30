# T12: open-question cleanup + the ten inline notes committed in 8e838d47cd

The ten notes were uncommitted edits swept into 8e838d47cd by a `git commit -a`; they were
not acted on until now. Resolve from the first unticked item. Stage only files I edited.

## A. Rulings to incorporate (then delete the note)
- [x] §0.7.1 item 2 / §01-1.11 item 1: `template()` uses `strict` (RFC 0931, default true); no naming question. Recast: remaining issue is that `strict: false` is honored only by babel hbs (T9a). Ask author.
- [x] Coarse update granularity kept (§06-12 Q12 note): resolve §06-12 Q12, §08-14 Q11, §05-14 item 4, §0.7.1 item 3; state as normative in §06-4.4 / §05-1.6 / §08-6.7 if not already.
- [x] Evaluation timing/count is not part of the contract (§0.7.1 items 8, 9 notes): resolve §06-12 Q5, Q6, §07-5 item 5; add normative statement (§07-4.2 currently requires "no more evaluations than today" — change); check §05/§06 text that pins evaluation counts.
- [x] `each` key read once — keep (§05-14 item 5): make §05-5.4.2 normative, remove item.
- [x] `#each` holes vs `#each-in` — keep (§05-14 item 17): remove item.

## B. Bugfix branches (origin/main; failing tests commit, then fix; not pushed)
- [x] B1 triple curlies ignored for literals and keyword appends (§05-14 item 18, §05-3.5 item 6, §0.7.1 item 5)
- [x] B2 namespaced attribute updates drop the namespace after removal (§05-14 item 1)
- [x] B3 `<svg>` inside `<foreignObject>` created in the HTML namespace (§05-14 item 9)
- [x] B4 duplicate attributes / named arguments become compile errors (§05-14 item 19, §0.7.1 item 4); commit message = complete explainer; author opens the PR for discussion

## C. Cleanup pass
- [x] Remove resolved items (conclusions already in the normative text) from every open-question list: §0.7, §01-1.11, §02-11, §03-10, §04-4.14, §05-14, §06-12, §07-5, §08-14. Trim partly resolved items to their open remainder. Remove transitively resolved items ("Recorded as …, which owns it" pointers to removed items).
- [x] Renumber numbered lists and rewrite every "§NN-x item N" / "0.7.x item N" reference (Q-labels in §06-12 / §08-14 stay as stable IDs; gaps are fine). Update STATUS references.
- [x] xref.py, check-citations.py, items check
