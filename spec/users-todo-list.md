# User's todo list

This is not a todo list for agents to work on, this is a todo list for human reviewers to provide required inputs.

## Decisions still needed to complete the spec

**1. Preserve or change (§0.7.1).** Each of these changes normative text:

1. `template()` ignoring `strict: false` except through babel `hbs`: should the other paths honour it, or is `template()` strict-only?
2. Duplicate attributes and named arguments: should they be errors? PR #21718 is open.
3. Triple curlies are ignored for literals and keywords. The fix branch is open for review.

**2. Suspected bugs (§0.7.2–0.7.8, about 25 items).** For each one: preserve it, or mark it `[Out of spec]`. A blanket rule would clear most of these at once, for example "a bug with no plausible dependents is `[Out of spec]`". The ones that matter most for a new implementation:

- A strict `<x.y/>` with `x` unbound becomes an element.
- `{{#let … as |this|}}` rebinds `this`.
- The babel and runtime compile paths shadow names differently, and the `trackLocals` bug lets an inner block param delete an outer one.
- The component-definition cache ignores the owner.
- Production builds behave differently from development builds in ways code can observe.

**3. The `[Proposed]` reactive core (§0.7.10, §07-5 items 14–19).** Accept it or reject it. If accepted, other chapters could state their update rules with it.

**4. Required conformance profiles (§09-9.8 Q2).** SSR is already optional. The proposal makes Core, Dev, Loose mode, Legacy and Ember integration required, and that still needs a ruling. The workstreams W1 and W4–W9 wait on it.

**5. Smaller rulings**

- §08-14 Q16: in loose mode, should a free name used as an argument be a compile-time error? Today it fails at runtime with a message about strict mode.
- §02-11 item 19: HTML-first parsing, state by state. `{{` is a construct in text (including `<script>`, `<style>`, `<title>`) and in a start tag's attribute list, comment text inside comments, and an error in tag names, end tags, markup declarations and doctypes. That keeps today's behavior everywhere but comments. OK, or should `<script>` text or markup declarations go the other way?
- §02-1.4 item 5: the `<pre>`/`<textarea>` newline fix changes rendered whitespace in 7 corpus templates (in each case to what the source says). Also, the rule matches `<Textarea>` and `<Pre>` components without regard to case. Should it apply only to the lowercase HTML elements?
- §02-11 item 6: numeric references now decode as in HTML. HTML also decodes a reference with no `;` (`&#65`, and legacy names such as `&amp` and `&lt`), which a template keeps literal. Should that follow HTML too?
- `{{outlet}}` inside a component stopped rendering after the route manager merge (#21640). Is the behavior from before the merge the normative one?

Most of what's left is approving known work rather than open design, except item 3 and the bug rulings in item 2.
