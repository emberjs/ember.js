# Previously

```ts
import { Context } from '@glimmer/opcode-builder';
import { Component } from '@glimmer/opcode-compiler';
import { State } from '@glimmer/references';

let source = `
  {{#let "hello" "world" as |hello world|}}
    <p>{{hello}} {{world}}{{this.prefix}}</p>
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
let state = State({ prefix: '!' });
let cursor = { element: main, nextSibling: null };
let iterator = renderAot(runtime, handle, cursor, state);
let result = iterator.sync();

console.log(serialize(element));
// <main><p>hello world!</p></main>

state.update({ prefix: '?' });
result.rerender();
console.log(serialize(element));
// <main><p>hello world?</p></main>

function serialize(element: SimpleElement): string {
  return new Serializer(voidMap).serialize(element);
}
```

# Computation

We now have a component executing with some external, mutable state. But what if we want to introduce external computation into the mix?

In Glimmer, that's the job of "helpers". Helpers are functions that take arguments as references and return a single reference.

Let's make a global helper `increment` that takes a single number as a positional argument and increments it.

```hbs
<p>{{increment 10}}</p>
```

Here's the definition of the helper:

```ts
import { map } from '@glimmer/reference';

function increment(args: VMArguments): Reference<number> {
  let input = args.positional.at(0);
  return map(ref, i => i + 1);
}
```

The Handlebars invocation syntax has both positional and named arguments. For convenience, Glimmer helpers take their arguments bundled together in a single object with `positional` and `named` properties.

# Compile Time and Runtime Interaction

The compiled binary represents a call to a helper as a single 64-bit number (e.g. `0x00100002`). That 64-bit number has two components:

- `0x0010` - the opcode for `Helper`
- `0x0002` - an encoded handle to a runtime function

The job of your `ResolverDelegate` is to convert a global helper name into a handle, and the job of your `RuntimeResolver` is to convert that handle back into a helper at runtime.

The simplest way to support a helper in Glimmer is to hardcode the mapping between handles and their associated functions.

Let's add `increment` to our environment by hardcoding its handle to `0`.

```ts
const RESOLVER_DELEGATE = {
  lookupHelper(name: string): Option<number> {
    if (name === 'increment') return 0;

    return null;
  },
};
```

When the compiler sees a call to the `{{increment}}` helper in the program, it asks the `ResolverDelegate` for a handle, which it stores in the program. At runtime, it asks the `RuntimeResolver` to turn the handle into a helper function.

Our `RuntimeResolver` implementation also hardcodes the mapping from `0` back to our `increment` helper.

```ts
const RUNTIME_RESOLVER = {
  resolve(handle: number) {
    if (handle === 0) {
      return increment;
    } else {
      throw new Error(`Unexpected handle ${handle}`);
    }
  },
};

function increment(args: VMArguments): Reference {
  let arg = args.positional.at(0);
  return map(arg, i => i + 1);
}
```

Now let's update our program to use the `ResolverDelegate` in the compiler and the `RuntimeResolver` at runtime.

```diff
@@ -90,20 +90,12 @@
let source = `
  {{#let "hello" "world" as |hello world|}}
    <p>{{hello}} {{world}}{{this.prefix}}</p>
  {{/let}}
`;

- let context = Context();
+ let context = Context(RESOLVER_DELEGATE);
let component = Component(source);
let handle = component.compile(context);

let program = artifacts(context);
```

```diff
@@ -90,20 +90,12 @@
import createHTMLDocument from '@simple-dom/document';
import { Runtime, renderAot } from '@glimmer/runtime';

let document = createHTMLDocument();
- let runtime = Runtime(document, payload);
+ let runtime = Runtime(document, payload, RUNTIME_RESOLVER);
let main = document.createElement('main');
let state = State({ prefix: '!' });
let cursor = { element: main, nextSibling: null };
```

And finally, let's update our template to use the `increment` helper:

```diff
let source = `
  {{#let "hello" "world" as |hello world|}}
-    <p>{{hello}} {{world}}{{this.prefix}}</p>
+    <p>{{hello}} {{world}}{{this.prefix}} (count: {{increment this.count}})</p>
  {{/let}}
`;
```

```diff
- let state = State({ prefix: '!' });
+ let state = State({ prefix: '!', count: 5 });
let cursor = { element: main, nextSibling: null };
let iterator = renderAot(runtime, handle, cursor, state);
let result = iterator.sync();

console.log(serialize(element));
- // <main><p>hello world!</p></main>
+ // <main><p>hello world! (count: 6)</p></main>

- state.update({ prefix: '?' });
+ state.update({ prefix: '?', count: 10 });
result.rerender();
console.log(serialize(element));
- // <main><p>hello world?</p></main>
+ // <main><p>hello world? (count: 11)</p></main>
```
