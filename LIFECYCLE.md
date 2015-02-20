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

### The Scope Hooks

Scope management:

* `createFreshScope`: create a new, top-level scope. The default
  implementation of this hook creates a new scope with a `self` slot
  for the dynamic context and `locals`, a dictionary of local
  variables.
* `createChildScope`: create a new scope that inherits from the
  top-level scope. The child scope must reflect updates to `self`
  or `locals` on the parent scope automatically, so the default
  implementation of this hook uses `Object.create` on both the
  scope object and the locals.
* `bindSelf`: a `self` value has been provided for the scope
* `bindLocal`: a specific local variable has been provided for
  the scope (through block arguments).

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
  render: function(node, env, scope, params, hash) {
    // This function is invoked on the first render, and any time the
    // isStable function returns false.
  },

  isPaused: function(node, env, scope, params, hash) {
    // This function is invoked on renders after the first render; if
    // it returns true, the entire subtree is assumed valid, and dirty
    // checking does not continue. This is useful during animations,
    // and in some cases, as a performance optimization.
  },

  revalidate: function(node, env, scope, params, hash) {
    // This function is invoked on renders after the first render; it is
    // invoked before `isStable` so that it can update any internal
    // state based on external changes.
  },

  isStable: function(node, env, scope, params, hash) {
    // This function is invoked after the first render; it checks to see
    // whether the node is "stable". If the node is unstable, its
    // existing content will be removed and the `render` function is
    // called again to produce new values.
  },

  shouldPrune: function(node, env, scope, params, hash) {
    // If `isStable` returns false, this function can return true to
    // clear the render node entirely instead of calling `render`.
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
