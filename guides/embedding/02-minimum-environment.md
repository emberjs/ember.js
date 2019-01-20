# Some Context

## Strict Mode

The embedding guide assumes an embedding that uses Glimmer's strict mode, largely for explanatory convenience.

## AOT Mode

Glimmer has two compilation modes: AOT and JIT. In AOT mode, all components are compiled before any components are executed. In JIT mode, components are compiled on demand once they are encountered.

When compiling in JIT mode, the compiler inserts extra opcodes before component or block invocation to ensure that the code is compiled. When compiling in AOT mode, the compiler knows the offset for all compiled components ahead of time, and simply stores the offsets in the opcodes directly.

The first part of this embedding guides uses the AOT mode, which means that we'll be compiling all components that we want to use before executing them. A subsequent guide will describe how to adapt the examples for JIT mode.

## Host Independent Example

The basic semantics of variable bindings are host-independent.

```hbs
{{#let "hello" "world" as |hello world|}}
  <p>{{hello}} {{world}}</p>
{{/let}}
```

This component defines two variables: `hello` (initialized to the string `"hello"`) and `world` (initialized to the string `"world"`).

Because this component is host-agnostic, we can compile and execute it without supplying any of the host-specified behavior. The first part of the embedding guide will use this example so we can learn how the basic machinery of the Embedding API works.

# Let's Get Going

## Compilation

First, we create a minimal "compilation context" by calling `Context()`.

```ts
import { Context } from '@glimmer/opcode-builder';

let context = Context();
```

The compilation context is used to compile all of the components in our entire program. Once we're done compiling components, we'll serialize the context into bytecode that we can use to execute our components.

Next, we'll need to turn our source code into a compilable component:

```ts
import { Component } from '@glimmer/opcode-compiler';

let source = `
{{#let "hello" "world" as |hello world|}}
  <p>{{hello}} {{world}}</p>
{{/let}}
`;

let component = Component(source);
```

Finally, we'll compile our component using the compilation context we created.

```ts
let handle = component.compile(context);
```

A "handle" is a 32-bit integer that refers to a compiled component. We'll use it later to invoke this component.

For this minimal example, we're done compiling components, so let's serialize our context into bytecode.

```ts
let program = artifacts(context);
```

A "program" is an object with two properties:

- `heap`: the serialized binary representation of the program we compiled
- `constants`: a constant pool, used to store strings and other small, serializable values that are referred to by opcodes in the program

Under normal circumstances, we'd serialize the program into a file and ship it over the wire to the browser. For the sake of this exercise, let's execute our program in node instead.

# Runtime

## The DOM

Glimmer's internals work against a small subset of the DOM's interfaces called SimpleDOM.

Unlike a Virtual DOM, Glimmer's DOM subset uses the exact same interface as the DOM itself: `createElement`, `setAttribute` and a few more exotic methods like `setAttributeNS` and `insertAdjacentHTML`. This subset allows Glimmer's internals to work directly against the real DOM when it's available, while clearly providing a specification of the subset to target for situations where the real DOM is not available.

The Ember project maintains an implementation of the SimpleDOM interfaces (the `@simple-dom` npm packages), which it uses in [FastBoot][fastboot], Ember's server-side rendering solution. Unlike JSDOM, `simple-dom` is a minimal implementation of the DOM's data structures--just enough to be able to fully create and update DOM trees. This keeps the implementation compact and efficient.

[fastboot]: https://ember-fastboot.com/

Since we're running in node, let's use `simple-dom` to create a document to render our component into.

```ts
import createHTMLDocument from '@simple-dom/document';

let document = createHTMLDocument();
```

## The Runtime Environment

Next, we need to hydrate the compilation artifacts into a `RuntimeContext`. The `RuntimeContext` is used by the VM to execute compiled components.

```ts
import { Runtime } from '@glimmer/runtime';

let runtime = Runtime(document, payload);
```

## Getting Ready to Execute

Next, we'll create an element to execute our component into using our SimpleDOM document:

```ts
let main = document.createElement('main');
```

Glimmer renders components into a `Cursor`, which is an element _and_ a `nextSibling`. This is important if you want to render your component into the middle of an existing element.

In our case, we just want to append into our new `<main>` element:

```ts
let cursor = { element: main, nextSibling: null };
```

The `Cursor` interface matches the API signature of `insertBefore`, which is the primitive SimpleDOM API that Glimmer uses to insert elements into the DOM.

## Executing

Finally, let's execute our compiled template. Since we're using the AOT mode, we call `renderAot` with the runtime, the handle to the component to execute, and the cursor to render into.

```ts
import { renderAot } from '@glimmer/runtime';

let iterator = renderAot(runtime, handle, cursor);
```

## Scheduling

In production implementations, you would want to render the component in chunks, to avoid janking the browser as rendering proceeds. Therefore, the `renderAot` method returns a JavaScript Iterator that you can use to break apart the rendering into pieces.

For the sake of this guide, let's just run the iterator synchronously.

```ts
let result = iterator.sync();
```

In addition to exhausting the iterator, the `sync()` method invokes lifecycle hooks on objects that need them. In this simple case, there are no lifecycle hooks to run.

# All Together Now

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
```

Finally, let's serialize our element into a string so we can look at it in the console. `@simple-dom/serializer` will take an object that implements SimpleDOM and turn it into a string:

```ts
import Serializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';

let serialized = new Serializer(voidMap).serialize(element);

console.log(serialized);

// <main><p>hello world</p></main>
```
