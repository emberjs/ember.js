# User's todo list

This is not a todo list for agents to work on, this is a todo list for human reviewers to provide required inputs.

## Decisions still needed to complete the spec

**1. Preserve or change (§0.7.1).** Each of these changes normative text:

1. `template()` ignoring `strict: false` except through babel `hbs`: should the other paths honour it, or is `template()` strict-only?
2. Duplicate attributes and named arguments: should they be errors? PR #21718 is open.
3. Triple curlies are ignored for literals and keywords. The fix branch is open for review.
4. `&#128512;` decodes to U+F600: keep that or fix it?

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
- §02-11 item 19: your ruling that mustache syntax is recognized only in HTML states where it belongs is applied to HTML comments only. Mustaches in `<!DOCTYPE …>` and other markup declarations stay errors, and `<script>`, `<style>` and `<title>` text keeps recognizing them. Is that the reach you meant?
- `{{outlet}}` inside a component stopped rendering after the route manager merge (#21640). Is the behavior from before the merge the normative one?

Most of what's left is approving known work rather than open design, except item 3 and the bug rulings in item 2.
