# User's todo list

This is not a todo list for agents to work on, this is a todo list for human reviewers to provide required inputs.

## Decisions still needed to complete the spec

**1. Deprecation follow-ups**

- **T22 details:** the deprecation id and `until` version. Also, what Ember should finally do with an `{{else}}` inside an HTML comment that began in the block. It could be an error, which is what the spec now asks of new implementations. Or it could be comment text, which is what the parked branch does. Comment text changes a template's meaning without any error, so the deprecation would need to warn about it first.

> The spec should declare that the parser treats mustaches inside html comments as part of the comments. That is, the HTML parse takes precedence, and mustache states are only recognized in HTML parser states where they belong. This is difference from the current implementation, but we're deciding in this case that that's OK. Bringing the current implementation into spec compliance is out of scope for our spec writing, so we're not blocked on decisions about deprecation.

> Just make sure there's clear documentation in the spec for each of the places where we decided that the old implementation is out-of-spec.

- **T20 for consistency:** you ruled that `{{"foo" bar}}` becomes an error right away, with no deprecation. Now that T21 and T22 both use deprecation cycles, do you want T20 to stay an immediate error? Its corpus check found nothing that would break.

> This decision is not a blocker for the spec. The spec will definitely call this an error. While backward-compatibility is a key requirement for the spec, we can decide, on a case-by-case basis, to decide that it's the old implementation that is actually out of spec. This is an example of the old implementation being out of spec. How/when the old implementation is changed to bring it into conformance is out of scope for our spec-defining work.

- **T21 timing:** when to push the RFC and the deprecation guides.

> Out of scope, for the same reasons as above.

**2. Preserve or change (§0.7.1).** Each of these changes normative text:

1. `template()` ignoring `strict: false` except through babel `hbs`: should the other paths honour it, or is `template()` strict-only?
2. Duplicate attributes and named arguments: should they be errors? PR #21718 is open.
3. Triple curlies are ignored for literals and keywords. The fix branch is open for review.
4. `&#128512;` decodes to U+F600: keep that or fix it?

**3. Suspected bugs (§0.7.2–0.7.8, about 25 items).** For each one: preserve it, or mark it `[Out of spec]`. A blanket rule would clear most of these at once, for example "a bug with no plausible dependents is `[Out of spec]`". The ones that matter most for a new implementation:

- A strict `<x.y/>` with `x` unbound becomes an element.
- `{{#let … as |this|}}` rebinds `this`.
- The babel and runtime compile paths shadow names differently, and the `trackLocals` bug lets an inner block param delete an outer one.
- The component-definition cache ignores the owner.
- Production builds behave differently from development builds in ways code can observe.

**4. The `[Proposed]` reactive core (§0.7.10, §07-5 items 14–19).** Accept it or reject it. If accepted, other chapters could state their update rules with it.

**5. Required conformance profiles (§09-9.8 Q2).** SSR is already optional. The proposal makes Core, Dev, Loose mode, Legacy and Ember integration required, and that still needs a ruling. The workstreams W1 and W4–W9 wait on it.

**6. Smaller rulings**

- §08-14 Q16: in loose mode, should a free name used as an argument be a compile-time error? Today it fails at runtime with a message about strict mode.
- `{{outlet}}` inside a component stopped rendering after the route manager merge (#21640). Is the behavior from before the merge the normative one?

Most of what's left is approving known work rather than open design, except item 4, the bug rulings in item 3, and the T22 comment end state.
