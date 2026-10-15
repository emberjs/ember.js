# T24 — Author feedback `03c77f86b4`: the old implementation can be out of spec

Feedback (in `users-todo-list.md` item 1):

- Mustaches inside HTML comments are part of the comment. The HTML parse takes precedence:
  mustache states are recognized only in HTML states where they belong. This differs from the
  current implementation, and that is accepted. Bringing the current implementation into line is
  out of scope, so the spec is not blocked on deprecation decisions.
- `{{"foo" bar}}` (T20) is an error in the spec. Backward compatibility is key, but case by case
  the old implementation can be the one that is out of spec. How and when it is fixed is out of
  scope.
- T21 timing (RFC, guides): out of scope.
- Document clearly in the spec every place where the old implementation is out of spec.

Resume from the first unticked item.

- [x] 1. Markers: [Out of spec] means the spec states the required behavior and the current
      implementation does not conform; how and when it is brought into line is out of scope.
      [Deprecated] is the case where a deprecation is already planned. CONVENTIONS, §0.5, §0.1.
- [x] 2. A consolidated list in §00 (new §0.5.1) of every place the current implementation is
      out of spec, each linking to its owning section.
- [x] 3. §02 HTML comments: §02-1.1 properties (1 gets the comment exception as a rule, 3 becomes
      "block delimiters belong to content"), §02-1.4 rationale, §02-1.5 note, §02-5 intro,
      §02-6.7, §02-6.9 step 2, §02-6.10, §02-6.11, §02-6.1 bullet.
- [x] 4. §02 straddling blocks in tags: [Out of spec] error (E49, E50), messages from the T22
      branch.
- [x] 5. §02 literal mustache with arguments (T20): §02-3.7 error, E48, §02-11 item 1.
- [x] 6. §02-11 items 1, 17 rewritten as decided; §00-0.7.2 items 5, 6.
- [x] 7. STATUS (decisions, T20/T22/T21 rows, next steps), users-todo-list item 1 removed.
- [x] 8. `xref.py`, `check-citations.py`; commit.

Notes:

- Scope of "states where they belong": applied to the HTML comment states only. Markup
  declarations and doctype keep E47; `<script>`/`<style>`/`<title>` text keeps recognizing
  mustaches (templates depend on it). Recorded as §02-11 item 19.
- A closer inside an HTML comment is comment text, so `{{#if x}}<!--{{/if}}-->` has an unclosed
  block (E1). T22's option (b) for `{{else}}` falls out of the same rule, and its comment-closer
  error is no longer needed.
