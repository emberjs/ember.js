An HTMLBars runtime environment implements a series of hooks (and
keywords) that are responsible for guaranteeing the most important
property of an HTMLBars template: idempotence.

This means that a template that is re-rendered with the same dynamic
environment will result in the same DOM nodes (with the same identity)
as the first render.

HTMLBars comes with support for idempotent helpers. This means that a
helper implemented using the HTMLBars API is guaranteed to fulfill the
idempotence requirement. That is because an HTMLBars template is a "pure
function"; it takes in data parameters and returns data values.

> Block helpers also have access to `this.yield()`, which allows them to
> render the block passed to the block helper, but they do not have
> access to the block itself, nor the ability to directly insert the
> block into the DOM. As long as `this.yield()` is invoked in two
> successive renders, HTMLBars guarantees that the second call
> effectively becomes a no-op and does not tear down the template.

HTMLBars environments are expected to implement an idempotent component
implementation. What this means is that they are responsible for
exposing a public API that ensures that users can write components with
stable elements even when their attributes change. Ember.js has an
implementation, but it's fairly involved.

## Hooks

An HTMLBars environment exposes a series of hooks that a runtime
environment can use to define the behavior of templates. These hooks
are defined on the `env` passed into an HTMLBars `render` function,
and are invoked by HTMLBars as the template's dynamic portions are
reached.

### The Scope

Scope management in HTMLBars is the heart of the system: by implementing
a coherent notion of "scope", many domain-specific constructs will
behave as expected.

While the implementation of these hooks can be involved, they result in
a single scope object that can be passed around and shared freely, and
they make it possible for `yield` to be implemented in HTMLBars, rather
than in the host environment.

#### The "Reference" Type

The scope object manages a `self`, which represents the dynamic context
that the template was invoked with and a series of `locals`, which
represent a statically known list of local variables provided by block
arguments:

```hbs
{{!-- this template is rendered with a `self` --}}

{{#each list as |item|}}
  {{!-- `item` is a local variable, available in this scope and child
        scopes, but not in the parent scope --}}

  {{#if item}}
    {{!-- `item` is still visible here in this child scope --}}
  {{/if}}
{{/each}}
```

HTMLBars evaluates path expressions (`item.name`) by asking the host
environment to look up the path in the current scope and to return a
*reference*.

A "reference" must be *evaluated* in order to retrieve its current
JavaScript value. In Ember, references are identical (`===`) across
renders, and are evaluated when Ember needs to invoke user code such as
helpers.

The references used in Ember are similar to [frp-property][Properties]
in functional reactive programming, but only notify downstream consumers
that a new value is available, and do not push new values until they are
requested. This facilitates reflection of changes onto the DOM
asynchronously, without incurring any costs for intermediate values that
are never used.

[frp-property]: https://github.com/baconjs/bacon.js/#property

HTMLBars itself is agnostic to the precise reference type used: you can
even just use a regular JavaScript value, but a number of the hooks in
HTMLBars are designed to make a system with a stable reference type,
like Ember, work correctly.

#### Example: Rendering and Re-Rendering

A simple example may help explain the high-level concepts. This example
will assume a reference type like Ember's.

```hbs
<h1>{{title}}</h1>

{{#if author}}
  <h2>by {{author.name}}</h2>
{{/if}}

<ul>
{{#each comments key="id" as |comment|}}
  <li>{{comment.body}}</li>
{{/each}}
</ul>
```

First, this template is invoked with a `self`:

```json
{
  "title": "Rails is omakase",
  "author": { "name": "@dhh" },
  "comments": [{
    "id": "1",
    "body": "very tasty"
  }]
}
```

The first thing that happens is that the HTMLBars runtime asks the host
to create a fresh scope using `hooks.createFreshScope`, which returns an
object with slots for `self` and `locals`.

Next, the runtime invokes the `bindSelf()` hook with the supplied JSON.
The host wraps the JSON in a reference and installs it into
`scope.self`.

At this point, the scope looks something like:

```js
{
  self: Reference(passedSelf),
  locals: {}
}
```

Next, the runtime encounters the first dynamic area, `{{title}}`. It
asks the host environment for a reference for the `title` expression by
invoking `hooks.getRoot(scope, 'title')`. It then "links" that reference
with the render node that manages the `{{title}}`. You will see how this
linkage is used in the description of re-render. It resolves the
reference by invoking `hooks.getValue(reference)` and inserts the value
into the DOM.

Next, the runtime encounters the dynamic block `{{#if author}}`.

```hbs
{{#if author}}
  <h2>by {{author.name}}</h2>
{{/if}}
```

It asks the host environment for a reference for `author`, as before,
linking the reference with the render node. It then resolves the
reference and invokes the `#if` helper:

```js
// A simple, example if helper
function ifHelper(params) {
  if (params[0]) {
    this.yield();
  }
}
```

If the value of `author` is truthy, the helper invokes `this.yield`.
Since this is the first time this template is rendered, that tells the
HTMLBars runtime to render the template. The runtime remembers that the
block was invoked, which will be used later when we re-render.

The call to `this.yield` invokes the template inside of the conditional:

```hbs
<h2>by {{author.name}}</h2>
```

Because `this.yield()` was invoked without block arguments and without a
new `self`, the parent scope is reused. You will see later what happens
if a child scope is needed.

The HTMLBars runtime encounters `{{author.name}}`, and it asks the host
to provide a reference for that expression by calling
`hooks.getChild(hooks.getRoot(scope, 'author'), 'name')`, and that
reference is linked to the render node managing the dynamic area. The
runtime calls `hooks.getValue(reference)` to resolve the reference and
updates the DOM.

Next, the runtime encounters the `#each` block.

```hbs
{{#each comments key="id" as |comment|}}
  <li>{{comment.body}}</li>
{{/each}}
```

It asks the host environment for a reference for `comments` and links
the reference to the render node. It then resolves the reference and
invokes the `#each` helper:

```js
// A simple, example each helper
function eachHelper([ list ], { key }) {
  for (item of list) {
    this.yieldItem(item[key], [ item ]);
  }
}
```

The helper invokes `yieldItem` once for each item in the list. The
`yieldItem` function takes a unique key and an array of block arguments.
In this case, the `[ item ]` parameter will become the `|comment|` block
argument.

Since this is the first time this template is rendered, the HTMLBars
runtime will render the child template once for each call to
`yieldItem`, and remember that it rendered a template for the supplied
key.

**Because block arguments are used in this template, the runtime creates
a child scope by calling `hooks.createChildScope(parent)` for each
instance of the yielded template**. This child scope shadows the `self`
in the parent scope and any locals in the parent scope.

A child scope looks something like this:

```js
var scope = Object.create(parentScope);
scope.locals = Object.create(parentScope.locals);
```

```hbs
{{#each comments key="id" as |comment|}}
  <li>{{comment.body}}</li>
{{/each}}
```

The child template will be rendered once per call to `yieldItem` with
the child scope as its scope. Before entering the child template, the
runtime invokes `hooks.bindLocal(env, scope, 'comment', item)`.

Once it has done that, the scope will look like:

```js
{
  locals: {
    comment: Reference(item),
    __proto__: <parent-locals>
  },

  __proto__: {
    self: Reference(passedSelf),
    locals: {}
  }
}
```

The runtime will next encounter `comment.body`, and, as before, ask the
host to provide a reference for the expression.

First, it will invoke `hooks.getRoot(scope, 'comment')`. **This part is
different.** Because there is a local variable named `comment` in the
scope, the host will return the reference that represents the passed in
item. Next, it will invoke `hooks.getChild(reference, 'body')`, and link
the reference to the render node.

It then resolves the reference and updates `{{comment.body}}`.

Once those steps are complete, the initial render has finished.

Next, let's look at the process of re-rendering. Once again, here's the
template:

```hbs
<h1>{{title}}</h1>

{{#if author}}
  <h2>by {{author.name}}</h2>
{{/if}}

<ul>
{{#each comments key="id" as |comment|}}
  <li>{{comment.body}}</li>
{{/each}}
</ul>
```

And the new `self`:

```js
{
  "title": "Rails is omakase",
  // author is removed
  "comments": [{
    "id": "1",
    "body": "very tasty"
  }, { // a new comment
    "id": "2",
    "body": "second"
  }]
}
```

First of all, on the second render, the runtime uses the original scope
that was created for the first render. Because there's a new `self`, it
invokes `updateSelf` on the scope with the new `self`. On the first
render, `title`, `author` and `comments` were derived from the self, so
their references (which are still linked to their original render nodes)
are **invalidated**.

This is a crucial thing to understand about references: all references
are stable, but any *derived references* become invalid when
`updateSelf` or `updateLocal` is called.

Next, the runtime encounters the `{{title}}` node. It uses the reference
that it linked in the first render, and calls `hooks.getValue` to
resolve the reference. Because the reference was invalidated by
`bindSelf`, it re-computes the title. Before updating the DOM, the
runtime compares the resolved string value with the last value it
inserted, sees that they are the same, and doesn't bother updating the
DOM.

Next, the runtime encounters the `#if`:

```hbs
{{#if author}}
  <h2>by {{author.name}}</h2>
{{/if}}
```

As before, the original reference for the `author` is linked from the
first render, so the runtime resolves the reference. It's an invalidated
reference, so the value is re-computed, and the `#if` helper is invoked
with the resolved value:

```js
// A simple, example if helper
function ifHelper(params) {
  if (params[0]) {
    this.yield();
  }
}
```

This time, `params[0]` is falsy, so `this.yield()` is never invoked. The
runtime sees that the block was invoked last time, but not this time,
so it prunes the child from the DOM and does not continue processing the
child template.

Next, the runtime encounters the `{{#each}}`:

```hbs
{{#each comments key="id" as |comment|}}
  <li>{{comment.body}}</li>
{{/each}}
```

It resolves the (invalidated) `comments` reference, and invokes the
helper with the resolved value:

```js
// A simple, example each helper
function eachHelper([ list ], { key }) {
  for (item of list) {
    this.yieldItem(item[key], [ item ]);
  }
}
```

The first thing that happens is that `yieldItem` is invoked with the key
of `"1"`, which the runtime sees was rendered the previous time. Since
it was rendered in the same position, the runtime recurses into the
child template using the scope from the first-render. First, it invokes
`updateLocal` with the `item` (which happens to be identical), which
invalidates the linked `comment.body` reference.

Next, it encounters `comment.body` and resolves its linked reference. In
this case, the result is the same as last time (`"so tasty"`), so the
DOM is not updated. However, if the key remained the same but the
comment body had changed, the process of invalidation would ensure that
the DOM was properly updating.

Next, `yieldItem` is invoked for a new key (`"2"`), and the runtime
performs the same steps as the first time: creating a new child scope,
binding its local, and recursing into the child template.

The `yieldItem` function is also smart enough to identify cases where
the same key is yielded in a different order, or when a key that was
yielded before was not yielded again. In those cases, it reorders or
prunes the render nodes, which reorders or prunes the associated DOM.

Just a few primitives are enough to describe almost all of the possible
features of HTMLBars:

* the `scope`, which holds references that are consulted when the
  runtime resolves paths into references.
* `references`, which are stable and can be resolved into JavaScript
  values.
* `derived references`, which are also stable and which become
  invalidated when their parent reference is invalidated through
  `updateSelf` or `updateLocal`.
* `render node`s, which represent the render ing of the dynamic part of
  a template.
* `link`ing a render node to a reference, which (when combined with
  invalidation) makes the work of resolving a reference and updating the
  DOM idempotent: it works the same for initial render and updating.

In addition, just two user-exposed actions are enough to describe all of
the major kinds of branching constructs:

* `yield`, which tells the runtime to fill in a render node with the
  provided template, or not render a template. If the yielded template
  is the same, the runtime simply recurses. Otherwise, it renders from
  scratch or prunes as needed.
* `yieldItem`, which provides the runtime with a list of render actions.
  As with `yield`, the runtime can use this information to render from
  scratch, reorder, prune, or simply recurse.

**All of these primitives are designed with idempotence in mind.** For
example, the "resolve reference and update render node" operation can
use a cached value if the reference is not invalidated, and avoids
updating the DOM if the string value has not changed. The `yield`
operation doesn't build a tree to insert into the DOM; it is a high
level action that has different side effects depending on the previous
state, but only the action is exposed to user code.

In other words, user-defined helpers, whether they represent simple
values, branching constructs or iteration are defined as pure,
side-effect-free functions, and the runtime is responsible for
reflecting their results onto a stateful DOM.

### The Scope Hooks

* `createFreshScope`: create a new, top-level scope. The default
  implementation of this hook creates a new scope with a `self` slot
  for the dynamic context and `locals`, a dictionary of local
  variables.
* `createShadowScope`: create a new scope for a template that is
  being rendered in the middle of the render tree with a new,
  top-level scope (a "shadow root").
* `createChildScope`: create a new scope that inherits from the parent
  scope. The child scope must reflect updates to `self` or `locals` on
  the parent scope automatically, so the default implementation of this
  hook uses `Object.create` on both the scope object and the locals.
* `bindBlock`: binds the block passed to a block helper into the lexical
  environment so that it can be invoked via `{{yield}}`.
* `bindScope`: gives the host environment an opportunity to setup a
  scope for the first time, whether the scope was created as a fresh
  scope, a child scope, or a shadow scope.
* `updateScope`: called on subsequent renders, and gives the host
  environment an opportunity to update parts of the scope that may
  have changed between renders.
* `bindSelf`: a `self` value has been provided for the scope in its
  first render.
* `updateSelf`: a new `self` value has been provided for the scope
  in its subsequent render.
* `bindLocal`: a local variable has been provided for the scope (through
  block arguments) for its first render.
* `updateLocal`: a local variable has been updated for the scope
  (through block arguments) for its subsequent render.

Scope lookup:

* `getRoot`: get the reference for the first identifier in a path. By
  default, this first looks in `locals`, and then looks in `self`.
* `getChild`: gets the reference for subsequent identifiers in a path.
* `getValue`: get the JavaScript value from the reference provided
  by the final call to `getChild`. Ember.js uses this series of
  hooks to create stable streams for each reference that remain
  stable across renders.

> All hooks other than `getValue` operate in terms of "references",
> which are internal values that can be evaluated in order to get a
> value that is suitable for use in user hooks. The default
> implementation simply uses JavaScript values, making the
> "references" simple pass-throughs. Ember.js uses stable "stream"
> objects for references, and evaluates them on an as-needed basis.

### The Helper Hooks

* `hasHelper`: does a helper exist for this name?
* `lookupHelper`: provide a helper function for a given name

### The Expression Hooks

* `concat`: takes an array of references and returns a reference
  representing the result of concatenating them.
* `subexpr`: takes a helper name, a list of positional parameters
  and a hash of named parameters (as references), and returns a
  reference that, when evaluated, produces the result of invoking the
  helper with those *evaluated* positional and named parameters.

User helpers simply take positional and named parameters and return the
result of doing some computation. They are intended to be "pure"
functions, and are not provided with any other environment information,
nor the DOM being built. As a result, they satisfy the idempotence
requirement.

Simple example:

```hbs
<p>{{upcase (format-person person)}}</p>
```

```js
helpers.upcase = function(params) {
  return params[0].toUpperCase();
};

helpers['format-person'] = function(params) {
  return person.salutation + '. ' + person.first + ' ' + person.last;
};
```

The first time this template is rendered, the `subexpr` hook is invoked
once for the `format-person` helper, and its result is provided to the
`upcase` helper. The result of the `upcase` helper is then inserted into
the DOM.

The second time the template is rendered, the same hooks are called.
HTMLBars compares the result value with the last value inserted into the
DOM, and if they are the same, does nothing.

Because HTMLBars is responsible for updating the DOM, and simply
delegates to "pure helpers" to calculate the values to insert, it can
guarantee idempotence.

## Keywords

HTMLBars allows a host environment to define *keywords*, which receive
the full set of environment information (such as the current scope and a
reference to the runtime) as well as all parameters as unevaluated
references.

Keywords can be used to implement low-level behaviors that control the
DOM being built, but with great power comes with great responsibility.
Since a keyword has the ability to influence the ambient environment and
the DOM, it must maintain the idempotence invariant.

To repeat, the idempotence requirement says that if a given template is
executed multiple times with the same dynamic environment, it produces
the same DOM. This means the exact same DOM nodes, with the same
internal state.

This is also true for all child templates. Consider this template:

```hbs
<h1>{{title}}</h1>

{{#if subtitle}}
  <h2>{{subtitle}}</h2>
{{/if}}

<div>{{{body}}}</div>
```

If this template is rendered first with a `self` that has a title,
subtitle and body, and then rendered again with the same title and body
but no subtitle, the second render will produce the same `<h1>` and same
`<div>`, even though a part of the environment changes.

The general goal is that for a given keyword, if all of the inputs to
the keyword have stayed the same, the produced DOM will stay the same.

## Lifecycle Example

To implement an idempotent keyword, you need to understand the basic
lifecycle of a render node.

Consider this template:

```js
{{#if subtitle}}
  <h2>{{subtitle}}</h2>
{{/if}}
```

The first time this template is rendered, the `{{#if}}` block receives a
fresh, empty render node.

It evaluates `subtitle`, and if the value is truthy, yields to the
block. HTMLBars creates the static parts of the template (the `<h2>`)
and inserts them into the DOM).

When it descends into the block, it creates a fresh, empty render node
and evaluates `subtitle`. It then sets the value of the render node to
the evaluated value.

The second time the template is rendered, the `{{#if}}` block receives
the same render node again.

It evaluates `subtitle`, and if the value is truthy, yields to the
block. HTMLBars sees that the same block as last time was yielded, and
**does not** replace the static portions of the block.

(If the value is falsy, it does not yield to the block. HTMLBars sees
that the block was not yielded to, and prunes the DOM produced last
time, and does not descend.)

It descends into the previous block, and repeats the process. It fetches
the previous render node, instead of creating a fresh one, and evaluates
`subtitle`.

If the value of `subtitle` is the same as the last value of `subtitle`,
nothing happens. If the value of `subtitle` has changed, the render node
is updated with the new value.

This example shows how HTMLBars itself guarantees idempotence. The
easiest way for a keyword to satisfy these requirements are to implement
a series of functions, as the next section will describe.

## Lifecycle More Precisely

```js
export default {
  willRender: function(node, env) {
    // This function is always invoked before any other hooks,
    // giving the keyword an opportunity to coordinate with
    // the external environment regardless of whether this is
    // the first or subsequent render, and regardless of
    // stability.
  },

  setupState: function(state, env, scope, params, hash) {
    // This function is invoked before `isStable` so that it can update any
    // internal state based on external changes.
  },

  isEmpty: function(state, env, scope, params, hash) {
    // If `isStable` returns false, or this is the first render,
    // this function can return true to indicate that the morph
    // should be empty (and `render` should not be called).
  }

  isPaused: function(state, env, scope, params, hash) {
    // This function is invoked on renders after the first render; if
    // it returns true, the entire subtree is assumed valid, and dirty
    // checking does not continue. This is useful during animations,
    // and in some cases, as a performance optimization.
  },

  isStable: function(state, env, scope, params, hash) {
    // This function is invoked after the first render; it checks to see
    // whether the node is "stable". If the node is unstable, its
    // existing content will be removed and the `render` function is
    // called again to produce new values.
  },

  rerender: function(morph, env, scope, params, hash, template, inverse
visitor) {
    // This function is invoked if the `isStable` check returns true.
    // Occasionally, you may have a bit of work to do when a node is
    // stable even though you aren't tearing it down.
  },

  render: function(node, env, scope, params, hash, template, inverse, visitor) {
    // This function is invoked on the first render, and any time the
    // isStable function returns false.
  }
}
```

For any given render, a keyword can end up in one of these states:

* **initial**: this is the first render for a given render node
* **stable**: the DOM subtree represented by the render node do not
  need to change; continue revalidating child nodes
* **unstable**: the DOM subtree represented by the render node is no
  longer valid; do a new initial render and replace the subtree
* **prune**: remove the DOM subtree represented by the render node
* **paused**: do not make any changes to this node or the DOM subtree

It is the keyword's responsibility to ensure that a node whose direct
inputs have not changed remains **stable**. This does not mean that no
descendant node will not be replaced, but only the precise nodes that
have changed will be updated.

Note that these details should generally **not** be exposed to the user
code that interacts with the keyword. Instead, the user code should
generally take in inputs and produce outputs, and the keyword should use
those outputs to determine whether the associated render node is stable
or not.

Ember `{{outlet}}`s are a good example of this. The internal
implementation of `{{outlet}}` is careful to avoid replacing any nodes
if the current route has not changed, but the user thinks in terms of
transitioning to a new route and rendering anew.

If the transition was to the same page (with a different model, say),
the `{{outlet}}` keyword will make sure to consider the render node
stable.

From the user's perspective, the transition always results in a complete
re-render, but the keyword is responsible for maintaining the
idempotence invariant when appropriate.

This also means that it's possible to precisely describe what
idempotence guarantees exist. HTMLBars defines the guarantees for
built-in constructs (including invoked user helpers), and each keyword
defines the guarantees for the keyword. Since those are the only
constructs that can directly manipulate the lexical environment or the
DOM, that's all you need to know!
