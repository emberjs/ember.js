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

let source = `
  {{#let "hello" "world" as |hello world|}}
-    <p>{{hello}} {{world}}</p>
+    <p>{{hello}} {{world}}{{this}}</p>
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
+ let state = State('!');
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

+ state.update('?');
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

In Glimmer, embeddings can implement their own custom `Reference` objects, but they must use one of the `Tag` implementations provided by the Glimmer library.

Glimmer comes with the following tags:

- `constant`: the VM is allowed to assume that the value will never change
- `current`: a tag that represents the current revision on the timeline
- `dirtyable`: a tag that is explicitly dirtied
- `pair`: the combination of two tags, which is considered dirty whenever either of its inner tags is dirty
- `many`: the combination of N tags, which is considered dirty whenever any of its inner tags are dirty
- `proxy`: a tag that wraps a mutable inner tag; if the inner tag is dirty, the proxy is dirty; if the inner tag is swapped out, the proxy is dirty

Let's implement a simplified version of the `State` reference from the previous section:

```ts
class StateReference implements Reference {
  tag = DirtyableTag.create();

  constructor(inner) {
    this.inner = inner;
  }

  value() {
    return this.inner;
  }

  update(value) {
    this.inner = inner;
    this.tag.dirty();
  }
}
```

There's one more piece of the implementation of `Reference` that we didn't cover here, which is how to implement the `get` method to represent nested data structures. That will be covered in a later section, but intuitively, the `get` method returns a new reference, and the `tag` on that new reference needs to consider the possibility that the parent will be completely replaced.

That's all there is to say about Glimmer's references, a tiny interface that is rich enough to power all of the ways in which Glimmer interacts with external data.
