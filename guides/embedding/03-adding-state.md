We now have a fully self-contained Glimmer component executing, but things get interesting when we add state to the equation.

# Previously

As a reminder, here's the minimal environment we used in the previous chapter:

```ts
import { Context } from '@glimmer/opcode-builder';
import { Component } from '@glimmer/opcode-compiler';

let source = `{{#let "hello" "world" as |hello world|}}<p>{{hello}} {{world}}</p>{{/let}}`;

let context = Context();
let component = Component(source);
let handle = component.compile(context);

let program = artifacts(context);

import createHTMLDocument from '@simple-dom/document';
import { Runtime, renderAot } from '@glimmer/runtime';

let document = createHTMLDocument();
let runtime = Runtime(document, payload);
let main = document.createElement('main');
let cursor = { element: main, nextSibling: null };
let iterator = renderAot(runtime, handle, cursor);
let result = iterator.sync();

console.log(serialize(element)); // <main><p>hello world</p></main>

function serialize(element: SimpleElement): string {
  return new Serializer(voidMap).serialize(element);
}
```

# Adding State

To create state, we need a place to put it.

The simplest way to do that is the `State` function. The `State` function takes an initial value and can be updated.

To use our new state, we pass it as the final parameter to `renderAot`. When passed to `renderAot` in this way, it's available in the component as `this`.

```diff
import { Context } from '@glimmer/opcode-builder';
import { Component } from '@glimmer/opcode-compiler';
+ import { State } from '@glimmer/references';

let source = `
  {{#let "hello" "world" as |hello world|}}
-    <p>{{hello}} {{world}}</p>
+    <p>{{hello}} {{world}}{{this.prefix}}</p>
  {{/let}}
`;

let context = Context();
let component = Component(source);
let handle = component.compile(context);

let program = artifacts(context);

import createHTMLDocument from '@simple-dom/document';
import { Runtime, renderAot } from '@glimmer/runtime';

let document = createHTMLDocument();
let runtime = Runtime(document, payload);
let main = document.createElement('main');
+ let state = State({ prefix: '!' });
let cursor = { element: main, nextSibling: null };
- let iterator = renderAot(runtime, handle, cursor);
+ let iterator = renderAot(runtime, handle, cursor, state);
let result = iterator.sync();

- console.log(serialize(element)); // <main><p>hello world</p></main>
+ console.log(serialize(element)); // <main><p>hello world!</p></main>

function serialize(element: SimpleElement): string {
  return new Serializer(voidMap).serialize(element);
}
```

To update the state, we use the `update()` method on it and then call `rerender()` on the result we got from rendering the first time.

```diff
@@ -90,20 +90,12 @@
let iterator = renderAot(runtime, handle, cursor, state);
let result = iterator.sync();

console.log(serialize(element)); // <main><p>hello world!</p></main>

+ state.update({ prefix: '?' });
+ result.rerender();
+
+ console.log(serialize(element)); // <main><p>hello world?</p></main>

function serialize(element: SimpleElement): string {
  return new Serializer(voidMap).serialize(element);
}
```

# References

Now that we've seen some mutable state in action, it's time to learn how Glimmer interacts with external data.

Glimmer's core primitive interface for working with external data is called `Reference`, and the easiest way to understand it is to look at the interface definition:

```ts
export interface Reference<T> {
  value(): T;
  get(key: string): Reference<T>;
  tag: Tag;
}

export interface Tag {
  value(): number;
  validate(snapshot: number): boolean;
}
```

The `Reference`'s `value` method returns the current value that the `Reference` represents.

The `Reference's` `get` method returns a new refrence that represents a child property in the underlying data.

A `Tag` is used as a validator for the underlying data held by the reference. The tag's `value` method returns the current revision of the underlying data. The tag's `validate` method takes a revision that it previously returned from `value`, and returns `true` if the underlying data held by the reference is still up-to-date.

The `State` function from the previous section has an implementation of this interface, but it's only one implementation. APIs described throughout the embedding guide will use References, and a later section will show how to implement a Reference for custom data structures like immutable.js.
