# User's todo list

This is not a todo list for agents to work on, this is a todo list for human reviewers to provide required inputs.

Last refreshed 2026-11-04 (T27, after merging `origin/main` at `493985e956`). Each item names the
spec section that owns it; §00-0.7 is the longer index.

## Decisions still needed to complete the spec

**1. Preserve or change (§0.7.1).** Each of these changes normative text:

1. `template()` ignores `strict: false` except through babel `hbs`. Should the other paths honour it, or is `template()` strict-only? (§01-1.11 item 1)
2. Duplicate attributes and named arguments: should they be errors? PR #21718 is open and approved. If it lands, the spec makes them errors. (§05-14 item 13)
3. Triple curlies are ignored for string literals and keyword appends (`{{{"<b>"}}}` renders text). Is that a bug? A fix is on the local branch `fix/triple-curly-literals-and-keywords`, which is not pushed. (§05-14 item 12)

**2. New since the T27 merge.**

1. *Deprecated legacy features.* RFC 1253 (`mut`), RFC 1248 (`readonly`) and RFC 1216 (the classic `Component` class) are accepted but not implemented yet. The spec keeps them **[Legacy]**, which means a new implementation must provide them. Should any of them become **[Deprecated]**, which means a new implementation SHOULD NOT include it? This was done for the Handlebars leftovers, but those had almost no users; these three are widely used, and the STATUS decisions keep classic components in scope. (§08-14 Q17)
2. *Dynamic scope.* The ruling of 2026-10-08 makes any key other than `outletState` a [Dev] assertion. But that assertion is only in Ember's classic `DynamicScope`, below an `appendTo` root. An application's root and `renderComponent` roots use Glimmer's general scope, which accepts any key (found from source, not yet run). The options are:
   - keep the ruling, and mark the current implementation **[Out of spec]**;
   - limit the assertion to classic roots;
   - let general dynamic scope stand.

   (§05-14 item 16, §05-5.8)
3. *`{{outlet}}`* inside a component works again below classic routes (#21762). Two leftovers are described as normative unless you rule otherwise:
   - `{{outlet}}` in a component below a non-classic route manager asserts.
   - `@outlet` is visible as an ordinary argument of every route template.

   (§08-14 Q2)

**3. Suspected bugs (§0.7.2–0.7.8, about 25 items).** For each one: preserve it, or mark it `[Out of spec]`. A blanket rule would settle most of them at once, for example "a bug with no plausible dependents is `[Out of spec]`". These matter most for a new implementation:

- A strict `<x.y/>` with `x` unbound becomes an element. (§03-10 item 3)
- `{{#let … as |this|}}` rebinds `this`. (§03-10 item 4)
- The babel and runtime compile paths shadow names differently. Separately, the `trackLocals` bug lets an inner block param delete an outer one. (§03-10 items 1, 12–14)
- The component-definition cache ignores the owner. (§06-12 Q15)
- Production builds behave differently from development builds in ways code can observe. (§06-12 Q7, Q1, Q9; §05-14 item 15)

**4. The `[Proposed]` reactive core (§0.7.10, §07-5 items 14–19).** Accept it or reject it. If you accept it, other chapters could state their update rules with it.

**5. Required conformance profiles (§09-9.8 Q2).** SSR is already optional. The proposal makes Core, Dev, Loose mode, Legacy and Ember integration required, and that still needs a ruling. Workstreams W1 and W4–W9 wait on it. If any of item 2.1 becomes [Deprecated], the Legacy profile shrinks with it.

**6. Smaller rulings**

- §08-14 Q16: in loose mode, should a free name used as an argument be a compile-time error? Today it fails at runtime with a message about strict mode.
- §02-11 item 19: HTML-first parsing, state by state.
  - `{{` is a construct in text (including `<script>`, `<style>` and `<title>`) and in a start tag's attribute list.
  - It is comment text inside comments.
  - It is an error in tag names, end tags, markup declarations and doctypes.

  This keeps today's behavior everywhere except comments. Is that OK, or should `<script>` text or markup declarations go the other way?
- §02-1.4 item 5: the `<pre>`/`<textarea>` newline fix changes rendered whitespace in 7 corpus templates, in each case to what the source says. The rule also matches `<Textarea>` and `<Pre>` components, because the comparison ignores case. Should it apply only to the lowercase HTML elements?
- §02-11 item 6: numeric references now decode as in HTML, upstream too (simple-html-tokenizer 1.0.0). HTML also decodes a reference with no `;` (`&#65`, and legacy names such as `&amp` and `&lt`), which a template keeps literal. Should that follow HTML too?

Most of what is left is approving known work rather than open design. The exceptions are item 4, item 2.1 and the bug rulings in item 3.

## Upstream housekeeping (does not block the spec)

- Close emberjs/ember.js#21640: #21762 superseded it, including its tests.
- `fix/namespaced-attribute-updates`, `fix/svg-inside-foreign-object` and `fix/triple-curly-literals-and-keywords` are local branches with no PR. `fix/literal-mustache-arguments` is pushed to `origin` but has no PR.
- RFC 1249 is accepted. The deprecation guides are ember-learn/deprecation-app#1442, and the four deprecations still need implementing in Ember.
- `fix/blocks-straddling-markup` (T22) is parked. Rendering tests for `{{else …}}` chains (T23) are planned.
- The remote branch `test/w2-glimmer-harness` on `origin` is superseded and can be deleted.
