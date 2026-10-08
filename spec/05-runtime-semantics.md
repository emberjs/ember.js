# 05 — Runtime Semantics

This chapter specifies what happens when a compiled template is *evaluated*: how it produces
DOM, which parts of that DOM are updated in place when tracked state changes, which parts are
torn down and rebuilt, when manager hooks run relative to DOM construction, how destruction is
ordered, and how server-side rendering (SSR) serializes output and how the client rehydrates it.

The input to this chapter is a template whose static semantics have already been resolved
(chapter 03), whether it is held as ASTv2 or in any other form. (Chapter 04 shows the
current encoding, which is informative only.) This chapter names constructs by their ASTv2 /
wire-format meaning ("an `Append` of a path expression", "a `Block` invocation", "an element
with splattributes") rather than by any VM opcode. Where the current implementation's opcodes are cited, it is only as evidence of
behavior.

Reactivity is described with the abstract model of chapter 07:

- a **reactive computation** is a function whose reads of **tracked storage** are recorded;
- a computation is **valid** until any tracked storage it consumed has changed;
- a computation that consumed *no* tracked storage on its first evaluation is **constant** and
  is never re-evaluated (see §05-1.7);
- "re-evaluated when consumed storage changes" means: during the next re-render pass, if the
  computation is invalid it is run again; if it is valid, its previous result is reused.

The terms *render transaction*, *commit phase*, *revalidation*, and *component region* are
defined in §07-0. In this chapter an **update pass** (or *re-render*) is the revalidation of
one render root (§05-1.4), and the **component update region** is §07-0's component region
(§05-1.6).

Manager APIs (component, helper, modifier managers and their capabilities) are specified in
chapter 06; this chapter only specifies *when* each hook is called and what the runtime does
with its result. Ember-specific keywords, built-ins (`on`, `fn`, `hash`, `array`, `concat`,
`get`, `unique-id`, `element`, `mut`, `readonly`, `unbound`, `-track-array`, `-each-in`,
`-in-el-null`, …), loose-mode resolution, classic components and outlets are specified in
chapter 08; this chapter references them where they interact with core semantics.

---

## 1. Render model

### 1.1 Evaluation context

Every piece of template code (a top-level template, a component layout, or an inline block)
is evaluated in an **evaluation context** consisting of:

| Part | Meaning |
|---|---|
| **self** | The value of `this`. A reactive value (see below). For a component layout it is the result of the component manager's `getSelf` (chapter 06). For template-only components it is the constant `null`, so `{{this.x}}` evaluates to `undefined` (`packages/@glimmer/runtime/lib/component/template-only.ts:31-33`). For a root template rendered with `renderMain` it is the `self` passed by the embedder. |
| **scope slots** | Named argument slots (`@foo`), local variables (block params), and block slots (`&default`, `&else`, `&attrs`, `&<name>`). Unbound slots read as `undefined` (`packages/@glimmer/runtime/lib/scope.ts:52-62`). |
| **lexical scope values** | In strict mode, the values captured from the JavaScript scope of the template. When they are captured is specified in §01-1.8.5. They are **constant**: a lexical variable's value is captured once per template instance and its identity never changes during the life of that instance (`packages/@glimmer/opcode-compiler/lib/syntax/expressions.ts:60-65` — lexical symbols compile to constant values). Properties *of* a lexical value are ordinary reactive property reads. |
| **owner** | The owner (DI container) used for resolution and passed to manager hooks. Inherited from the invoking context, except where a curried value or a manager with the `hasSubOwner` capability supplies a different one (§05-7.8). |
| **dynamic scope** | A string-keyed map of reactive values that is inherited *dynamically* (by render-tree nesting, not lexically). Used by `-with-dynamic-vars` / `-get-dynamic-var` (§05-5.8) and by component managers with the `dynamicScope` capability. Each component invocation and each `-with-dynamic-vars` block gets a child copy (`packages/@glimmer/runtime/lib/scope.ts:15-37`). |

A **block** (the body of `{{#if}}`, `{{#each}}`, a component's default/named/`else` block, the
`&attrs` block, …) is a closure over the evaluation context *in which it was written*: when a
component yields to a block, the block's code runs with the caller's `self`, the caller's
named arguments, and the caller's locals, extended with the block parameters supplied by the
`yield` (§05-6).

#### Values are lazy and reactive

Every expression in a template denotes a **reactive value**: a reactive computation that can be
read many times. Expressions are *not* evaluated eagerly in source order. A value is computed
when a consumer needs it:

- a content position (`{{x}}`) reads it once during initial render and again during each
  re-render pass in which the value is invalid;
- an attribute reads it once per render pass likewise;
- a component argument is passed *as a reactive value* (not as a snapshot); it is computed only
  when the component (its manager, its JavaScript class, or its template) reads it
  (`packages/@glimmer/runtime/lib/vm/arguments.ts:137-142`, `310-345` — captured arguments are
  lists/maps of reactive values, never snapshots);
- a helper receives its arguments as reactive values and decides when to read them.

Consequently, in the current implementation a getter in a component argument that is never read
is never run, and a getter read in two places is run at most once per render pass for each place
(and possibly shared — the current implementation caches the result of each reactive value until
something it consumed changes: `packages/@glimmer/reference/lib/reference.ts:153-183`). These
counts are not part of the contract (§00-0.1).

*Laziness applies to values, not to helper instances.* Computing a value is lazy, but
creating a **static helper instance** (the manager's `createHelper`) is eager. It happens when
evaluation first reaches the helper expression, whether or not its value is ever read
(§05-9.1). Sub-expressions are reached positional arguments first, then named arguments, each
in source order. The inline `if`/`unless` is the exception: it reaches its falsy branch, then
its truthy branch, then its condition. So `{{if c (a) (b)}}` creates both `(b)` and `(a)`,
but computes only the selected one (§06-6.2 step 1). Dynamic helpers (`(this.h)`) are created
lazily, on first read (§05-9.2). One more case is observable: when a template-only component
is invoked statically, named arguments that its layout never references are not evaluated at
all, so helpers in them are never created (§06-5). All of this timing describes the current
implementation and is not part of the contract (§00-0.1).

A path expression `a.b.c` is a chain of reactive property reads. Reading `b` of a value `v`
yields `undefined` if `v` is `null` or `undefined`, and otherwise `getProp(v, "b")`
(`packages/@glimmer/reference/lib/reference.ts:193-246`; `isDict` is `v != null`,
`packages/@glimmer/util/lib/collections.ts:9-11`). `getProp` is an embedder hook; in Ember it
is the `_getProp` of `@ember/-internals/metal` (it respects `unknownProperty`, computed
properties, and proxies; `packages/@ember/-internals/glimmer/lib/environment.ts:30-33`). Note
that property reads on primitives are *not* short-circuited: `{{this.str.length}}` reads
`length` of a string.

### 1.2 Output: cursors and DOM construction

Rendering produces DOM at a **cursor**: a parent element plus a `nextSibling` node (or `null`
for "append at the end") (`packages/@glimmer/runtime/lib/bounds.ts:5-12`). Every node the
template creates is inserted into the current parent immediately before the current
`nextSibling`. Opening an element (after its attributes are set — see §05-4.1) inserts it into
the DOM and makes it the current parent with `nextSibling = null` for its children; closing it
restores the previous cursor (`packages/@glimmer/runtime/lib/vm/element-builder.ts:194-230`).

Consequently:

- An element is inserted into the document **before** its children are created, and **after**
  its attributes (and property assignments) have been applied.
- Nodes are created and inserted in document order (pre-order).
- Rendering into an existing element with pre-existing children does not remove those
  children (except for `{{#in-element}}` without `insertBefore`, §05-5.7). New content goes
  before the cursor's `nextSibling` (or at the end).

The DOM operations used are only: `createElement`/`createElementNS`, `createTextNode`,
`createComment`, `insertBefore`, `removeChild`, `setAttribute`/`setAttributeNS`,
`removeAttribute`/`removeAttributeNS`, property assignment, and `insertAdjacentHTML` (for
trusted HTML). A conforming implementation MAY use other operations if the resulting DOM,
node identities, and ordering of observable side effects (e.g. custom element reactions,
mutation observer records ordering is **not** normative) are the same.

### 1.3 Bounds and blocks

Every region of output that may later be removed or moved has **bounds**: a parent element and
a first and last node, all siblings under that parent
(`packages/@glimmer/runtime/lib/bounds.ts:16-34`). Regions nest: a component's output region
contains the regions of its content; an `{{#each}}` region contains one region per item.

**Empty region rule.** A region that would otherwise contain no nodes MUST contain exactly one
empty comment node (`<!---->`) so that it has a position in the DOM
(`packages/@glimmer/runtime/lib/vm/element-builder.ts:470-474`). This is observable in
`innerHTML`. Examples (from `packages/@glimmer-workspace/integration-tests/test/updating-test.ts:636-652`,
`827-844`):

```hbs
<div>{{#if this.condition}}<p>x</p>{{/if}}</div>
```

| `condition` | DOM |
|---|---|
| `true` | `<div><p>x</p></div>` |
| `false` | `<div><!----></div>` |

The regions that are subject to the empty-region rule are exactly:

1. each replaceable region (§05-1.5): the body of an `if`/`unless` block, each append of
   dynamic content, each `each` block as a whole and each of its items, each dynamic
   component invocation, each `in-element` placeholder;
2. each component invocation's layout output;
3. the output of a whole render (a root).

Nesting several empty regions still produces only one comment, because an inner empty region's
comment makes the outer region non-empty. An element opened directly in a region makes the
region non-empty; content *inside* that element does not affect the region's bounds.

Content appended as a single dynamic value is always exactly one region, even if it is a text
node (text nodes are never merged with adjacent static text: `hello {{x}}world` produces three
text nodes).

Removing a region removes each of its top-level nodes from its parent, from first to last
(`packages/@glimmer/runtime/lib/bounds.ts:56-74`). Moving a region (only done by `each`,
§05-5.4) re-inserts each top-level node, first to last, before a reference node
(`packages/@glimmer/runtime/lib/bounds.ts:36-54`). Removing a region never touches nodes
nested inside its top-level nodes (they leave the document along with their ancestor).

### 1.4 Render passes and transactions

A **render** of a template or component into a cursor produces a **render result**
(`packages/@glimmer/runtime/lib/vm/render-result.ts:16-50`) with:

- bounds (first node, last node, parent element);
- `rerender()` — perform an update pass;
- destruction — destroying the render result destroys everything it created (§05-11) and
  removes its DOM (`render-result.ts:26`).

Two kinds of pass exist:

- **Initial render**: evaluates the template top-to-bottom, creating DOM and instantiating
  components/helpers/modifiers.
- **Update pass** (re-render): walks the *existing* output, re-reading every reactive value
  whose computation is invalid, and applying the minimal update defined for its position
  (sections 3–7). Parts of output whose computations are all valid are not touched.

Each initial render and each update pass (and each root destruction initiated by the embedder)
runs inside a **render transaction** (`packages/@glimmer/runtime/lib/environment.ts:141-185`,
`218-229`). Certain effects are deferred to the transaction's **commit phase** (§07-0). §06-11
specifies its order: component `didCreate` hooks (children before parents), then component
`didUpdate` hooks (children before parents), then modifier installs (child elements before
parents), then modifier updates (document pre-order, parents before children; see §05-10.3).

Transactions do not nest: starting a render while a transaction is open joins the open
transaction (`environment.ts:218-229`). That is the runtime's rule. Ember's renderer adds
one of its own: a root added while the renderer is rendering (for example `renderComponent`
called from a getter, a helper, or a modifier hook) is not rendered by that call. It is
rendered after the current transaction commits, in a further iteration of the renderer's
loop, which is a new transaction with its own commit phase. The call returns before the
root has rendered (§07-1.10 item 5, §08-9.1, open question §08-14 Q9). [Dev] beginning a second transaction when one exists
is an assertion failure with the message "A glimmer transaction was begun, but one already
exists. …" (`environment.ts:141-145`).

When and how often update passes run is decided by the embedder. In Ember
(`packages/@ember/-internals/glimmer/lib/base-renderer.ts:546-575`, `316-402`), a change to
tracked storage schedules a revalidation in the run loop's `render` queue; every render root
is re-rendered in one transaction; if tracked storage changed *during* rendering, the loop is
repeated at the end of the run loop, up to `ENV._RERENDER_LOOP_LIMIT` times, after which the
error `infinite rendering invalidation detected` is thrown. Writing to tracked storage that was
already consumed in the same render pass is an error in development (chapter 07).

### 1.5 Stable regions vs. replaceable regions

The central observable property of the rendering model is **which DOM survives an update**.
Every template construct falls into one of these categories:

| Category | Constructs | On change |
|---|---|---|
| **In-place** | text content of `{{x}}` whose value stays "string-like"; dynamic attribute and property values; modifier updates; component argument changes | The existing node/element is kept; its `nodeValue`, attribute or property is updated. |
| **Replaceable region** | `{{#if}}`/`{{#unless}}` bodies (on truthiness flip), dynamic content whose *kind* changes (§05-3.4) or whose trusted/node/component value changes identity, `{{{x}}}` on any value change, dynamic component invocation on definition change, `{{#in-element}}` on destination or `insertBefore` change, `{{#each}}` on empty↔non-empty transition | The region's contents are **destroyed** (§05-11), its DOM removed, and the construct is re-evaluated from scratch *at the same position*. |
| **Keyed list** | `{{#each}}` / `{{#each-in}}` items | Items are matched by key; retained items keep their DOM and are updated in place; new items are rendered; removed items are destroyed; moved items' DOM is moved (§05-5.4). |
| **Static** | literal text, static attributes, element structure, `{{#let}}` | Never changes. |

A replaceable region is re-rendered with the *same* evaluation context it had originally
(same `self`, scope, owner, dynamic scope), and inputs that were evaluated *outside* the region
(e.g. the condition of an `{{#if}}`, the list of an `{{#each}}`, the destination of an
`{{#in-element}}`, the definition of a dynamic component) are *not* re-created: helper instances
used in those positions persist across the replacement
(`packages/@glimmer-workspace/integration-tests/test/updating-test.ts:476-599`: a stateful helper
used as the condition of `if`/`unless`/`each`/`component`/`in-element` is created once and
never destroyed while the construct toggles).

**Update pass traversal order.** An update pass visits the output in document order. For each
position it checks validity and applies updates *before* descending into nested content, except
that when a region is replaced, the replacement is rendered immediately (as an initial render
of that region) and its descendants are not separately "updated" in the same pass.

### 1.6 Component-level skipping

Each component invocation's output (its layout together with everything rendered inside it,
including yielded blocks rendered inside it) forms a **component update region**. During an
update pass, if no tracked storage consumed during the last evaluation of the region has
changed, the entire region is skipped: no values inside it are re-read and **no manager hooks
of that component** (`update`, `didUpdateLayout`/`didUpdate`) are called for this pass
(`packages/@glimmer/runtime/lib/vm/append.ts:351-384`,
`packages/@glimmer/runtime/lib/compiled/opcodes/vm.ts:286-327`). Conversely, if *anything*
consumed within the region changed — including in a deeply nested child component — then the
component's `update` hook (if its manager has the `updateHook` capability) and its
`didUpdateLayout`/`didUpdate` are invoked, even if none of its own arguments changed. (This is
what "didUpdate" means for managers with the `createInstance` capability: "something in my
rendered subtree was revalidated".)

§07-2.4.7 gives the reactive skeleton of this rule, and §06-4.4 and §06-8.5 give its
consequences for public and classic component managers.

The embedder may request an update pass with `alwaysRevalidate: true`, which disables this
skipping (`vm.ts:299`). Ember does not use it (`base-renderer.ts:145`).

*Note:* This skipping is an optimization in the current implementation, but it is observable
through manager hooks and MUST be preserved.

### 1.7 Constant computations

If a reactive value's computation consumed no tracked storage when it was run (the first time,
or any later re-evaluation), it is **constant** from then on (§07-0, §07-1.5 items 3–4, which
own the definition): it is never re-run, and positions that display it are never updated and set up
no update work (`packages/@glimmer/reference/lib/reference.ts:141-160`,
`packages/@glimmer/validator/lib/tracking.ts:95-106`). For example, with
`self = { name: "a" }` where `name` is an ordinary (untracked) property, `{{this.name}}`
renders `a` and continues to show `a` even if `name` is later reassigned and an update pass is
run. Only mutations of tracked storage (chapter 07; in Ember also `set()`/`notifyPropertyChange`
on classic objects, which dirty tracked storage) are observed.

This applies uniformly to content, attributes, conditions, `each` lists, component definitions,
etc.: a position whose value is constant establishes no ongoing reactivity at all.

---

## 2. Expressions

This section defines the value of each expression form at runtime. All expressions are reactive
values (§05-1.1).

| Expression | Value |
|---|---|
| String / number / boolean / `null` / `undefined` literal | That constant. |
| `this` | self. |
| `this.a.b`, `@arg.a`, `local.a` | Chain of property reads (§05-1.1). A named argument that was not passed reads as `undefined`. |
| Lexical (strict-mode) identifier | The constant captured value. |
| `(helper args…)` / `(this.x args…)` sub-expression | The result of invoking a helper (§05-9). |
| `(if c a b)` / `(unless c a b)` | `toBool(c) ? a : b` (resp. `toBool(c) ? b : a`); a missing `b` is `undefined`. Only the selected branch is read (`packages/@glimmer/runtime/lib/compiled/opcodes/expressions.ts:284-298`; `updating-test.ts:707-716`: `(if false "x")` passed to a helper yields `undefined`). |
| `(not x)` (internal, produced by `unless` normalization) | `!toBool(x)` (`expressions.ts:300-308`). |
| Attribute concatenation `"a{{b}}c"` | See §05-4.6. |
| `(has-block "name")` / `(has-block-params "name")` | §05-6.3. Constant booleans. |
| `(-get-dynamic-var "name")` | §05-5.8. |
| `(log a b)` | §05-5.9. |
| `(component …)`, `(helper …)`, `(modifier …)` | A curried value (§05-8). |

`toBool` is defined in §05-5.1.

---

## 3. Content (append) semantics

This section specifies `{{expr}}` ("cautious append") and `{{{expr}}}` ("trusting append") in
content position, including `{{helper args}}` and `{{component-or-helper args}}` forms.

### 3.1 Static content

- Literal text in the template becomes a text node with that text. Static text is never updated.
- A literal in mustache position (`{{"str"}}`, `{{1}}`, `{{null}}`) becomes a static text node
  whose content is `String(value)`, or `""` for `null`/`undefined`
  (`packages/@glimmer/opcode-compiler/lib/syntax/statements.ts:174-177`, `251-253`). No region
  is created for it; `{{null}}` produces an empty text node (not a comment).
- HTML comments in the template (`<!-- x -->`) produce comment nodes with the same data.
  Handlebars comments (`{{! x}}`) produce nothing.

### 3.2 Classification of a dynamic value

Given a value `v` in content position, its **content kind** is determined by the following
ordered tests (`packages/@glimmer/runtime/lib/compiled/opcodes/content.ts:34-50`,
`packages/@glimmer/runtime/lib/dom/normalize.ts:34-64`):

```
kind(v):
  if v is a string, number, boolean, null, or undefined,
     or v has no callable `toString` property (e.g. Object.create(null)): → STRING
  if v is a curried component (§05-8) or has a component manager:      → COMPONENT
  if v is a curried helper or has a helper manager
     (every JS function has the default helper manager, §06-1.5):        → HELPER
  if v is an object with a callable `toHTML` property:                   → SAFE_STRING
  if v is an object whose `nodeType` is 11:                              → FRAGMENT
  if v is an object whose `nodeType` is a number:                        → NODE
  otherwise:                                                             → STRING
```

There is no default component manager and no default modifier manager (§06-1.5): a plain
function is classified as HELPER, never as COMPONENT, and a plain function in modifier
position is an error (§05-10.2).

*Note:* the "no callable `toString`" test is applied first, via the "empty" check: `isEmpty(v)`
is `v == null || typeof v.toString !== 'function'`
(`normalize.ts:42-44`). Such values render as `""`.

### 3.3 Rendering each kind (initial render)

Each dynamic append creates one replaceable region (§05-1.5) containing:

| Kind | `{{v}}` | `{{{v}}}` |
|---|---|---|
| STRING | One text node with `normalize(v)`, where `normalize(v)` is `""` if `isEmpty(v)`, else `String(v)` (`content.ts:109-120`). `true` → `"true"`, `0` → `"0"`. An empty string still produces an (empty) **text node**, not a comment. | If `normalize(v)` is `""`: one empty comment. Otherwise, the string parsed as HTML in the context of the current parent element and inserted at the cursor; the region is the resulting nodes (`packages/@glimmer/runtime/lib/dom/operations.ts:86-115`). |
| SAFE_STRING | `h = v.toHTML()`; if `h` is empty (`""`, `null`, `undefined`): one empty comment; else parsed as HTML as for trusted strings (`content.ts:100-107`). | Same. |
| FRAGMENT | The fragment's children are moved into the DOM at the cursor; the region is those nodes. If the fragment is empty, one empty comment (`element-builder.ts:312-324`). | Same. |
| NODE | The node itself is inserted at the cursor (moved if it was elsewhere) (`element-builder.ts:346-350`). | Same. |
| COMPONENT | The value is invoked as a component with no arguments and no blocks (§05-7; `packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/stdlib.ts:57-63`). | Same (a component is rendered, not HTML). |
| HELPER | The value is invoked as a helper with no arguments (§05-9); its result `r` is then appended as if by this table with the restriction that COMPONENT and HELPER kinds of `r` are rendered as STRING (i.e. `String(r)` text for `{{}}`, HTML parse of `String(r)` for `{{{}}}`) (`stdlib.ts:64-80`). | Same, with trusting append of the result. |

Parsing HTML "in the context of the current parent" means the HTML is interpreted as the
`innerHTML` of an element of the parent's kind (`insertAdjacentHTML` on the parent or on a
sibling element). In SVG contexts this yields SVG elements
(`packages/@glimmer-workspace/integration-tests/test/updating-content-matrix-test.ts:116-132`).

Examples (`updating-content-matrix-test.ts:174-386`):

| Template | Value | Result |
|---|---|---|
| `{{this.value}}` | `"<b>hello</b>"` | `&lt;b&gt;hello&lt;/b&gt;` (text) |
| `{{this.value}}` | `null`, `undefined`, `""` | empty text node |
| `{{this.value}}` | SafeString `"<b>hello</b>"` | `<b>hello</b>` |
| `{{this.value}}` | SafeString `""` | `<!---->` |
| `{{this.value}}` | `{ toString() { return "I am an Object" } }` | `I am an Object` |
| `{{{this.value}}}` | `null`, `undefined`, `""` | `<!---->` |
| `{{{this.value}}}` | `"<b>hello</b>"` | `<b>hello</b>` |
| either | `true` | `true` |
| either | an element `<p>hello</p>` | that element |
| either | a fragment `[<p>one</p>, <p>two</p>]` | `<p>one</p><p>two</p>` |

### 3.4 Updating dynamic content

On an update pass, if the appended expression's value is invalid, it is re-read giving `v'`.
Let `k` be the kind of the value at the time the region was last (re)rendered and
`k' = kind(v')`.

```
update(region, v'):
  if k' ≠ k: replace the region (destroy + clear + render v' per §05-3.3)
  else switch k:
    STRING (cautious {{ }}):
        if v' === lastText: do nothing          (lastText is the last string written)
        let s' = normalize(v')
        if s' !== lastText: set textNode.nodeValue = s'; lastText = s'
        (the same text node is always kept)
    STRING (trusting {{{ }}}): if v' !== v (identity): replace region
    SAFE_STRING, FRAGMENT, NODE: if v' !== v (identity): replace region
    COMPONENT: if v' !== v (identity): replace region (the old component is destroyed)
    HELPER:    the region is kept; the helper invocation inside is updated per §05-9.2
               (a changed helper definition destroys the old helper instance and creates a new
               one), and the helper's result is displayed as STRING-kind content in place.
```

(`content.ts:71-120`, `packages/@glimmer/runtime/lib/vm/content/text.ts:14-35`,
`packages/@glimmer/runtime/lib/compiled/opcodes/vm.ts:234-284`,
`stdlib.ts:39-98`.)

Consequences (pinned by tests):

- A text node is reused across string updates, including through intermediate values that
  normalize to the same text, and through `null`/`undefined` ↔ string transitions
  (`packages/@glimmer-workspace/integration-tests/test/updating-test.ts:43-89`,
  `1140-1162` "clean content doesn't get blown away").
- Switching between a string and a SafeString, node or fragment replaces the region
  (`updating-test.ts:308-369`).
- A SafeString whose identity is unchanged is not re-parsed, even if its `toHTML()` would now
  return something different.
- A number, boolean, string, null and undefined are all the same kind; switching among them
  updates the text in place.
- An object with a `toString` is re-stringified only when the reactive value producing it is
  invalid (i.e. some tracked storage it consumed changed). Mutating untracked state read by
  `toString()` is not observed.
- Switching between two component definitions in `{{@Foo}}` destroys the first component and
  renders the second; switching to `undefined` renders an empty text node
  (`packages/@glimmer-workspace/integration-tests/test/strict-mode-test.ts:640-679`).
- Switching the helper definition in `{{@helper}}` destroys the old helper instance
  (`strict-mode-test.ts:836-878`).

### 3.5 Append of calls and resolved names

The forms below are distinguished statically (chapters 03, 04); their runtime behavior:

1. **[Loose mode]** **`{{name}}` where `name` resolves to a component** — component invocation with
   no args, not a replaceable region beyond the component's own layout region.
2. **`{{name}}` where `name` resolves to a helper** — helper invocation with no args, result
   displayed per the HELPER row of §05-3.3 (non-dynamic append).
3. **`{{name args…}}` with a statically resolved component or helper head** — component
   invocation with the given positional and named arguments (named args become `@`-args), or
   helper invocation with the result displayed as non-dynamic content.
4. **`{{this.x args…}}` / `{{@x args…}}` / `{{local args…}}` (dynamic head with arguments)** —
   the head value `h` is classified:
   - if `h` is a curried component or has a component manager: invoke it as a component with
     the given arguments (named args as `@`-args); a change in `h`'s identity replaces the
     region;
   - otherwise it is invoked as a helper (§05-9.2) with the given arguments, and its result is
     displayed as non-dynamic content. If `h` is not an object/function, the result is
     `undefined` (renders an empty text node) — no error is raised even in development
     (`packages/@glimmer/runtime/lib/compiled/opcodes/content.ts:52-69`,
     `packages/@glimmer/runtime/lib/compiled/opcodes/expressions.ts:127-136`;
     `strict-mode-test.ts:825-834`). [Dev] If `h` is an object/function with neither a
     component nor a helper manager, the error `Attempted use a dynamic value as a component or
     helper, but that value did not have an associated component or helper manager. The value
     was: ${value}` is thrown.
   - a change of `h` between "component" and "helper" replaces the region.
5. **`{{this.x}}` / `{{@x}}` (dynamic head without arguments)** — §05-3.2–3.4 apply directly:
   a component value is rendered as a component, a helper/function value is *invoked* (with no
   arguments), everything else is content. *Note:* consequently a plain function stored on a
   component and appended as `{{this.fn}}` is called with no arguments and its return value
   rendered.
6. **`{{{…}}}`** with any of the above: the same, except strings and helper results are
   inserted as trusted HTML. There are two exceptions, and in both the triple curlies have
   no effect, so the value is rendered as **text** like `{{…}}` (verified with the current
   compiler; this item is the owner of the rule):
   - a string (or other) **literal**: `{{{"<b>x</b>"}}}` renders the text `<b>x</b>`, because
     a literal append always becomes a static text node (§05-3.1;
     `packages/@glimmer/opcode-compiler/lib/syntax/statements.ts:251-253`);
   - an append whose value is a **keyword** construct: `{{{if c x}}}`, `{{{(if c x)}}}`,
     `{{{unless …}}}`, `{{{helper h}}}`, `{{{has-block}}}`, `{{{has-block-params}}}`,
     `{{{log …}}}`, `{{{-get-dynamic-var …}}}`. Keyword translation drops the trusting flag
     (§03-4.4). `{{{h}}}` and `{{{this.h}}}` with a helper value do insert HTML.

   See §05-14 item 14.

---

## 4. Elements and attributes

### 4.1 Element construction order

For an element written in a template, `<tag attrs… modifiers…>children</tag>`:

```
renderElement(tag, params, children):
  el = createElement(tag, parent = cursor.element)              -- §4.2
  if the element has no splattributes and no modifiers ("simple element"):
      for each attribute in params, in order (with `type` moved last, see below):
          apply attribute immediately to el                       -- §4.3–4.7
  else ("element with dynamic features"):
      ops = new deferred-attribute list                          -- §4.8
      for each param in order (attributes incl. `...attributes`, then modifiers):
          attribute   → record in ops
          ...attributes → evaluate the caller's &attrs block, recording its
                          attributes and modifiers into ops (§05-7.5)
          modifier    → create the modifier instance (§05-10) and record it in ops
      flush ops onto el (§4.8)
  insert el at the cursor                                        -- el enters the document
  render children with cursor = (el, null)
  close el: schedule `install` for el's modifiers (in creation order) at commit
```

(`packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:66-164`,
`packages/@glimmer/runtime/lib/vm/element-builder.ts:194-230`,
`packages/@glimmer/compiler/lib/passes/1-normalization/visitors/element/classified.ts:98-175`,
`packages/@glimmer/compiler/lib/passes/2-encoding/content.ts:129-137`.)

Order of params (this paragraph is the owner of the rule; §03-5.7, §04-4.5.8 and §05-7.5
refer to it): the compiler orders an element's params as *all attributes in source order*
(including `...attributes` at its source position), followed by *all modifiers in source
order* (`classified.ts:140-156`). When the element has no `...attributes` (it may still have
modifiers), an attribute named exactly `type` (case-sensitive) is moved after all other
attributes at compile time (`classified.ts:102-129`), because `type` can change how the
browser interprets other attributes (e.g. `value` on `<input>`). When the element has
`...attributes`, the compiler keeps source order and the same reordering happens at flush
time (§4.8). The same rules apply to the attributes of an angle-bracket component invocation,
which form its `attrs` block (§05-7.5). Verified: `<div {{m}} type="x" title="a">` compiles
with params in the order `title`, `type`, `m`.

Therefore, at the time the element is inserted into the document, all its attributes and
properties have been set, and its modifiers have been *created* but not *installed*. Modifier
`install` runs at transaction commit (§05-1.4), after the whole render pass has inserted all DOM.

Modifiers are not created at all, and no modifier hooks run, when the environment
is not interactive (SSR) (`dom.ts:166-170`, `194-201`; `packages/@glimmer/runtime/lib/environment.ts:164-174`).

### 4.2 Element namespace

`createElement(tag, parent)` (`packages/@glimmer/runtime/lib/dom/operations.ts:47-80`):

```
inSVG    = parent.namespaceURI == SVG_NS  or tag == "svg"
inMathML = parent.namespaceURI == MATHML_NS or tag == "math"
integrationPoint = parent.tagName ∈ { "foreignObject", "desc", "title" }
if (inSVG or inMathML) and not integrationPoint:
    if tag ∈ BLACKLIST: throw Error(`Cannot create a ${tag} inside an SVG context`)
    return document.createElementNS(inMathML ? MATHML_NS : SVG_NS, tag)
else:
    return document.createElement(tag)
```

`BLACKLIST` is `b big blockquote body br center code dd div dl dt em embed h1 h2 h3 h4 h5 h6
head hr i img li listing main meta nobr ol p pre ruby s small span strong strike sub sup
table tt u ul var` (`packages/@glimmer/runtime/lib/dom/helper.ts:11-56`). For the root of a
render, "parent" is the element the render was placed into, so rendering into an `<svg>`
produces SVG children. Tag names are passed through with their original case, so `<linearGradient>`
keeps its case in SVG (tests: `packages/@glimmer-workspace/integration-tests/lib/suites/initial-render.ts:640-770`).

In SSR (node) the namespace logic is skipped and every element is created with
`createElement(tag)` (`packages/@glimmer/node/lib/node-dom-helper.ts:32-40`).

### 4.3 Static attributes

A static attribute `name="literal"` (value is a plain string with no mustaches) is set with
`setAttribute(name, value)`, or `setAttributeNS(ns, name, value)` if `name` is one of the
namespaced attribute names below (`packages/@glimmer/runtime/lib/dom/api.ts:16-27`,
`packages/@glimmer/compiler/lib/utils.ts:18-39`). Static attributes are **never** set as
properties, and are never sanitized or warned about.

| Attribute name | Namespace |
|---|---|
| `xlink:actuate`, `xlink:arcrole`, `xlink:href`, `xlink:role`, `xlink:show`, `xlink:title`, `xlink:type` | `http://www.w3.org/1999/xlink` |
| `xml:base`, `xml:lang`, `xml:space` | `http://www.w3.org/XML/1998/namespace` |
| `xmlns`, `xmlns:xlink` | `http://www.w3.org/2000/xmlns/` |

Any other name containing a colon is an ordinary attribute name.

### 4.4 Dynamic attributes: attribute vs. property

A dynamic attribute `name={{expr}}` or `name="…{{expr}}…"` (concatenation, §4.6) is applied by
an **attribute operation** chosen once, when the element is created, from the element and the
name (`packages/@glimmer/runtime/lib/vm/attributes/dynamic.ts:22-78`,
`packages/@glimmer/runtime/lib/dom/props.ts:9-80`):

```
chooseOperation(el, name, namespace, trusting):
  if DEV and name == "style" and not trusting: return STYLE_WARNING_ATTR   -- §4.5.3
  if el.namespaceURI == SVG_NS:                 return ATTR(name)         (maybe SAFE)
  (kind, n) = normalizeProperty(el, name)
  if kind == "attr": return ATTR(n)                                        (maybe SAFE)
  else:
     if requiresSanitization(el.tagName, n):   return SAFE_PROP(n)
     if el.tagName ∈ {INPUT, TEXTAREA} and n == "value": return INPUT_VALUE
     if el.tagName == OPTION and n == "selected":        return OPTION_SELECTED
     return PROP(n)

normalizeProperty(el, name):
  if name in el:                    (kind, n) = ("prop", name)
  else if name.toLowerCase() in el: (kind, n) = ("prop", name.toLowerCase())
  else:                             (kind, n) = ("attr", name)
  if kind == "prop" and (n.toLowerCase() == "style" or preferAttr(el.tagName, n)):
      kind = "attr"
  return (kind, n)
```

`in` is the JavaScript `in` operator on the element object (so it includes inherited DOM
properties and properties installed by custom elements before the check). `preferAttr` is true
for:

| Tag | Attributes forced to attribute mode |
|---|---|
| `INPUT` | `form`, `autocorrect`, `list` |
| `SELECT`, `OPTION`, `TEXTAREA`, `LABEL`, `FIELDSET`, `LEGEND`, `OBJECT`, `OUTPUT`, `BUTTON` | `form` |

(`props.ts:52-80`.) The name used for a property is the *normalized* name: `<input
readOnly={{x}}>` finds the `readOnly` property; `<input readonly={{x}}>` does not (neither
`readonly` nor its lowercase is an own/inherited property name), so it uses attribute mode;
`tabindex={{x}}` likewise uses attribute mode (the property is `tabIndex`). The lowercase
fallback only helps names whose lowercase form *is* a property (e.g. `onClick` → `onclick`).
SVG elements always use attribute mode, preserving the attribute name's
case (`dynamic.ts:35-37`).

In SSR the elements are simple-dom elements with no DOM properties, so every dynamic attribute
uses attribute mode (functions and other non-stringable values are dropped, see §4.5.1).

`trusting` is true for the triple-curly attribute form `name={{{expr}}}`; its only effect is to
suppress the development-mode `style` warning.

### 4.5 Applying values

#### 4.5.1 Attribute mode (ATTR)

```
normalizeAttrValue(v):
  if v is false, undefined, null, or v.toString is undefined: return null   -- "absent"
  if v is true: return ""
  if typeof v == "function": return null
  return String(v)

ATTR.initial(v):  s = normalizeAttrValue(v); if s ≠ null: setAttribute(name, s [, ns])
ATTR.update(v):   s = normalizeAttrValue(v)
                  if s == null: el.removeAttribute(name)
                  else:         el.setAttribute(name, s)
```

(`dynamic.ts:87-107`, `228-247`.) The update is applied whenever the value's computation is
re-evaluated, even if the new string equals the old one (the DOM `setAttribute` call is
repeated) — *Note:* this is only observable through mutation observers and custom element
`attributeChangedCallback`, and is not normative.

*Note:* on update, the namespaced variant is **not** used: `setAttribute(name, s)` and
`removeAttribute(name)` are called with the qualified name even for `xlink:href`. While the
attribute exists this still updates the existing namespaced attribute (DOM `setAttribute`
matches by qualified name), so the namespace is preserved across value changes
(`packages/@glimmer-workspace/integration-tests/test/updating-svg-test.ts:108-134`); after a
removal (value `null`) and re-add, the re-created attribute has no namespace (see Open
questions).

Tests: `null`/`undefined`/`false` omit or remove the attribute, `true` gives `""`, `0` gives
`"0"`, an object uses its `toString`, an object without `toString` gives no attribute / `""`
(`packages/@glimmer-workspace/integration-tests/test/updating-test.ts:1229-1312`,
`packages/@glimmer-workspace/integration-tests/test/attributes-test.ts:237-247`, `384-455`);
attribute-name case is normalized for HTML (`tiTle` → `title`) but preserved for SVG
(`viewBox`) (`attributes-test.ts:549-569`).

#### 4.5.2 Property mode (PROP)

```
PROP.initial(v):  if v is not null/undefined: el[n] = v; last = v
PROP.update(v):   if v !== last:
                     el[n] = v; last = v
                     if v is null or undefined: el.removeAttribute(n)  (removeAttributeNS if namespaced)
```

(`dynamic.ts:109-149`.) The value is assigned **as-is** (not stringified): `disabled={{false}}`
sets `el.disabled = false`, `onclick={{this.fn}}` sets `el.onclick = fn`. The comparison is
against the last value *the template* assigned, not the element's current property: if user
interaction changes `el.checked` and the template's value did not change, the template does not
reset it.

**INPUT_VALUE** (`value` on `<input>`/`<textarea>` in property mode; `dynamic.ts:179-200`):

```
initial(v):  el.value = normalize(v)                     -- normalize: null/undefined → ""
             if v === "" and el.tagName == "INPUT": setAttribute("value", "")
update(v):   s = normalize(v); if el.value !== s: el.value = s
```

The update compares with the element's *current* `value`: if the user typed `bar` and the
bound value is (re)set to `foo`, the re-render writes `foo` back
(`attributes-test.ts:251-282`). `null`/`undefined` display as `""`
(`attributes-test.ts:207-232`). Because `type` is applied after every other attribute (the
`type` rule of §4.1/§4.8), `value`, `min` and `max` are already set when the input becomes
`type="range"`, and the browser then clamps the value against the author's `min`/`max`, not
the defaults (`packages/@glimmer-workspace/integration-tests/test/input-range-test.ts:14-150`:
`-2` with `min=-5` is kept, `55` with `max=50` becomes `50`).

**OPTION_SELECTED** (`selected` on `<option>`; `dynamic.ts:202-218`):

```
initial(v):  if v is not null/undefined/false: el.selected = true
update(v):   el.selected = Boolean(v)       -- JS truthiness, not toBool
```

The `selected` attribute is never serialized by this path (only the property is set), except
that the rehydration test mode observes `selected=true`
(`lib/suites/initial-render.ts:400-527`; `updating-test.ts:1371-1452`).

#### 4.5.3 `style`

`style` is always applied in attribute mode (`props.ts:26-31`). [Dev] Unless the attribute uses
the trusting form (`style={{{x}}}` gives no warning — `test/style-warnings-test.ts:60-66`),
every initial application and every update first calls the embedder hook
`warnIfStyleNotTrusted(value)` (`dynamic.ts:249-266`). In Ember that issues the warning with id
`ember-htmlbars.style-xss-warning` unless the value is `null`, `undefined`, or an `htmlSafe`
string (`packages/@ember/-internals/glimmer/lib/environment.ts:43-54`); the message is built by
`constructStyleDeprecationMessage` (chapter 08). Static `style="…"` never warns. In Ember,
`style="{{x}}"` (a quoted single mustache) is rewritten at compile time to `style={{x}}` so a
SafeString reaches the attribute unconverted (chapter 08,
`packages/@ember/template-compiler/lib/plugins/transform-quoted-bindings-into-just-bindings.ts`).

For attribute-mode `style` the value is stringified with `String(v)`; a SafeString stringifies
via its `toString`.

#### 4.5.4 URL sanitization

Some (tag, attribute) pairs are **sanitized** (`packages/@glimmer/runtime/lib/dom/sanitized-values.ts:5-161`).
Tag comparison is case-insensitive (so the SVG `<a>` element is covered) and attribute
comparison is case-insensitive:

| Rule | Tags | Attributes | Unsafe when |
|---|---|---|---|
| URI | `A AREA BODY LINK IMG IFRAME BASE FORM BUTTON INPUT` | `href src background action formaction xlink:href` | protocol ∈ {`javascript:`, `vbscript:`} |
| data-protocol | `IFRAME OBJECT` | `src data` | protocol ∈ {`data:`, `javascript:`, `vbscript:`} |
| data-URI | `EMBED` | `src` | always |

```
sanitize(el, attr, v):
  if v is null or undefined: return v
  if v is a SafeString (has callable toHTML): return v.toHTML()     -- bypass
  s = normalize(v)
  if URI rule applies and protocol(s) ∈ {javascript:, vbscript:}: return "unsafe:" + s
  if data-protocol rule applies and protocol(s) ∈ {data:, javascript:, vbscript:}: return "unsafe:" + s
  if data-URI rule applies: return "unsafe:" + s
  return s
```

`protocol(s)` uses the WHATWG `URL` parser (`new URL(s).protocol`); if parsing throws
(relative URL), the protocol is `":"` (safe). Under FastBoot's legacy `URL` (Node's `url`
module), ASCII tab/newline/CR are stripped before `url.parse`
(`sanitized-values.ts:65-115`). Sanitization is applied on initial render and on every update,
in both attribute and property modes, and only to *dynamic* values. A static
`href="javascript:…"` is emitted as written, and `href` on a non-listed tag (e.g. `<div>`) is
never sanitized. Tests: `attributes-test.ts:577-812` (`a`, `img`, `button`/`input`
`formaction` including camelCase `formAction`, `area`, SVG `<a>` `href`/`xlink:href`,
`iframe[src]` and `object[data]` with `data:` URLs).

### 4.6 Concatenated attribute values

`name="a{{b}}c"` is evaluated as a reactive value (`packages/@glimmer/runtime/lib/compiled/expressions/concat.ts:4-33`):

```
concat(parts):
  out = []
  for each part value p (static strings are parts too):
     if p is null or undefined: skip
     else if p is a string: out.push(p)
     else if typeof p.toString != "function": out.push("")
     else out.push(String(p))
  return out.length > 0 ? out.join("") : null
```

The result then goes through §4.4–4.5 (tests: `class='hello {{v}}'` with `v = null` renders
`class="hello "` — the attribute is kept with the trailing space;
`updating-test.ts:1212-1228`, `1265-1280`, `1327-1369`). Consequences: a concatenation always yields a string if
it contains any static text or any non-null part; `disabled="{{false}}"` yields the string
`"false"` (which, in property mode, sets `disabled = "false"`, a truthy value — pinned by
`attributes-test.ts:97-114` and `lib/suites/initial-render.ts:222-263`, where only `null`/`undefined`
remove a quoted `disabled`); a concatenation
of only null/undefined parts yields `null`, removing the attribute.

### 4.7 Attribute updates

Each dynamic attribute is a reactive computation; on an update pass, if invalid, it is
re-evaluated and `update` of its operation is invoked with the new value
(`packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:407-443`). A dynamic attribute
whose value is constant (§05-1.7) is applied once and never updated. Attribute updates happen
during the traversal (§05-1.5), before any modifier `update` hooks of the same pass (which run
at commit).

### 4.8 Elements with dynamic features (deferred attributes)

For an element that has `...attributes` or any modifier, attributes are first collected into a
**deferred-attribute list** and applied at once just before the element is inserted
(`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:519-652`):

```
record(name, value, namespace, trusting):         -- value: static string or reactive value
  if name == "class": classes.push(value)
  attributes[name] = {value, namespace, trusting}  -- an insertion-ordered map; re-recording an
                                                     existing name REPLACES its value but keeps
                                                     its original position

flush(el):
  typeEntry = null
  for (name, entry) in attributes (insertion order):
     if name == "type": typeEntry = entry; continue
     if name == "class": apply("class", mergeClasses(classes), …)
     else apply(name, entry.value, entry.namespace, entry.trusting)
  if typeEntry: apply("type", …)
  return modifiers (in creation order)

mergeClasses(classes):
  if classes is empty: ""       (unreachable: flush only merges when "class" was recorded)
  if one class: that value (static string, or reactive value applied normally)
  if all are static strings: join with " "
  else: a reactive value computing:
        parts = [normalize(c) for c in classes]   -- normalize: null/undefined → "", else String(c)
        nonEmpty = parts filtered to non-empty strings
        nonEmpty.length == 0 ? null : nonEmpty.join(" ")

apply(name, value): static string → setAttribute (§4.3, but see note); reactive → §4.4–4.7
```

Precedence rule: **the last recorded value for a name wins**, except `class`, whose values are
all merged in recording order. Recording order is source order of the element's attributes,
with the contents of `...attributes` recorded at the position of `...attributes`
(§05-7.5).

*Note:* in a merged `class`, `false` becomes the class `"false"` (since `normalize(false)` is
`"false"`), whereas a lone `class={{false}}` removes the attribute (§4.5.1). See Open questions.

### 4.9 Other element-level content

- `<!-- comment -->` inside an element: a comment node.
- Void elements (`<input>`, `<br>`, …) are created and closed immediately; they cannot contain
  children (chapter 02).
- A `<tr>` written directly inside `<table>` is created directly as a child of the `<table>`
  on the client (no implicit `<tbody>` is inserted by the DOM builder); the SSR serializer
  inserts one (§05-13.1).
- **Duplicate attribute names** are kept by the parser (§02-11 item 17) and compiled as
  separate attributes (verified: `<div title="a" title="b">` compiles to two static
  attributes). At runtime (from source, untested):
  - On a *simple* element (§4.1), each occurrence is applied in order, so the last one wins
    at first render. Each dynamic occurrence keeps its own update, so after an update the DOM
    shows whichever occurrence was re-evaluated most recently. Two `class` occurrences are
    *not* merged: the last one wins.
  - On an element with `...attributes` or modifiers, §4.8 applies: the last recorded value for
    a name wins, it is applied once, and `class` values are merged.

  So `<div class="a" class="b">` renders `class="b"`, but adding a modifier makes it
  `class="a b"`. Duplicate `type` attributes on an element without `...attributes` are a
  special case: the compile-time `type` reordering (§4.1) keeps only the *last* `type`
  occurrence and drops the others (`classified.ts:108-121`; verified: `<input type="a" type="b">`
  compiles to a single `type="b"`). See §05-14 item 15.

---

## 5. Truthiness and control-flow keywords

### 5.1 Truthiness (`toBool`)

Every conditional construct (`{{#if}}`, `{{#unless}}`, inline `if`/`unless`, the internal
`not`, and the `and`/`or`/`not` keyword helpers) uses the embedder hook `toBool`
(`packages/@glimmer/global-context/index.ts:69-74`). Ember's `toBool`
(`packages/@ember/-internals/glimmer/lib/utils/to-bool.ts:8-22`):

```
toBool(v):
  if v is an Ember proxy (ObjectProxy/ArrayProxy, `isProxy(v)`):
      consume v's `content` storage; return Boolean(get(v, "isTruthy"))
  if isArray(v) (native array or Ember array-like per @ember/array isArray):
      consume v's `[]` storage; return v.length !== 0
  if v is an htmlSafe SafeString: return Boolean(v.toString())     -- htmlSafe("") is falsy
  return Boolean(v)
```

Consequences (tables: `packages/@ember/-internals/glimmer/tests/utils/shared-conditional-tests.js:409-445`):
`[]` and `emberA()` are falsy, `[0]` is truthy, `new String("")`, `new Boolean(false)`, `new
Date()` and `htmlSafe(" ")` are truthy, `"false"`, `"null"`, `"0"`… (non-empty strings) are truthy, an ObjectProxy is truthy iff its `isTruthy`
(by default: iff its `content` is truthy), `htmlSafe("")` is falsy, `0`, `""`, `NaN`, `null`,
`undefined`, `false` are falsy, every other object (including `{}` and functions) is truthy.
Because array length and proxy content are consumed, pushing into a tracked/Ember array
re-evaluates the condition. `{{#let}}` does not use truthiness: `{{#let this.emptyArray as
|c|}}` always renders its block (`packages/@glimmer-workspace/integration-tests/test/updating-test.ts:1106-1119`).

An implementation that is not embedded in Ember MUST let the embedder supply `toBool`.

### 5.2 `{{#if}}` / `{{#unless}}` (block form)

```hbs
{{#if cond}}A{{else}}B{{/if}}          {{#unless cond}}A{{else}}B{{/unless}}
```

`unless c` is exactly `if (not c)` with the same blocks
(`packages/@glimmer/compiler/lib/passes/1-normalization/keywords/block.ts:154-214`; §03-4.4;
verified: `{{#unless this.c}}` compiles to `[41,[51,…],…]` and inline `{{unless c 1 2}}` to
`[52,[51,…],1,2]`).
`{{else if …}}` chains are nested `if`s in the `else` block (chapter 02).

Semantics:

```
renderIf(cond, A, B):
  region R (replaceable)
  t = toBool(cond)           -- a reactive computation
  render (t ? A : B) into R  -- a missing B renders nothing, so R holds <!---->
on update: if the computation of t is invalid, re-evaluate it; if t changed,
           destroy R's contents and render the other block into R.
           If t did not change, the chosen block is updated in place (its own
           reactive positions are revalidated normally).
```

(`packages/@glimmer/opcode-compiler/lib/syntax/statements.ts:299-319`,
`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/conditional.ts:134-227`,
`packages/@glimmer/runtime/lib/compiled/opcodes/vm.ts:209-264`.)

Only a change of the *boolean* causes replacement: changing `cond` from `1` to `"yes"` does not
re-render the block. The blocks A and B receive no block parameters. Tests:
`updating-test.ts:613-690`, `827-844`.

### 5.3 Inline `if` / `unless`

`{{if c a b}}`, `{{unless c a b}}`, and the sub-expression forms produce the reactive value of
§05-2. In content position the result is appended like any dynamic value (§05-3), so
`{{if c "truthy"}}` with falsy `c` renders an empty text node, and `{{if c CompA CompB}}` with
component values renders a component and replaces it when the selected component changes
(`updating-test.ts:692-826`; `strict-mode-test.ts:700-723`).

### 5.4 `{{#each}}`

```hbs
{{#each list key="…" as |item index|}}…{{else}}…{{/each}}
```

#### 5.4.1 Iteration protocol

The list value `L` is converted to an **iterator** each time the list computation is evaluated
(`packages/@glimmer/reference/lib/iterable.ts:141-160`):

```
iterate(L, keyPath):
  keyFor = makeKeyFor(keyPath ?? "@identity")
  if Array.isArray(L):
       empty := (L.length == 0)          -- the only read inside the list computation
       items are read lazily: step i yields (L[i], memo i) while i < L.length,
       with L.length re-read at every step
  else d = toIterator(L)      -- embedder hook
       if d is null: the list is empty
       else items/memos come from d
  each item's key = keyFor(value, memo), uniquified (§5.4.2)
```

Ember's `toIterator` (`packages/@ember/-internals/glimmer/lib/utils/iterator.ts:12-277`):

| Input | Items (value, memo) |
|---|---|
| not an object/function (`null`, `undefined`, `false`, numbers, strings…) | none (empty); only an `undefined` path is tested (`syntax/each-test.js:1158-1185`) |
| native array (only if not already handled above) | `(a[i], i)` — holes of sparse arrays are visited as `undefined` (`syntax/each-test.js:1190-1215`, via `emberA`) |
| Ember array (`isEmberArray`) | `(objectAt(a, i), i)` (`syntax/each-test.js:1043-1051`) |
| object with `Symbol.iterator` (Set, generator, Map…) | `(value, i)` — for a `Map`, value is the `[key, value]` entry (native `Set`: `syntax/each-test.js:1053-1069`; custom iterable: `syntax/each-test.js:1081-1087`, and, autotracked, `lib/suites/each.ts:89-135`; the `Map` entry shape is untested) |
| object with a `forEach` method | `forEach` is called once, eagerly; items collected as `(item, i)` (`syntax/each-test.js:1071-1079`) |
| any other object | none (empty) (untested) |
| wrapper produced by `-each-in` (§5.5) | see §5.5 |

Emptiness is known *before* rendering. For a plain array only `length` is read up front,
inside the list computation, so only that read is tracked there
(`packages/@glimmer/reference/lib/iterable.ts:201-226`). Its items are read one at a time
during rendering, interleaved with rendering each item's block, and `length` is re-read before
each item. So a plain array that shrinks while its items render stops early, and one that grows
renders the new items (tests `packages/@glimmer-workspace/integration-tests/lib/suites/each.ts:49-87`).
This changed in emberjs/ember.js#21598; before it, arrays were read in full up front. For
`forEach` sources the items are collected eagerly, so the count is known. For native
iterators the first `next()` is called to test emptiness (`iterator.ts:195-237`), and the
rest are consumed lazily during rendering, interleaved with rendering each item's block
(untested).

In Ember templates, `{{#each x}}` is compiled as `{{#each (-track-array x)}}` (§03-7.8, which
also notes that the wrapper is currently applied twice, harmlessly;
`packages/@ember/template-compiler/lib/plugins/transform-each-track-array.ts`), which consumes
`x`'s `[]` storage so that in-place mutations of Ember/tracked arrays re-evaluate the list
(`packages/@ember/-internals/glimmer/lib/helpers/-track-array.ts:17-30`).

#### 5.4.2 Keys

`key` is read **once**, when the `each` region is first rendered, and converted with
`String(k)` unless `null` (absent `key` means `@identity`)
(`packages/@glimmer/runtime/lib/compiled/opcodes/lists.ts:14-35`). A later change of the key
expression's value has no effect until the whole `each` is re-rendered for some other reason.
This is required behavior (author ruling, 2026-09-30), although no test pins it.

| `key` | key of item `(value, memo)` |
|---|---|
| `"@identity"` (default) | `value` itself; `null` is mapped to a private sentinel object (primitives: `syntax/each-test.js:467-483`, mixed objects and primitives: `syntax/each-test.js:485-503`; untracked items with `@identity` are not re-read: `lib/suites/each.ts:336-352`) |
| `"@index"` | `String(memo)` (`syntax/each-test.js:449-465`; `lib/suites/each.ts:163-189`) (for arrays: the index as a string; for `each-in`, the property/map key as a string — so `@index` in `each-in` keys by property name, and distinct object Map keys that stringify alike collide: `packages/@ember/-internals/glimmer/tests/integration/syntax/each-in-test.js:724-835`) |
| `"@key"` | `memo` (for arrays the index number; for `each-in` the property/map key; tested only for `each-in`, `each-in-test.js:750-768`) |
| any other string `p` | `value == null ? value : getPath(value, p)` (Ember `get`, supports dotted paths; `syntax/each-test.js:413-447`, `lib/suites/each.ts:137-161`) |
| [Dev] string starting with `@` other than the above | throws `invalid keypath: '${path}', valid keys: @index, @identity, or a path` (untested) |

(`iterable.ts:37-76`.) **Duplicate keys** are made unique within one iteration: the first
occurrence of a key `k` uses `k`; the *n*th subsequent occurrence (n ≥ 1) uses a stable
synthetic identity for the pair `(k, n)` that is the same object in every later iteration
(`iterable.ts:78-139`). Thus the list `["a", "b", "a", "a"]` has keys `a, b, (a,1), (a,2)`,
and removing the first `"a"` makes the old `(a,1)` item become key `a` — i.e. DOM is matched by
occurrence number, not by position. Tests confirm only that every duplicate renders and
survives updates (`syntax/each-test.js:505-525`, `573-595`, `653-669`; `lib/suites/each.ts:231-302`); the
occurrence-numbering rule itself is untested.

Key comparison is by `===` (SameValueZero is **not** used: `NaN` keys never match; see Open
questions; untested).

#### 5.4.3 Initial render

```
renderEach(L, key, bodyBlock, elseBlock):
  outer region R (replaceable), created at the each's position
  it = iterate(L, key)
  if it is empty:
      render elseBlock (if any) into R          -- otherwise R holds <!---->
  else:
      list region LR inside R
      for each item in it (in order):
          item region IR_k inside LR
          render bodyBlock into IR_k with block params (value, memo)
```

Block params: the first is the item value, the second is the memo (the index number for
arrays/iterables; the key for `each-in`). Both are reactive: when the item is retained with a
new value or a new index, positions that read them are updated in place
(`lib/suites/each.ts:191-229`, `syntax/each-test.js:395-411`, `updating-test.ts:1666-1700`,
`1825-1860`). Extra block params beyond two are `undefined` (untested).

#### 5.4.4 Update algorithm

On an update pass, if the list computation is invalid, a new iterator is computed. Then:

1. **Emptiness transition.** If emptiness changed (empty → non-empty or non-empty → empty),
   the whole outer region R is replaced: every existing item is destroyed and the list (or the
   `else` block) is rendered from scratch (`lists.ts:26`). *No* item DOM is reused across an
   empty/non-empty transition. Tests confirm the rendered output and that removed components
   are destroyed on emptying (`updating-test.ts:1985-2022`; `lib/suites/each.ts:137-161`,
   `345-372`); node non-reuse across the transition is untested.
2. Otherwise, if the iterator is a new one (the list computation was re-evaluated), the list is
   **synchronized** (below). If the list computation was valid, synchronization is skipped
   and only the existing items' inner content is revalidated.
3. After synchronization, each retained item's contents are revalidated in order.

Synchronization (`packages/@glimmer/runtime/lib/vm/update.ts:230-427`). Let `old` be the
previous items in DOM order (each with key, index, `retained=false`), `map` a key→item map.
A temporary empty comment `marker` is inserted immediately after the last node of the list
while synchronizing, and removed afterwards (`update.ts:233-249`).

```
sync(newIterator):
  i = 0            -- position in `old`
  seen = 0
  new = []
  for each (key, value, memo) from newIterator:
     cur = old[i]; while cur exists and cur.retained: i++, cur = old[i]
     if cur exists and cur.key === key:
         retain(cur)                          -- update value/memo, keep DOM in place
         i++
     else if map has key:
         it = map[key]
         if it.index < seen:
             move(it, before = cur)           -- it was already passed: move its DOM
         else:
             seen = it.index
             if every old[j] for i < j < seen is retained:
                 retain(it); i = seen + 1     -- skip over, no DOM move
             else:
                 move(it, before = cur); i++
     else:
         insert(key, value, memo, before = cur)  -- render a new item region before
                                                     cur's first node (or before marker)
  for each item in old: if not retained: destroy(item) and remove its DOM
                         else reset retained flag
  where
    retain(it): it.value := value; it.memo := memo; it.index = new.length; new.push(it)
    move(it, before): retain-like update, then move its DOM before `before`'s first node
                      (or before marker if none), unless it is already immediately there
    insert: renders the body block synchronously (initial render of that item) at that position
```

Observable consequences:

- Retained items keep their DOM nodes, component instances, and modifier instances; only the
  block params change.
- Inserted items are rendered *during* synchronization, before retained items that follow them
  are revalidated; so a component in a new item is created (and its hooks run) before later
  items' updates run.
- Deleted items are destroyed (destructors scheduled, §05-11) and their DOM removed during
  synchronization, in the order of the old list.
- Moving uses `insertBefore` of each top-level node of the item region; element identity is
  preserved (focus is not preserved by the DOM for moved elements, which is a platform
  behavior).
- When the list shrinks to empty, all items are destroyed and `else` is rendered.

Tests: `updating-test.ts:1492-1531` (bounds after swap/delete/empty), `1548-1985` (keyed updates,
`else`), `1985-2058` (a component's `willDestroy` has run by the time `rerender` returns, both
for a removed item and for the whole list emptied; see §05-11.3); `updating-test.ts:563-573`
(a helper passed to `each` is not torn down when the list toggles between empty and non-empty); `packages/@glimmer-workspace/integration-tests/lib/suites/each.ts:414-782`
pins the exact retain/move/insert/delete steps (in `LOCAL_DEBUG` builds only), e.g. swapping
items 1 and 7 of `1..8` is `retain 1, move 8, retain 3..7, move 2`; rotating `[8,1..7]` →
`move 8, move-retain 1, retain 2..7`; random shuffles perform no inserts or deletes and at most
`length` moves+retains. Duplicate primitives, duplicate objects, and duplicate key values all
render every occurrence (`each.ts:232-301`). Sync steps run only when `LOCAL_DEBUG` is set;
in normal test runs those tests return early, so the step sequences are pinned only for
developers who enable that flag. Insert and delete steps are asserted only as upper bounds
(`each.ts:686-760`); that inserted items render before later retained items are revalidated,
and that deleted items are removed in old-list order, are untested.

### 5.5 `{{#each-in}}`

`{{#each-in obj as |key value|}}` is compiled (in Ember) as
`{{#each (-each-in obj) as |value key|}}` (block params swapped; with a single block param
`|key|`, a hidden first param is inserted so that `key` receives the memo)
(`packages/@ember/template-compiler/lib/plugins/transform-each-in-into-each.ts`). The `-each-in`
helper consumes the object's identity storage (`tagForObject`), unwraps proxies to their
content, and wraps the object so `toIterator` iterates its entries
(`packages/@ember/-internals/glimmer/lib/helpers/each-in.ts:301-322`,
`packages/@ember/-internals/glimmer/lib/utils/iterator.ts:20-34`, `119-189`, `249-257`):

| Source | (value, memo=key) pairs |
|---|---|
| `null`/`undefined`/primitive | none |
| native array or Ember array | `Object.keys(a)` → `(a[k], k)` (keys are strings `"0"`, `"1"`, …) |
| native iterable (e.g. `Map`) | each entry `[k, v]` → `(v, k)` |
| object with `forEach` | `forEach((v, k) => …)`; if the callback is ever called with ≥2 arguments the source is map-like and pairs are `(v, k)`; otherwise it is treated as a list `(v, index)` |
| other object | `Object.keys(o)` (own enumerable string keys, in `Object.keys` order) → `(o[k], k)`; each property read consumes that property's storage (and an array value's `[]`). Inherited properties are not iterated; `Object.create(null)`, `{}` and objects with only inherited properties are empty (`each-in-test.js:57-97`, `361`). Sparse-array holes are skipped (`Object.keys`). Plain (untracked) assignment/`delete` on the object is not observed (`each-in-test.js:392-457`). |

The default key is `@identity` (of the *value*). Use `key="@key"` to key by property name.

### 5.6 `{{#let}}`

```hbs
{{#let a b as |x y|}}…{{/let}}
```

Binds the block params to the reactive values of the positional arguments and renders the
block. `let` is **not** a replaceable region: it never tears down, regardless of the values;
positions inside read the bound values reactively
(`packages/@glimmer/opcode-compiler/lib/syntax/statements.ts:361-364`,
`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/blocks.ts:86-120`). Extra block
params beyond the number of values are unbound (`undefined`); extra values are ignored. A helper
invoked in a `let` argument is created once and lives as long as the enclosing region.

### 5.7 `{{#in-element}}`

```hbs
{{#in-element destination insertBefore=x}}…{{/in-element}}
```

(`statements.ts:272-297`; `packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:75-124`;
`packages/@glimmer/runtime/lib/vm/element-builder.ts:232-263`, `477-513`.)

```
renderInElement(dest, insertBefore?, block):
  local region R at the in-element's position (replaceable) -- always contains <!---->,
                                                              since nothing renders locally
  if not dest (JS falsy): render nothing more
  else:
     if insertBefore was not written, or its value is undefined:
         remove all children of dest (last to first)
         cursor = (dest, null)                        -- append
     else:
         cursor = (dest, insertBefore)                -- insertBefore null ⇒ append at end,
                                                        existing children kept
     render block into a remote region RR at cursor (RR follows the empty-region rule)
on update: if dest's identity changed, or insertBefore (when written) changed identity,
           R is replaced: RR is destroyed and cleared, then re-rendered at the new target
on destroy: RR's DOM is removed, unless RR's first node is no longer a child of dest
```

- Tests (all in `packages/@glimmer-workspace/integration-tests/lib/suites/in-element.ts` unless
  noted):
  - Default mode clears the target's existing content (`73-93`;
    `public-in-element-test.js:43-73`).
  - `insertBefore=null` appends after existing children, and when the destination becomes
    falsy only the rendered content is removed, leaving the pre-existing children (`139-171`;
    `public-in-element-test.js:75-105`).
  - `insertBefore=<node>` inserts before it. Changing `insertBefore` from a node to `null`
    moves the content to the end. A falsy destination removes the content, and setting the
    destination back re-renders it at the node's original position (`173-206`).
  - Changing the destination moves the content (`208-258`).
  - A falsy destination renders nothing (Glimmer) and the host position holds `<!---->`
    (`95-137`).
  - Content inside the host position of a nested `in-element` is followed by a `<!---->`
    of the inner one (`Nesting`, `465-515`), and several sibling `in-element`s are independent
    (`Multiple`, `347-391`; and in a loop, `393-463`).
  - Components in the remote region are destroyed when the enclosing region is torn down
    (`517-560`; `public-in-element-test.js:161-225`). Appending into the element that is
    itself being rendered into (`insertBefore=null`) does not double-clear on teardown
    (`325-345`; `public-in-element-test.js:227-251`).
  - The [Dev] assertions below: `public-in-element-test.js:107-159`.
  - Untested: `insertBefore` explicitly `undefined`; changing `insertBefore` from one node to
    another node; re-clearing pre-existing content in default mode when the destination
    changes back; the "remote region does not count toward the enclosing bounds" rule; the
    `guid` compile error; the `isProduction` omission of `-in-el-null`.
- The block is evaluated in the enclosing context (same `self`, scope, owner).
- The remote region does not count toward the enclosing region's bounds.
- [Dev] In Ember, unless the template is compiled with `isProduction: true` (§03-7.9), `dest`
  is wrapped with `-in-el-null`, which asserts `You cannot pass a null
  or undefined destination element to in-element` (`packages/@ember/-internals/glimmer/lib/helpers/-in-element-null-check.ts:9-24`,
  `packages/@ember/template-compiler/lib/plugins/transform-in-element.ts`). Ember also asserts
  at build time that `insertBefore` is a literal `null` or `undefined`:
  `Can only pass null to insertBefore in in-element, received: …`.
- Glimmer itself accepts any node as `insertBefore` (it must be a child of `dest`).
- [Dev] Passing `guid` is a compile-time error: `` Cannot pass `guid` to `{{#in-element}}` ``.

### 5.8 `{{#-with-dynamic-vars}}` and `(-get-dynamic-var)`

`{{#-with-dynamic-vars name=value …}}block{{/-with-dynamic-vars}}` renders `block` with a
child dynamic scope in which each `name` is bound to the reactive `value`; the binding is
visible to everything rendered (dynamically) within, including components invoked there and
their layouts (`packages/@glimmer/runtime/lib/vm/append.ts:617-638`,
`packages/@glimmer/opcode-compiler/lib/syntax/statements.ts:366-377`). It is not a replaceable
region. `(-get-dynamic-var nameExpr)` evaluates to the current value of the dynamic variable
named `String(nameExpr)` in the dynamic scope in effect where the expression appears
(`packages/@glimmer/runtime/lib/compiled/opcodes/expressions.ts:310-321`); reading an unbound
name is an error in the current implementation (`scope.ts:26-28` unwraps `undefined`). These
are private keywords. Ember's outlets once used them, but `{{outlet}}` is now the lexical
`<@outlet />` (§08-8.3) and no current Ember template emits them. The name expression is itself
reactive: `{{-get-dynamic-var this.keyword}}` switches variables when `keyword` changes, and
inner `-with-dynamic-vars` shadow outer bindings only within their block
(`packages/@glimmer-workspace/integration-tests/lib/suites/with-dynamic-vars.ts:4-84`).
Ember allows only the key `outletState`; whether the general form is normative is open
(§05-14 item 17).

Every component invocation pushes a child dynamic scope (copy-on-write) for its layout; a
component manager with `dynamicScope` capability receives that scope in `create`/`update`
(`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:401-446`).

### 5.9 `{{log}}`

`{{log a b}}` (statement) or `(log a b)` (expression) evaluates to `undefined` and, each time
that value is computed, calls `console.log(...values)` with the current values of its
positional arguments (`expressions.ts:323-333`). Because it is a reactive computation, it logs
on initial render and again on each update pass in which any argument's consumed storage
changed. In content position the result renders as an empty text node.

### 5.10 `{{debugger}}`

`{{debugger}}` evaluates, once at the time the statement is reached during initial render (not on
updates), a callback `callback(context, get)`, where `context` is the current value of
`this` and `get(path)` reads `this`, a local, or `@arg` paths in the current scope (a path whose
head is not `this` or a known local is looked up on `this`)
(`packages/@glimmer/runtime/lib/compiled/opcodes/debugger.ts:16-83`). The default callback
logs a hint and executes a JavaScript `debugger` statement. It produces no DOM. Inside a
replaceable region it runs again each time the region is re-rendered (e.g. when an `{{#if}}`
flips), and not on updates that keep the region
(`packages/@glimmer-workspace/integration-tests/lib/suites/debugger.ts:14-88`). The default
callback logs `Use \`context\`, and \`get(<path>)\` to debug this template. For named arguments,
use \`get('@argName')\`.` when `this` is non-null, and the variant without `context` otherwise
(template-only components).

---

## 6. Blocks, `yield`, and block introspection

### 6.1 Blocks passed to a component

An invocation passes zero or more blocks to a component:

| Invocation syntax | Block names |
|---|---|
| `<Foo>…</Foo>`, `{{#foo}}…{{/foo}}` | `default` |
| `{{#foo}}…{{else}}…{{/foo}}` | `default`, `else` |
| `<Foo><:header>…</:header><:body>…</:body></Foo>` | `header`, `body` (a `<:default>` block is `default`; `<:else>` / `<:inverse>` are `else`) |
| attributes and modifiers on `<Foo …>` | the special block `attrs` (§05-7.5) |

Inside the component, the block named `n` is in slot `&n`; `inverse` is always an alias of
`else` (`packages/@glimmer/syntax/lib/symbol-table.ts:155-166`,
`packages/@glimmer/compiler/lib/passes/2-encoding/content.ts:186-192`). Tests: `<:else>` and
`<:inverse>` each satisfy both `has-block "else"`/`"inverse"` and both `yield to=` spellings
(`packages/@ember/-internals/glimmer/tests/integration/helpers/yield-test.js:60-84`); both may
declare block params and receive yielded values
(`lib/suites/emberish-components.ts:263-295`, `kind: 'curly'`); a `<:default>` block and an
arbitrary `<:baz>` block (`emberish-components.ts:207-260`); an implicit default
(`emberish-components.ts:225-243`). Passing both `<:else>` and `<:inverse>` is a compile-time
error (`packages/@glimmer-workspace/integration-tests/test/syntax/named-blocks-test.ts:73-105`).
A block is a closure
(§05-1.1) that also records its declared block-parameter count.

### 6.2 `{{yield}}`

`{{yield a b}}` / `{{yield a b to="name"}}` renders the block in slot `&name` (default
`default`; `to="inverse"` means `else`) at the current cursor
(`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/blocks.ts:34-46`,
`packages/@glimmer/runtime/lib/compiled/opcodes/vm.ts:166-207`):

```
yield(slot, args):
  B = scope[slot]
  if B is absent: render nothing (no region, no placeholder)
  else:
     scope' = B.capturedScope; if B declares k>0 params: scope' = child of it,
              param i bound to args[i] (a reactive value), or undefined if i ≥ args.length
     render B.body with scope' (self, args, blocks, owner of the *caller*)
```

- Yielded primitives render per §05-3 (`true`, `false`, `123.45`, empty for `null`/`undefined`);
  yielding to an absent block renders nothing at all (`Before--After`)
  (`packages/@glimmer-workspace/integration-tests/lib/suites/yield.ts:64-72`, `112-194`;
  Ember: `helpers/yield-test.js:215-239`).
- A yield inside `{{#if}}`/`{{#each}}` in the layout renders inline into that region and is
  removed with it (`yield.ts:196-215`; `helpers/yield-test.js:116-162`).
- A parameter with no corresponding yielded value is `undefined` (`42 - `), tested for curly
  and dynamic invocation only (`yield.ts:86-99`, `skip: 'glimmer'`; §14 item 13).
- `yield` is not itself a replaceable region: the yielded content is rendered inline into the
  current region. Yielding the same block several times renders it several times, each with its
  own instances.
- Yielded values are reactive: if the component yields `this.count`, the block's reads of the
  param update in place (block content updates, `helpers/yield-test.js:35-58`; yielded param updating
  is covered by `helpers/yield-test.js:322-345` but no test isolates it).
- The yielded block's `this` is the caller's `this` (lexical), and `@args` inside it are the
  caller's arguments (`helpers/yield-test.js:241-266`). Block params shadow outer names (chapter 03;
  `helpers/yield-test.js:268-320`).
- The owner in effect inside the yielded block is the owner of the block's defining scope
  (untested).
- Yielding the same block more than once, each time with its own instances, is untested.

### 6.3 `has-block` and `has-block-params`

`(has-block)`, `(has-block "name")`, `{{has-block "name"}}`: `true` iff a block was passed for
that slot (`packages/@glimmer/runtime/lib/compiled/opcodes/expressions.ts:249-258`). The
argument must be a string literal (compile-time error otherwise:
`(has-block) can only receive a string literal as its first argument`). `"inverse"` means
`else`. `(has-block-params "name")`: `true` iff that block was passed *and* declares at least
one block parameter (`expressions.ts:260-271`); so `(has-block-params "inverse")` is false even
when an `{{else}}` block is passed, because an `{{else}}` block cannot declare params
(`lib/suites/has-block-params.ts:9-19`, `79-100`; all of these are `kind: 'curly'`, which runs
for curly and dynamic invocation). A `<:else as |x|>` named block *can* declare params and is
yielded to with them (§05-6.1); what `has-block-params` reports for it is untested. The
`has-block` and `has-block-params` results for `default`, `else`, present and absent blocks
are covered in `lib/suites/has-block.ts:7-140` and `has-block-params.ts:34-134` (subexpression,
content, property, attribute and concatenated-attribute positions). A curried component yielded and invoked as
`<c/>` or `{{c}}` reports `has-block` false; `<c></c>` reports true
(`lib/suites/has-block.ts:279-342`, `has-block-params.ts:20-33`). Both values are constant
for the lifetime of the component instance (untested). In content position they render as
the text `true` / `false` (`has-block.ts:51-94`). The compile-time error for a non-literal
argument is untested.

For invocations that pass no `attrs` (e.g. curly invocations), `(has-block "attrs")` is not
expressible (the name `attrs` cannot be written by users).

### 6.4 Named blocks

Named blocks behave exactly like the default block for `yield to=`, `has-block`, and
`has-block-params`. When named blocks are used, all content of the invocation must be in named
blocks (chapter 03). A named block that is passed but never yielded is never rendered.

---

## 7. Component invocation

### 7.1 Invocation forms

| Form | Definition source | Arguments |
|---|---|---|
| `<Foo @a={{x}} class="c" {{m}}>…</Foo>` with `Foo` resolved statically (strict lexical / loose resolution) | static | named `@a`, blocks incl. `attrs` |
| `<this.Foo>`, `<@Foo>`, `<foo.Bar>`, `<local>` (path head) | dynamic value (§7.2) | same |
| **[Loose mode]** `{{foo a=x}}`, `{{#foo a=x}}…{{/foo}}` (resolved component) | static | named `a` → `@a`; positional; blocks `default`/`else` |
| `{{component def a=x}}`, `{{#component def}}…{{/component}}` | dynamic (strings allowed only in **[Loose mode]**) | named, positional, blocks |
| `{{this.Foo a=x}}`, `{{@Foo}}` (dynamic value in append position with component kind) | dynamic | named, positional; no blocks |
| component-kind value in `{{…}}` content (§05-3) | dynamic | none |

(`packages/@glimmer/opcode-compiler/lib/syntax/statements.ts:154-270`, `379-387`,
`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts:109-192`.)

### 7.2 Resolving a dynamic definition

A dynamic invocation is a **replaceable region** whose input is the definition value `d`:

```
invokeDynamic(dExpr, args, blocks, stringsAllowed):
  region R
  d = value(dExpr)
  if not d (JS falsy): render nothing (R holds <!---->)
  else:
     if d is a curried component: use it (§05-8)
     else if typeof d == "string":
         if stringsAllowed (only `{{component …}}` in loose mode) [Loose mode]:
             resolve the component named d with the current owner;
             [Dev] error if not found: `Attempted to resolve \`${d}\`, which was expected to be a component, but nothing was found.`
         else: [Dev] error (angle-bracket/path invocation):
             `Expected a component definition, but received ${d}. You may have accidentally done <${label}>, where "${label}" was a string instead of a curried component definition. …`
         [Dev] in strict mode, `{{component "str"}}` throws
             `Attempted to resolve a dynamic component with a string definition, \`${d}\` in a strict mode template. …`
     else if d has a component manager: use it
     else [Dev] throw `Expected a dynamic component definition, but received an object or function that did not have a component manager associated with it. …`
     invoke the component (§7.3–7.6) into R
on update: if d's identity changed, R is replaced (old instance destroyed, new one created).
```

(`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:162-276`,
`packages/@glimmer/runtime/lib/compiled/opcodes/vm.ts:209-224`.) Any change of identity —
including a new curried value produced by `(component …)` — replaces the region; see §05-8.2 for
when `(component …)` produces a new curried value.

### 7.3 Arguments

For each invocation the runtime builds an **arguments object**:

- **positional**: an ordered list of reactive values;
- **named**: an ordered map `name → reactive value` (names without `@`; for angle-bracket
  invocations the order is source order of `@args`);
- **blocks**: the passed blocks (§6.1), including `attrs` for angle-bracket invocations with
  attributes or modifiers.

Arguments are *never* evaluated by the invocation itself. Each named argument is exposed in the
component's layout as `@name`, reading the caller's reactive value directly: a change to the
caller's value updates exactly the positions in the layout (and anything else) that read it, and
does not by itself replace any region. Positional arguments are not accessible from the layout
by syntax; they are available to the manager (chapter 06).

**Duplicate named arguments** (`{{h a=1 a=2}}`, `<Foo @a={{1}} @a={{2}} />`) are kept by the
parser and the compiler (verified: the hash is `[["a","a"],[1,2]]`). From source (untested),
the two readers disagree. A component layout's `@a` is bound to the **first** occurrence
(`packages/@glimmer/runtime/lib/vm/arguments.ts:310-329` uses `indexOf`; the static path in
`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts:337-350` binds in
reverse so the first wins). The captured arguments that managers, helpers, and modifiers see
(`args.named.a`, §06-3) hold the **last** occurrence (`arguments.ts:331-344` overwrites the
map), and list the name once. See §05-14 item 15.

If the definition is curried (§05-8), its curried arguments are merged **before** the manager
sees the arguments (`component.ts:304-360`,
`packages/@glimmer/runtime/lib/vm/arguments.ts:199-215`, `347-368`):

- curried positional arguments are **prepended** (innermost curry first);
- curried named arguments are added only for names **not** passed at the invocation (the
  invocation wins); among nested curries, the outermost curry wins.

If the manager has the `prepareArgs` capability, `prepareArgs(definitionState, args)` is called
next; if it returns `{positional, named}`, those replace the arguments (blocks are kept)
(`component.ts:362-399`). This is how classic components implement `positionalParams`
(chapter 08) **[Legacy]**.

### 7.4 Invocation sequence

The observable sequence for one invocation (initial render), where "manager" is the internal
component manager and capabilities are as defined in chapter 06
(`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts:194-479`,
`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:401-935`):

```
invoke(definition, args):
  1. resolve curried definition, merge curried args, determine curried owner   (§7.3, §7.8)
  2. if capability prepareArgs: args = prepareArgs(...)
  3. open the component update region (§05-1.6) and the component's output region
  4. push a child dynamic scope
  5. if capability createInstance:
         state = manager.create(callerOwner, definitionState,   -- the INVOKING scope's owner
                                args (if createArgs) else null,
                                env, dynamicScope (if dynamicScope) else null,
                                callerSelf (if createCaller) else null,
                                hasDefaultBlock)
  6. if the definition has no static layout (capability dynamicLayout):
         layout = manager.getDynamicLayout(state, resolver)
         (null ⇒ an empty default layout, or the "wrapped" empty layout if capability wrapped)
  7. d = manager.getDestroyable(state); if d: register d as a destroyable child of the
         enclosing region (§05-11)
  8. self = manager.getSelf(state)
  9. new root scope: owner (§7.8), this = self, each `@name` = args.named[name],
         each `&block` = the passed block
 10. render the layout into the component's output region:
         if capability wrapped: §7.6
         else: the layout's statements
 11. bounds = the component's output region
     if capability createInstance:
         manager.didRenderLayout(state, bounds)            -- synchronous, DOM is in place
         queue didCreate(state) for commit                 -- §05-1.4
 12. close the component update region
```

On an **update pass**, if the component update region is invalid (§05-1.6):

```
  a. if capability updateHook: manager.update(state, dynamicScope)   -- before any layout updates
  b. revalidate the layout content (attributes, text, nested regions, child components…)
  c. if capability createInstance:
        manager.didUpdateLayout(state, bounds); queue didUpdate(state) for commit
```

(`component.ts:941-969`.) Hook ordering across a tree therefore is:

- `create`: parents before children (pre-order), since a child is created while its parent's
  layout renders.
- `didRenderLayout`: children before parents (post-order).
- `didCreate`: at commit, in `didRenderLayout` order (children before parents).
- `update`: parents before children (pre-order), only for components whose region is invalid.
- `didUpdateLayout`: post-order; `didUpdate` at commit in that order.

Tests (classic components, whose hooks map onto these, §08-6.7): `init`, `didReceiveAttrs`,
`willRender` and `willInsertElement` run top → middle → bottom; `didInsertElement` and
`didRender` run bottom → middle → top; on update `willUpdate`/`willRender` run top → bottom and
`didUpdate`/`didRender` bottom → top, and re-rendering a middle component involves only it and its
ancestors' hooks as shown (`packages/@ember/-internals/glimmer/tests/integration/components/classic/life-cycle-test.js:305-537`); the
sibling case is in `packages/@ember/-internals/glimmer/tests/integration/components/classic/life-cycle-test.js:538-858`; changed attributes trigger `didUpdateAttrs`/
`didReceiveAttrs` before `willUpdate` (`packages/@ember/-internals/glimmer/tests/integration/components/classic/life-cycle-test.js:859-1043`). For public managers only the
per-instance sequences `createComponent, getContext, didCreateComponent` and
`updateComponent, didUpdateComponent` are tested
(`packages/@ember/-internals/glimmer/tests/integration/custom-component-manager-test.js:476-535`,
`694-757`). The ordering across a tree of public-manager components was observed by experiment
(T9b; a parent `p` with children `c1`, `c2`, all with `updateHook`, `destructor` and
`asyncLifecycleCallbacks`): initial render `p.createComponent, c1.createComponent,
c2.createComponent, c1.didCreateComponent, c2.didCreateComponent, p.didCreateComponent`; an
argument change reaching all three `p.updateComponent, c1.updateComponent, c2.updateComponent,
c1.didUpdateComponent, c2.didUpdateComponent, p.didUpdateComponent`; removal of the enclosing
`if` `p.destroyComponent, c1.destroyComponent, c2.destroyComponent`. This matches the bullets
above (verified by experiment, T9b). Its order against modifier installs is in §06-11.
The public custom component manager (chapter 06) maps: `createComponent` ← `create`,
`getContext` ← `getSelf` (called once per instance), `updateComponent` ← `update` (only with the
`updateHook` capability), `didCreateComponent` / `didUpdateComponent` ← `didCreate` /
`didUpdate` (only with `asyncLifecycleCallbacks`), `destroyComponent` ← a destructor registered
on the destroyable (only with `destructor`)
(`packages/@glimmer/manager/lib/public/component.ts:143-199`; tests:
`packages/@ember/-internals/glimmer/tests/integration/custom-component-manager-test.js:426-862`
— initial `['createComponent', 'getContext', 'didCreateComponent']`, on arg change
`['updateComponent', 'didUpdateComponent']`, siblings updated in document order, no
`updateComponent` without the `updateHook` capability). Classic components show the same
shape: sync pre-render hooks parent-first, `didInsertElement`/`didRender` child-first
(`classic/life-cycle-test.js:305-537`). Since the custom manager has
`updateHook` and `createInstance`, `updateComponent` is called whenever the component's update
region is invalid — i.e. when anything consumed in its subtree changed, not only when its
arguments changed (see Open questions).

### 7.5 `...attributes`

The `attrs` block of an angle-bracket invocation contains, in order: the invocation's HTML
attributes in source order (with `type` moved last when the invocation itself has no
`...attributes`), then its modifiers in source order
(`packages/@glimmer/compiler/lib/passes/1-normalization/visitors/element/classified.ts:98-156`).
Attribute values and modifier arguments in it are evaluated in the **caller's** context.

When the component's layout contains an element with `...attributes`, that element is an
"element with dynamic features" (§05-4.8), and at the position of `...attributes` the attrs block
is evaluated: its attributes are recorded into the element's deferred-attribute list and its
modifiers are created for that element (`statements.ts:149-152`, `166-168`). Therefore, for

```hbs
{{! caller }}   <Foo class="caller" title="caller" data-x="caller" {{m1}} />
{{! Foo }}      <div class="inner" title="inner" ...attributes data-x="inner" {{m2}}></div>
```

(Tests: `packages/@glimmer-workspace/integration-tests/lib/suites/components.ts:109-139`,
`558-626`: an attribute before `...attributes` is clobbered by the invocation, after it wins;
forwarded classes before the splat merge as `"qux bar foo top"`, after as `"top foo bar qux"`;
`packages/@ember/-internals/glimmer/tests/integration/components/angle-bracket-invocation-test.js:973-1097`.)

- `class` is merged in recording order: `"inner caller"`;
- `title`: recorded `inner`, then `caller` ⇒ **caller wins** (attributes *before*
  `...attributes` are overridable by the invocation);
- `data-x`: recorded `caller`, then `inner` ⇒ **inner wins** (attributes *after*
  `...attributes` override the invocation);
- attribute order in the DOM is the order of *first* recording of each name: `class`, `title`,
  `data-x` (except that `type` is always applied last);
- modifiers forwarded through `...attributes` to several elements run on each, in document
  order (`modifiers-test.ts:110-131`, `265-301`);
- modifiers are created in the order `m1` (from the splat), then `m2` (the element's own
  modifiers come after all attributes, including the splat); they are installed in that order.
  Consequence for `{{on}}`: the DOM runs listeners in the order they were added, so the
  caller's listeners run before the element's own, wherever `...attributes` stands in the
  attribute list (`<button {{on 'click' this.inner}} ...attributes>` and
  `<button ...attributes {{on 'click' this.inner}}>` both run the caller's `{{on}}` first),
  and listeners on an ancestor element inside the component run after both unless one of
  them calls `event.stopPropagation()`, which does not stop the other listeners on the same
  element (tests `packages/@ember/-internals/glimmer/tests/integration/modifiers/on-test.js:300-374`).

Forwarding: `<Inner ...attributes class="x" />` inside a component passes an `attrs` block to
`Inner` whose content is the outer `attrs` block (at the splat position) plus its own attributes,
recursively; precedence composes positionally.

If a component's layout has no `...attributes`, the invocation's attributes and modifiers are
not evaluated at all (modifiers are never created). If `...attributes` appears on several
elements, the attrs block is evaluated once per occurrence (each occurrence creates its own
modifier instances and invokes helpers in attribute values separately). `...attributes` in a
template that received no `attrs` block (e.g. curly invocation, or a route template) does
nothing.

### 7.6 Wrapped components (classic) **[Legacy]**

A manager with the `wrapped` capability (Ember classic components, chapter 08) has its layout
rendered inside a wrapper element (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts:413-439`):

```
  tag = manager.getTagName(state)
  if tag (truthy):
     open element `tag` with deferred attributes (§05-4.8)
     manager.didCreateElement(state, element, operations)   -- element not yet in the DOM;
                                                             -- the manager may record attributes
     evaluate the invocation's attrs block into the same deferred list
     flush attributes; insert the element
     render the layout inside it
     close the element
  else:
     render the layout directly ("tagless")
```

Attributes recorded by `didCreateElement` (e.g. `id`, `class` from `classNames`,
`attributeBindings`) are recorded *before* the invocation's attributes, so the invocation's
attributes override them, except `class`, which is merged (manager classes first). If the
layout also has an element with `...attributes`, the attrs block is evaluated there as well
(§05-7.5), so the invocation's attributes appear on both the wrapper and that element. Tests (on
branch `test/w2-glimmer-harness`, not yet upstream; they replace tests that ran on a fake
classic component): `packages/@ember/-internals/glimmer/tests/integration/components/classic/angle-bracket-invocation-test.js` › "invocation attributes win over
attributeBindings", "invocation attributes are merged with the classes of the component",
"explicit ...attributes in the layout receive the invocation attributes".

### 7.7 Arguments on update

Named/positional arguments are reactive values from the caller; nothing is "re-sent". What
changes on update is only which values are invalid. Managers that snapshot arguments (e.g.
classic components) do so in their `update` hook (chapter 08).

### 7.8 Owner

`manager.create` always receives the owner of the **invoking** scope
(`component.ts:429-437`). The owner of the component's *layout scope* — used for resolution
inside the layout, for nested invocations' `create`, and returned by helpers/modifiers
created inside it — is (`component.ts:826-854`):

1. `manager.getOwner(state)` if the manager has the `hasSubOwner` capability (used by engines,
   chapter 08);
2. otherwise, the owner captured by the curried value, if the definition was curried (§05-8);
3. otherwise, the owner of the invoking scope.

Blocks passed to the component keep the owner of the scope in which they were written.

**[Loose mode]** For a curried component whose inner definition is a string, the string is resolved
with the **curried** owner (`component.ts:329-335`). See Open questions for the asymmetry
between the owner given to `create` and the owner of the layout.

---

## 8. Curried values: `(component)`, `(helper)`, `(modifier)`

### 8.1 Representation

A **curried value** is an opaque object recording: a kind (component, helper, or modifier), an
inner definition (a definition object, another curried value of the same kind, or — for
components in loose mode — a string name), the owner in effect where it was created, and a
set of captured arguments (positional list and named map of reactive values)
(`packages/@glimmer/runtime/lib/curried-value.ts:30-118`). Curried values are recognized by
identity (a private registry), not by shape. They have no public API; they can only be
invoked, passed around, and compared by identity.

### 8.2 Creating a curried value

`(component d a b k=v)` (and `(helper …)`, `(modifier …)`) evaluates to a reactive value whose
computation is (`packages/@glimmer/runtime/lib/references/curry-value.ts:19-73`):

```
curry(kind, dExpr, capturedArgs):
  d = value(dExpr)
  if d === previous d: return previous result          -- identity is stable
  if d is a curried value of the same kind: result = new curried(kind, d, owner, capturedArgs)
  else if kind == component and d is a non-empty string:
      [Dev] if strict mode: throw "Attempted to resolve a dynamic component with a string definition, …"
      [Dev] if no component named d can be resolved: throw
            "Attempted to resolve `${d}`, which was expected to be a component, but nothing was found."
      result = new curried(kind, d, owner, capturedArgs)   -- resolution happens at invocation
  else if d is an object or function: result = new curried(kind, d, owner, capturedArgs)
  else: result = null
```

Key properties:

- The curried value's identity changes **only when the definition value `d` changes identity**.
  Changes to the curried *arguments* do not create a new curried value; the arguments are
  captured as reactive values and flow into the invoked component/helper/modifier reactively.
  Hence `{{#let (component "x" title=this.t) as |C|}}<C/>{{/let}}` does not re-create the
  component when `this.t` changes; the component sees `@title` update.
- The curried owner is the owner of the scope where the `(component …)` expression appears.
- `d` that is not an object/function/non-empty-string yields `null`, which invokes to nothing
  (a falsy component definition renders nothing; a null helper yields `undefined`; a null
  modifier is a no-op).
- The manager of the inner definition is *not* checked when currying objects; errors surface at
  invocation.

### 8.3 Invoking a curried value

Resolution flattens nested curried values from the outside in
(`curried-value.ts:62-108`):

```
resolveCurried(c):
  positional = []; namedLayers = []
  loop:
     if c has args: positional = c.args.positional ++ positional
                    namedLayers.unshift(c.args.named)
     if c.inner is curried: c = c.inner; continue
     return { definition: c.inner, owner: c.owner (of the innermost curry), positional, namedLayers }
```

So for `(component (component X a k=1) b k=2)`, invoking with `(c) k=3` gives positional
`[a, b, c]`; named `k`: the invocation's `3` wins; without it, the outer curry's `2` wins over
the inner `1`. Positional concatenation order is innermost curry → outer curries → invocation.

Merge rules per kind:

| Kind | Positional | Named |
|---|---|---|
| component | curried prepended to invocation positional (`component.ts:345-348`) | invocation names win; curried names added only if absent (`arguments.ts:347-368`); among curries, later (outer) layers override earlier (`Object.assign({}, ...layers)`, `component.ts:340-343`) |
| helper | `curried.concat(invocation)` (`expressions.ts:115-122`) | `Object.assign({}, ...layers, invocationNamed)` — invocation wins |
| modifier | `curried.concat(invocation)` (`dom.ts:244-251`) | `Object.assign({}, ...layers, invocationNamed)` — invocation wins |

The owner used is the innermost curry's owner (for components, see §05-7.8; for helpers and
modifiers it is passed to the manager as the owner — `expressions.ts:111-124`, `dom.ts:233-242`).

A curried value may be invoked in any position appropriate to its kind:

| Kind | Positions |
|---|---|
| component | `<C …>`, `{{C …}}`, `{{#C}}…{{/C}}`, `{{component C …}}`, `{{C}}` in content, `(component C …)` re-currying, passed as an argument |
| helper | `(h …)`, `{{h …}}`, `{{h}}` in content, attribute values `attr={{h …}}`, `(helper h …)` re-currying |
| modifier | `<div {{m …}}>`, `(modifier m …)` re-currying |

A curried component in a helper position (or vice versa) is classified by its kind: in content
position a curried component renders as a component and a curried helper is invoked as a helper
(§05-3.2).

---

## 9. Helper invocation

### 9.1 Static helper invocation

For `(helper args)` / `{{helper args}}` / `attr={{helper args}}` where the helper's definition
is known when the template is linked (resolved in loose mode, a lexical strict-mode value, or a
keyword helper):

```
when evaluation reaches the expression (initial render of the enclosing region):
  inst = manager-specific helper function(args, owner, dynamicScope)   -- creates the instance
  if inst has destroyable children: associate inst with the enclosing region (§05-11)
  the expression's value = inst's reactive value
```

(`packages/@glimmer/runtime/lib/compiled/opcodes/expressions.ts:175-186`.) For helpers with a
public helper manager (chapter 06), creating the instance calls `createHelper(definition,
args)` immediately, and the value is a reactive computation calling `getValue(bucket)` —
computed lazily when first read and re-computed only when consumed storage changed
(`packages/@glimmer/manager/lib/public/helper.ts:100-150`). The destroyable returned by
`getDestroyable(bucket)` is destroyed with the enclosing region.

A helper instance is created **once per evaluation of the enclosing region**: it survives
update passes and is destroyed only when its region is destroyed or replaced. In particular a
helper in the condition of an `{{#if}}`, the list of an `{{#each}}`, a `let` value, or a
component argument lives as long as the enclosing region
(`packages/@glimmer-workspace/integration-tests/test/updating-test.ts:443-599`).

The *value* of a helper is read only by consumers: a helper whose value is never read (e.g. an
argument the component never reads) still has its instance created (and `createHelper` called),
but `getValue` is never called. The exception is a named argument of a statically invoked
template-only component that its layout never references: it is not evaluated at all, so no
instance is created (§05-1.1, §06-5).

### 9.2 Dynamic helper invocation

For `(this.h args)`, `{{@h args}}`, `(local args)` where the head is a value:

```
value(expr) =
  recompute instance when the head value changes (checked whenever the value is read):
     destroy the previous instance, if any
     d = value(head)
     if d is a curried helper: resolve (§8.3), merge args, create instance with curried owner
     else if d is an object/function: create an instance with the current owner
          [Dev] if d has no helper manager: error
              "Expected a dynamic helper definition, but received an object or function that did
               not have a helper manager associated with it. …"
     else: instance = the constant undefined
  return value(instance)
```

(`expressions.ts:95-173`.) The instance holder is associated with the enclosing region, so the
last instance is destroyed with the region. A head change destroys the old instance *at the
time the new value is first read* during an update pass (tests:
`packages/@glimmer-workspace/integration-tests/test/strict-mode-test.ts:836-923`).

### 9.3 Helper results in each position

- In content: §05-3 (a helper result is displayed with "non-dynamic append": component/helper
  kinds of the result are stringified).
- In an attribute: §05-4.
- As an argument: the helper's reactive value is passed (lazy).

### 9.4 Built-in keyword helpers

The following helpers are provided by the runtime and are available as keywords (strict mode) /
globals (loose mode); their exact availability is specified in chapters 03 and 08. Their
runtime semantics (`packages/@glimmer/runtime/lib/helpers/*.ts`):

| Helper | Value |
|---|---|
| `(array a b …)` | a new array of the current values, recomputed when any is invalid |
| `(hash k=v …)` | a new plain object `{k: value(v)}` recomputed when any is invalid; property reads `(hash …).k` read the argument directly without materializing the object (`hash.ts:17-27`) |
| `(concat a b …)` | `String` of each value (`null`/`undefined`/no-`toString` → `""`) joined with `""` |
| `(get obj path)` | `getPath(obj, String(path))` if `obj != null`, else `undefined`; the value is *settable* (two-way binding target) via `setPath` |
| `(fn f a b)` | a function that, when called with `(...x)`, calls `f` with `this` = a debug-only untouchable object and arguments `(value(a), value(b), ...x)`; a new function identity is produced only when the reactive value is invalidated. [Dev] `You must pass a function as the \`fn\` helper's first argument, you passed ${v}. …`. If `f` is a `mut`-style invokable reference, calling the function sets it (chapter 08). |
| `(eq a b)`, `(neq a b)` | `a === b`, `a !== b`. [Dev] exactly two arguments. |
| `(lt a b)`, `(lte …)`, `(gt …)`, `(gte …)` | JS `<`, `<=`, `>`, `>=`. [Dev] exactly two arguments. |
| `(and a b …)` | the first argument whose value is falsy per `toBool`, else the last; only arguments up to it are read. [Dev] at least two arguments. |
| `(or a b …)` | the first argument whose value is truthy per `toBool`, else the last. [Dev] at least two arguments. |
| `(not a)` | `!toBool(a)`. [Dev] exactly one argument. |

---

## 10. Modifier invocation and lifecycle

### 10.1 Static modifiers

For `<div {{m args}}>` with a statically known modifier definition
(`packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:166-205`, `138-151`):

```
at the modifier's position in the element's params (after all attributes are *recorded*,
but before they are *applied* — §05-4.8):
  if env is not interactive: skip entirely
  state = manager.create(owner, element, definitionState, capturedArgs)
          -- element is the new element: not yet in the document, attributes not yet set
  record the instance on the element
when the element is closed (after its children have rendered):
  schedule install(state) at commit; associate manager.getDestroyable(state) with the
  enclosing region
```

At commit, `install` runs with auto-tracking: storage consumed during `install` (including
argument reads) determines when `update` is needed (`packages/@glimmer/runtime/lib/environment.ts:63-78`;
`packages/@ember/-internals/glimmer/tests/integration/custom-modifier-manager-test.js:218-275`,
`packages/@glimmer-workspace/integration-tests/test/managers/modifier-manager-test.ts:165-217`,
`329-430`: only arguments consumed by a hook cause `update`).

Tests: several modifiers on one element install in source order, `<div {{foo}} {{bar}}>` gives
`foo, bar` (`packages/@glimmer-workspace/integration-tests/test/modifiers-test.ts:304-324`); a nested
element's modifiers install before its parent's (`350-370`), and siblings install in document
order before the parent (`396-423`). When the environment is not interactive no modifier hook
runs (`custom-modifier-manager-test.js:589-643`). That `create` sees an element with no
attributes and outside the document is untested (§14 item 12).

### 10.2 Dynamic modifiers

For `<div {{this.m args}}>` / `{{@m}}` / curried modifiers (`dom.ts:207-319`, `330-384`):

```
  d = value(head)
  if d is not an object/function: no modifier (no-op), but keep watching d
  else if d is a curried modifier: resolve (§8.3), merge args, owner = curried owner
  else owner = current owner
  [Dev] no modifier manager (plain functions included: there is no default modifier
        manager, §06-1.5) ⇒ error "Expected a dynamic modifier definition, but received an
        object or function that did not have a modifier manager associated with it. …"
  create as in §10.1; install at commit
on update: if d's identity changed:
     destroy the old instance (its destructor is scheduled, §05-11)
     create the new one immediately (element is in the document), schedule its install at commit
  else if the instance's tracked inputs are invalid: schedule update at commit
```

Tests: a modifier that is `undefined` at first and set later is installed on that update, and is
destroyed when its enclosing block is removed or the render result is destroyed
(`custom-modifier-manager-test.js:110-137`;
`packages/@glimmer-workspace/integration-tests/test/modifiers/dynamic-modifiers-test.ts:204-254`);
curried modifiers with positional and named arguments (`dynamic-modifiers-test.ts:44-138`).
Replacing one modifier definition by another on an element that stays, and the timing of the
new instance's `create`, are untested.
### 10.3 Updates

On an update pass, when the traversal reaches an element's modifier position (which is at the
element's *opening*, before the element's children), each modifier whose tracked inputs
(everything consumed by its last `install`/`update` — §06-7.3, §07-2.4.6) have changed is
**scheduled** for `update`; all scheduled updates run at
commit in scheduling order (document pre-order) (`dom.ts:321-341`,
`environment.ts:80-95`). A modifier's `update` never runs in the same transaction as its
`install` (verified by experiment, T9b; see below). Tests confirm that `update` runs when a consumed argument changes, not on a no-op
re-render, and never for constant arguments
(`packages/@glimmer-workspace/integration-tests/test/updating-modifiers-test.ts:28-71`;
`modifiers-test.ts:56-82`). The pre-order of scheduled updates across elements was
observed by experiment (T9b): modifiers `a` on an outer element, `b` and `c` on its two
children, `d` on a later sibling, all consuming one argument, updated in the order
`a, b, c, d` (verified by experiment, T9b). The same-transaction rule was tried by
experiment (T9b): a component's `didCreateComponent` (which runs before modifier installs) changed
a value the modifier consumes. `installModifier` then saw the new value and **`updateModifier` was
never called**, in that or a later transaction, although the component's own `updateComponent`/
`didUpdateComponent` ran in a follow-up transaction, which is consistent with the snapshot of the subtag's value that
`updateTag` takes when `install` finishes (`validators.ts:175-209`; not tested separately), so that a
change made before `install` is absorbed. A change made by `installModifier` itself after reading the value is
rejected in DEV by the backtracking assertion (`You attempted to update ... but it had already been
used previously in the same computation`). Hence `updateModifier` can only run in a transaction
after the one that installed the modifier (verified by experiment, T9b).

### 10.4 Destruction

A modifier is destroyed when its element's enclosing region is destroyed; for managers created
through the public modifier manager API, `destroyModifier` runs as a (deferred) destructor
(`packages/@glimmer/manager/lib/public/modifier.ts:107-127`). At that time the element has
already been removed from the document (verified by experiment, T9b: in the `actions` queue the
element has `isConnected === false`; a top-level removed element has no parent, and an element
nested in a removed element is still attached to its detached parent).

Tests: the destructor runs when the element's block is removed and again for a re-created
element (`updating-modifiers-test.ts:73-105`). Several modifiers on one element are destroyed in
source order (`modifiers-test.ts:326-348`); nested elements' modifiers are destroyed child-first
(`372-394`) and siblings in document order before their parent (`425-458`).

---

## 11. Destruction

### 11.1 The destroyable tree

Everything a render creates that may need cleanup — replaceable regions, list items, component
destroyables (`getDestroyable`), helper instances with destroyables, modifier destroyables,
in-element remote regions, the render result itself — is registered as a **destroyable child**
of the innermost *enclosing region* at the time it is created
(`packages/@glimmer/runtime/lib/vm/append.ts:509-514`, `684-687`). The enclosing region is the
nearest replaceable region, list item, or the render root; **components are not regions**:
a component's destroyable and the destroyables created while rendering its layout are siblings
under the same enclosing region, in creation order (component destroyable first, since it is
registered before its layout renders — `component.ts:448-468`), unless the layout content is
inside its own nested region.

Registration order within a region is creation order, which is:

- component destroyables: when the invocation is reached (before its layout);
- nested regions (`if`, `each`, `each` items, dynamic content, dynamic components, in-element):
  when entered;
- helper instances: when the helper expression is reached;
- modifier destroyables: when their element is **closed** (after the element's content). This
  is the required order in every build, with or without the debug render tree
  (`packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:138-163`: when the debug render tree is
  on, the modifier's state is associated there too, next to the manager's destroyable).
  Before emberjs/ember.js#21639, a development build (where Ember's `ENV._DEBUG_RENDER_TREE`
  defaults to `true`) also associated the state when the modifier was *created*, and that earlier
  position won, so modifiers were registered when their element was **opened**. The author ruled
  that the production order is correct for both (§11.3; tests
  `packages/@ember/-internals/glimmer/tests/integration/custom-modifier-manager-test.js`,
  "Custom modifier manager: destruction order").

### 11.2 Destroying

Destroying a destroyable follows the `destroy(obj)` algorithm of §06-10.2: the whole subtree
is marked destroying, children are destroyed before their parent, eager destructors run
synchronously, and ordinary (deferred) destructors are scheduled through the embedder hook
`scheduleDestroy`. Ember schedules deferred destructors into the run loop's `actions` queue
and the "destroyed" finalizers into the `destroy` queue (§06-10.2), so destructors run after
the current render queue flush, and all objects become `isDestroyed` at the end of the run
loop.

When a region is replaced or removed (§05-1.5, §05-5.4):

1. all its destroyable children are destroyed (as above — destructors *scheduled*);
2. its DOM is removed synchronously;
3. (for replacement) the new content is rendered.

Therefore user-visible destructors (`willDestroy`, `destroyComponent`, `destroyModifier`,
helper destroyables) run **after** the corresponding DOM has been removed from the document,
and after the new content has been rendered. Eager destructors (used by managers with the
`willDestroy` capability — classic components' `willDestroyElement`/`willClearRender`, chapter
08) run synchronously, *before* the DOM is removed.

Test status: the eager half is pinned. A classic component's `willDestroyElement` sees its
element still attached with its siblings intact, for items removed from an `each` and from
`if` blocks (`packages/@ember/-internals/glimmer/tests/integration/components/classic/life-cycle-test.js:1429-1587`), and it runs
before the replacement content is created (`packages/@ember/-internals/glimmer/tests/integration/components/classic/life-cycle-test.js:1161-1184`). The deferred half is pinned only as
"after the replacement content's hooks" (`didDestroyElement` and `willDestroy`,
`packages/@ember/-internals/glimmer/tests/integration/components/classic/life-cycle-test.js:1202-1221`); that deferred destructors run
after the old DOM has been removed, in the run loop's `actions` queue, with `isDestroyed`
becoming true in the `destroy` queue, was observed by experiment (T9b; verified by experiment,
T9b): a helper with a destroyable inside `{{#if}}<p id=x>…</p>{{/if}}`, after the `if` went false,
ran its `registerDestructor` callback with current queue `actions`, `isDestroying` true,
`isDestroyed` false and `#x` no longer in the document; a probe scheduled in `afterRender` saw
`isDestroyed` false, a probe scheduled in the `destroy` queue before the render saw false, one
scheduled from `afterRender` into `destroy` saw true, and `isDestroyed` was true when the
enclosing run loop returned. The destructor ran after the `render` queue (which removes the DOM)
had finished and before `afterRender`, because `actions` precedes `render` in the queue order and
is re-flushed when work is scheduled into it. A
component's `willDestroy` has run by the time a Glimmer-harness `rerender` returns
(`packages/@glimmer-workspace/integration-tests/test/updating-test.ts:1985-2058`), which does not
distinguish queues.

### 11.3 Order

Because children are destroyed before their parent's own destructors are scheduled, and
components are siblings of their layout's content (§11.1), the order in which destructors are
scheduled is a walk of the *region* tree in creation order:

- **Components: parent before child.** Within one region, a parent component's destructor is
  scheduled before those of components rendered in its layout (both are siblings in the
  region, parent first); components inside a nested region of the layout are also scheduled
  after the parent. Siblings are destroyed in document order. Pinned for classic components:
  `willDestroyElement`/`willClearRender` (eager), then `didDestroyElement`, then `willDestroy`,
  each phase running top → middle → bottom
  (`packages/@ember/-internals/glimmer/tests/integration/components/classic/life-cycle-test.js:305-537`,
  `538-858`). The eager phase interleaves the two hooks per component, `top.willDestroyElement,
  top.willClearRender, middle.willDestroyElement, …`, then all `didDestroyElement`, then all
  `willDestroy` (`life-cycle-test.js:510-531`). In non-interactive mode only `willDestroy` runs,
  in the same order. Public-manager components show the same parent-first order (verified by
  experiment, T9b): removing `p` (layout: `c1`, `c2`) gave `p.destroyComponent, c1.destroyComponent,
  c2.destroyComponent`, and a tree `top{d0, e0{d1}, d2}` gave `d0, e0, d1, d2` (each component before
  the components of its own layout, document order otherwise), all in the `actions` queue. The same parent-first order holds for a component and the component inside
  its layout in each removed `each` item, item by item in list order (`classic/life-cycle-test.js:1161-1222`).
- **Modifiers: child before parent.** A modifier is registered when its element closes, so a
  nested element's modifier precedes its ancestor's; siblings in document order; several
  modifiers on one element in source order. `<div {{foo}}><div {{bar}}></div><div {{baz}}></div></div>`
  installs **and** destroys in the order `bar, baz, foo`
  (`packages/@glimmer-workspace/integration-tests/test/modifiers-test.ts:305-458`; the tests
  remove the enclosing block and observe `willDestroyElement` after `rerender`, so they pin the
  order but not the queue or the timing relative to DOM removal). These tests run in the Glimmer
  harness, where the debug render tree is disabled. This order is **required in every build**,
  including development builds with the debug render tree on (author ruling, 2026-09-30), and
  Ember's own tests now pin it both ways (`packages/@ember/-internals/glimmer/tests/integration/custom-modifier-manager-test.js`,
  "Custom modifier manager: destruction order" and "… without the debug render tree": for
  `<div {{m "outer"}}><span {{m "inner"}}></span><Child /></div>`, where `Child` has its own
  modifier, the order is `inner, child, outer`). Before emberjs/ember.js#21639 a development build
  destroyed modifiers in the order they were *created*, interleaved with components, because of
  an extra association in `addModifier` (found by experiment, T9b).
- Replacement content is rendered (and its synchronous hooks run) before the old content's
  deferred destructors run (`classic/life-cycle-test.js:1044-1250`: after resetting an `each` to empty,
  the `else` content's components run `init … didInsertElement` before the removed items'
  `didDestroyElement`/`willDestroy`, whereas the removed items' eager `willDestroyElement` /
  `willClearRender` run *before* the `else` content's `init`).

Destroying the render result (e.g. Ember tearing down an application or a `renderComponent`
root) destroys everything and removes the root's DOM
(`packages/@glimmer/runtime/lib/vm/render-result.ts:19-27`; a dynamic modifier is destroyed with
it, `packages/@glimmer-workspace/integration-tests/test/modifiers/dynamic-modifiers-test.ts:229-254`;
components inside `in-element`, `packages/@glimmer-workspace/integration-tests/lib/suites/in-element.ts:517-560`).
The destroy semantics themselves (children first, eager synchronous, deferred scheduled,
`isDestroying` before `isDestroyed`) are pinned by
`packages/@glimmer/destroyable/test/destroyables-test.ts:126-143`, `158-192`, `336-366`.
A helper-created destroyable is destroyed with its region (`updating-test.ts:444-480`).

[Dev] Associating a child with, or registering a destructor on, an object that is already
destroying throws (`destroyable/index.ts:138-174`).

---

## 12. Errors at runtime

- There is **no error recovery** in templates: an exception thrown by user code during render
  (a getter, a helper, a manager hook, a modifier's `install`) propagates out of the render or
  re-render call. There are no error boundaries.
- On an exception during initial render, the output built so far stays in the DOM in whatever
  state it reached; the implementation closes its internal bookkeeping (open blocks) so the
  environment is usable, and [Dev] logs the tracking stack (`packages/@glimmer/runtime/lib/vm/append.ts:741-769`,
  `packages/@glimmer/runtime/lib/vm/update.ts:48-70`). The render transaction is committed
  (`environment.ts:218-229` uses `try/finally`), so queued `didCreate`/`install` for work done
  before the error still run.
- [Dev] In Ember, after an error during a root's render or re-render, that root never renders
  again; subsequent attempts log `Attempted to rerender, but the Ember application has had an
  unrecoverable error occur during render. You should reload the application after fixing the
  cause of the error.` In production, rendering is attempted again on the next revalidation
  (`packages/@ember/-internals/glimmer/lib/base-renderer.ts:71-93`; tests:
  `packages/@ember/-internals/glimmer/tests/integration/components/error-handling-test.js:14-57`).
  Errors thrown from `didInsertElement` or `destroy` leave the renderer usable
  (`classic/error-handling-test.js:10-80`).
- [Dev] Runtime errors with messages pinned by tests are quoted in the relevant sections
  (§05-3.5, §05-7.2, §05-8.2, §05-9.2, §05-10.2, §05-5.4.2, §05-5.7). Additional development-time
  assertions from the manager layer (chapter 06) include
  `Attempted to load a component, but there wasn't a component manager associated with the definition. The definition was: …`,
  `Attempted to load a helper, but there wasn't a helper manager associated with the definition. …`,
  `Attempted to load a modifier, but there wasn't a modifier manager associated with the definition. …`
  (`packages/@glimmer-workspace/integration-tests/test/strict-mode-test.ts:563-591`).

---

## 13. Server-side rendering and rehydration

Three **tree builders** exist; all perform the same evaluation (sections 1–12) but differ in how
DOM is produced:

| Mode | Used for | Source |
|---|---|---|
| client | ordinary browser rendering | `packages/@glimmer/runtime/lib/vm/element-builder.ts` |
| serialize | SSR (FastBoot); output is later serialized to HTML | `packages/@glimmer/node/lib/serialize-builder.ts` |
| rehydrate | first client render over server-produced DOM | `packages/@glimmer/runtime/lib/vm/rehydrate-builder.ts` |

SSR environments are **non-interactive**: modifiers are not created or installed (§05-4.1) and
update passes are not supported (`environment.ts:134-139` — "…You may be attempting to rerender
in an environment which does not support rerendering, such as SSR."). In SSR, trusted HTML is
inserted as a raw HTML section rather than parsed (`packages/@glimmer/node/lib/node-dom-helper.ts:21-30`),
elements are created without namespaces, and every attribute is set with `setAttribute`
without namespace (`node-dom-helper.ts:32-40`).

**What is normative** (author ruling, 2026-10-07, §09-9.8 Q1). A server render is always
rehydrated by the same implementation, so the serialized markup is implementation-defined and
need not interoperate. §13.1 and the marker-walking steps of §13.2 document the current
implementation and are informative. A conforming implementation MUST guarantee the observable
results instead:

1. Rehydrating the serialized output gives DOM equal to a client render of the same template
   and state, and leaves none of the nodes that serialization added behind.
2. Server nodes that match the client render are kept (node identity); text and attribute
   values are corrected in place; the remaining results listed at the end of §13.2 hold.
3. Content of the container outside the rendered root is left alone, including for partial
   rehydration through `renderComponent`.

### 13.1 Serialization markers *(informative)*

The serialize builder produces exactly the client DOM, plus comment markers
(`serialize-builder.ts:33-143`). Let *d* be a counter of currently open regions (starting at 0):

| Construct | Emitted |
|---|---|
| Opening any region (§05-1.3: component output region, each replaceable region, list, list item, remote region, and the root) | `<!--%+b:d%-->` then d := d+1 |
| Closing that region | d := d−1 then `<!--%-b:d%-->` |
| Dynamic text whose value is `""` | `<!--% %-->` *instead of* an empty text node |
| A text node (static or dynamic) whose preceding sibling at the cursor is a text node | `<!--%|%-->` separator before it |
| Trusted HTML (`{{{…}}}`, SafeString) | `<!--%glmr%-->` + HTML + `<!--%glmr%-->`; if the HTML is `""`, `<!--%glmr%--><!--% %--><!--%glmr%-->` |
| Trusted HTML whose parent is `<table>` and which starts with `<tr` | wrapped in `<tbody>…</tbody>` inside the markers |
| `<tr>` opened directly inside an element other than `TBODY`/`THEAD`/`TFOOT` | a `<tbody>` element is inserted and closed together with the `<tr>`'s parent |
| `{{#in-element dest}}` | a `<script glmr="%cursor:N%"></script>` inserted into `dest` before the remote content (N is a per-template compile-time counter) |

Inside `<title>`, `<script>` and `<style>` (where comments would become text), no block
markers, separators, or empty-text markers are emitted, and trusted HTML is inserted without
markers.

Examples pinned by tests (`packages/@glimmer-workspace/integration-tests/test/initial-render-test.ts`;
the whole root render is region 0):

| Template / values | Serialized HTML |
|---|---|
| `{{this.a}}` = `"hello"` | `<!--%+b:0%--><!--%+b:1%-->hello<!--%-b:1%--><!--%-b:0%-->` (:164-173) |
| `{{this.a}} world` with `a = ""` | `…<!--%+b:1%--><!--% %--><!--%-b:1%--> world…` (:177-189) |
| `hello{{! comment }} world` | `hello<!--%|%--> world` (:266-287) |
| `<div>{{#if false}}…{{/if}}<after-a/></div>` | `<div><!--%+b:1%--><!----><!--%-b:1%--><after-a></after-a></div>` (:220-251) |
| `<table><tr><td>standards</td></tr></table>` | `<table><tbody><tr><td>standards</td></tr></tbody></table>` (:131-139) |
| `Hello {{yield}}` with a static yielded block | `Hello <!--%|%-->Filewatcher` — `yield` opens no region (:1136-1156) |
| `<div>{{{this.html}}}</div>` | `<div><!--%+b:1%--><!--%glmr%--><strong>hello</strong><!--%glmr%--><!--%-b:1%--></div>` (`lib/suites/custom-dom-helper.ts:57-74`) |
| `{{#in-element el}}<inner>Wat Wat</inner>{{/in-element}}` | in `el`: `<script glmr="%cursor:0%"></script><!--%+b:2%--><inner>Wat Wat</inner><!--%-b:2%-->` (:417-453) |

Content before the first marker in the container (e.g. `<noscript></noscript>`) is preserved
(:81-95). Browser HTML-parser fix-ups (e.g. a `<div>` inside `<p>`) move markers relative to the
elements; rehydration still converges (:1047-1066).

*Note:* In the serialize builder `in-element` without `insertBefore` does **not** clear the
destination (the default is `null`, `serialize-builder.ts:132-142`); see Open questions.

### 13.2 Rehydration algorithm

The algorithm below is informative (see §05-13 "What is normative"); the list of results at
the end of this section is normative.

Rehydration evaluates the template exactly as a client initial render would, but instead of
creating nodes it **adopts** matching existing nodes, walking a *candidate* pointer through the
server DOM (`rehydrate-builder.ts:43-509`). Rehydration requires the cursor to have no
`nextSibling` (`rehydrate-builder.ts:51`) and the container to contain an open-block comment
(`%+b:…%`); content before the first open-block comment is left alone (tests:
`packages/@glimmer-workspace/integration-tests/test/initial-render-test.ts:81-95`).

```
state per open element: candidate (next server node to match), openBlockDepth
blockDepth: number of regions currently open on the client

openRegion():                                   -- client opens region at depth b
   if candidate is `%+b:b%` (adjusted by the starting offset): remove it, advance
   else (except in TITLE/SCRIPT/STYLE): clearMismatch(candidate)
closeRegion():
   if candidate is `%-b:openBlockDepth%`: remove it, advance
   else clearMismatch(candidate); then, if the node after the insertion point is the
        matching close marker, remove it and resume rehydration after it
appendText(s):
   candidate is a text node: adopt it (set nodeValue = s if different), advance
   candidate is `%|%`: remove it, retry
   candidate is `% %` and s == "": remove it, retry (then a new empty text node is created)
   otherwise: clearMismatch, create normally
appendComment(s):  candidate is a comment: adopt (fix data), advance; else clearMismatch, create
openElement(tag):
   candidate is an element with the same tag (case-insensitive for HTML, exact for SVG): adopt;
       its existing attributes become "unmatched"
   candidate is a `<tbody>` not in the template: step into it transparently
   otherwise clearMismatch, create normally
setAttribute/setProperty(name, v) on an adopted element:
   if an unmatched attribute `name` exists: set its value if different, mark matched
   else set normally
flushElement: remove all still-unmatched attributes from an adopted element
closeElement: clearMismatch(candidate) for any leftover children; step out of injected tbody
trusted HTML: if candidate is `%glmr%`: adopt the nodes between the pair of markers,
   remove the markers (and a `% %` marker); else insert normally
append node (`{{node}}`): adopts the candidate as-is
in-element: find `script[glmr="<guid>"]` in dest; without insertBefore, remove dest's
   children before the marker; rehydrate after the marker (or render normally if absent)

clearMismatch(c): remove c and every following sibling up to (not including) the close marker
   of the current open region (or to the end of the element if no region is open in it),
   then disable rehydration in this container until that close marker is reached
```

Consequences (tests: `initial-render-test.ts:164-1598`,
`packages/@glimmer-workspace/integration-tests/test/chaos-rehydration-test.ts:77-326`):

- Server text differing from the client value is repaired in place (0 nodes removed); an
  element of the wrong tag is removed and re-created; extra trailing server nodes are removed;
  a missing close marker (chaos tests delete random nodes) still converges to the client HTML.
- Attributes: a missing attribute is added, an extra one removed, a changed value reset;
  attributes that already match are **not** mutated at all (asserted with a MutationObserver,
  :366-387).
- `in-element` without `insertBefore` removes the destination's pre-existing children;
  with `insertBefore=null` or an element they are kept (:417-635).
- Matching server output is reused node-for-node; text and attribute values are corrected to
  the client's values without replacing nodes; extra server attributes are removed; mismatched
  subtrees are discarded and re-created by the client
  (`initial-render-test.ts:164-389`).
- After rehydration all markers have been removed; the resulting DOM equals the client render.
- **Partial rehydration** (a component rendered with `renderComponent` into a container whose
  first marker has depth *k* > 0): the builder synthesizes an extra `%+b:k−1%`/`%-b:k−1%` pair
  around the server content and offsets all depths by *k−1*
  (`rehydrate-builder.ts:56-92`; `packages/@glimmer-workspace/integration-tests/test/partial-rehydration-test.ts`).

In Ember, the builder is chosen by the `_renderMode` boot option: the `service:-dom-builder`
registration yields `serializeBuilder` for `'serialize'`, `rehydrationBuilder` for
`'rehydrate'`, else `clientBuilder` (`packages/@ember/-internals/glimmer/lib/setup-registry.ts:16-32`;
test `packages/@ember/application/tests/visit_test.js:65-110`) (chapter 08); the first serialized node is recognized by `isSerializationFirstNode`
(`nodeValue === "%+b:0%"`, `rehydrate-builder.ts:23-27`).

---

## 14. Open questions / inconsistencies

1. **Namespaced attribute updates drop the namespace after removal.** Initial dynamic
   `xlink:href={{x}}` uses `setAttributeNS(XLINK, …)`, but updates call
   `setAttribute("xlink:href", …)` / `removeAttribute("xlink:href")` without a namespace
   (`packages/@glimmer/runtime/lib/vm/attributes/dynamic.ts:97-106`). Value changes keep the
   namespace (tested, `updating-svg-test.ts:108-134`), but `null` → value re-creates the
   attribute in the null namespace (confirmed by a failing test on the fix branch).
   Property-mode removal does use `removeAttributeNS`. *Fix proposed* on branch
   `fix/namespaced-attribute-updates`: updates of a namespaced attribute use
   `setAttributeNS`/`removeAttributeNS`.
2. **`false` in merged `class`.** A lone `class={{false}}` removes the attribute; when several
   `class` values are merged (splattributes/modifiers), `false` becomes the class `"false"`
   (`packages/@glimmer/runtime/lib/references/class-list.ts:9-12` uses `normalizeStringValue`).
   All-static merges are joined without filtering empty strings.
3. **Owner asymmetry for curried components.** `manager.create` receives the *invoking*
   scope's owner, while the component's layout scope uses the *curried* owner
   (`component.ts:429-437` vs `825-853`). Recorded as §06-12 Q3, which owns it.
4. **`NaN` keys** never match (`===`), so an item keyed by `NaN` is re-created every sync.
5. **Dynamic head with a primitive value and arguments** (`{{this.str 1}}`) silently renders
   nothing even in development, while an object without managers throws
   (`content.ts:52-69`). No test covers the error message.
6. **`{{this.fn}}` calls plain functions.** Any function in content position is treated as a
   helper (default helper manager, §06-1.6) and invoked with no arguments; a class without a
   component manager will throw a "Class constructor … cannot be invoked without 'new'"
   TypeError. The component check runs before the helper check, so a value with both
   managers renders as a component. Only the function case is tested, and only through
   helper-position tests; content-position precedence needs a test.
7. **`<svg>` inside `<foreignObject>`** is created in the HTML namespace, because the
   integration-point test runs before the `tag == "svg"` test (`operations.ts:53-79`). The same
   applies to `<math>`. *Fix proposed* on branch `fix/svg-inside-foreign-object`: an `<svg>` or
   `<math>` tag always starts its own namespace, as in the HTML parser.
8. **Serialize builder `in-element`** defaults `insertBefore` to `null`, so SSR never clears
   the destination, unlike the client and rehydration builders
   (`serialize-builder.ts:132-142`).
9. **Attribute updates re-set identical strings.** `SimpleDynamicAttribute.update` calls
   `setAttribute` whenever the computation is invalid, even if the string is unchanged; only
   property mode compares with the last value.
10. **`{{debugger}}` / `{{log}}`** timing differs: `debugger` runs only during (re-)rendering of
    its region; `log` runs whenever its reactive value is recomputed.
11. **Unbound `-get-dynamic-var`** reads throw an internal error rather than returning
    `undefined`.
12. **Modifier element state at `create`.** For elements with modifiers, attributes are deferred,
    so `createModifier` sees an element with *no* attributes and not yet in the document; any
    code relying on attributes must wait for `install`.
13. **`yield to="inverse"`/`to="else"` and extra block params are not tested under angle-bracket
    invocation.** `skip: 'glimmer'` (`lib/suites/yield.ts:25-62`, `86-99`) skips the test only
    for the Glimmer (angle-bracket) invocation kind; the module builder still runs it for curly
    and dynamic invocation (`lib/test-helpers/module.ts:143-160`). The implementation maps
    `inverse` to `else` regardless of invocation kind, and `helpers/yield-test.js:60-84` covers the
    Ember angle-bracket case, so the gap is small, but the reason for the skip is unrecorded.
14. **Triple curlies are ignored for literals and keyword appends** (§05-3.5 item 6).
    `{{{"<b>x</b>"}}}` compiles to a trusting append of a literal (`[2,"<b>x</b>"]`), but the
    literal fast path emits a text node, unlike `{{{this.x}}}` holding the same string.
    `{{{if c x}}}`, `{{{helper h}}}`, `{{{has-block}}}` and `{{{log}}}` lose the flag during
    keyword translation (`keywords/utils/call-to-append.ts:7-26`, `keywords/append.ts:127-145`).
    Both look like bugs. No test pins either behavior. *Fix proposed* on branch
    `fix/triple-curly-literals-and-keywords`: string literals and append keywords honour triple
    curlies.
15. **Duplicate attributes and duplicate named arguments** (§05-4.9, §05-7.3). The parser
    accepts both (§02-11 item 17). For attributes, the result depends on whether the element
    has `...attributes`/modifiers (last-wins without `class` merging vs. deferred last-wins
    with `class` merging). For named arguments, a component's layout sees the first
    occurrence while its manager (e.g. a Glimmer component's `this.args`) sees the last. All
    of this was derived from source; T12 confirmed it by experiment on `main` (development build):
    `<div title={{this.a}} title={{this.b}}>` shows `this.b` at first and `this.a` after only
    `this.a` changes, but stays `this.b` once a modifier is added; a helper's `named.a` is the
    last occurrence. *Proposal* on branch `proposal/duplicate-attributes-and-arguments-are-errors`
    (its commit message is the full explainer, for team discussion): every duplicate attribute,
    component argument or named argument is a compile-time syntax error.
16. **Claims with no test (T4).** These are derived from source only. The lifecycle and
    destruction orderings that used to be listed here (public-manager tree hook order,
    component hooks before modifier installs, `updateModifier` after `didUpdate`, modifier update
    pre-order, deferred destructors in `actions` after DOM removal, `destroyComponent` order,
    `updateModifier` vs `installModifier`, detached element at `destroyModifier`) were observed
    by experiment in T9b and are marked "(verified by experiment, T9b)" where they occur; one
    was corrected (modifier destruction order, §11.3). No upstream tests pin them.
    - `each`: `key="@key"` on plain `each`; the dev `invalid keypath` assertion; `key` read
      once (§5.4.2); occurrence numbering of duplicate keys; `NaN` keys (item 4); `Map` entries
      and other non-array objects in plain `each`; lazy consumption of native iterators;
      extra block params; DOM non-reuse across the empty/non-empty transition; insert-before-
      revalidate and delete ordering during sync. The retain/move step sequences are
      asserted only in `LOCAL_DEBUG` builds.
    - `in-element`: explicit `insertBefore=undefined`; a node-to-node `insertBefore` change;
      the remote region not counting toward enclosing bounds; the `guid` compile error; the
      `isProduction` omission of `-in-el-null` (see the test list in §05-5.7).
    - `yield`/blocks: the owner inside a yielded block; yielding one block several times;
      `has-block`/`has-block-params` constancy and the non-literal-argument compile error;
      `has-block-params` for a `<:else as |x|>` block.
    - Modifiers: timing of replacing a dynamic modifier definition; the attribute-less,
      undocumented element at `create` (item 12).
17. **Is the general dynamic scope part of the language?** §05-5.8 describes a string-keyed
    dynamic scope with arbitrary names, as the VM implements it, and the Glimmer suite tests
    it with arbitrary keys such as `myKeyword`
    (`packages/@glimmer-workspace/integration-tests/lib/suites/with-dynamic-vars.ts:4-84`). In
    Ember, `-with-dynamic-vars` and `-get-dynamic-var` assert for any key other than
    `outletState` (§08-9.6; `packages/@ember/-internals/glimmer/tests/integration/syntax/with-dynamic-var-test.js:6-33`),
    and no Ember template emits them. Those Glimmer tests run on the VM's default dynamic scope,
    not on Ember's (W2 kept it so; `.work/W2-glimmer-harness.md` finding 5). If the general
    dynamic scope is a VM capability that Ember does not expose, §05-5.8 is informative and the
    suite is an implementation test.
