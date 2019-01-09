# Strict Mode

The embedding guide assumes an embedding that uses Glimmer's strict mode, largely for explanatory convenience.

# Variable Bindings

The basic semantics of variable bindings are host-independent.

```hbs
{{#let "hello" "world" as |hello world|}}
  <p>{{hello}} {{world}}</p>
{{/let}}
```

This component defines two variables: `hello` (initialized to the string `"hello"`) and `world` (initialized to the string `"world"`).

Because this component is host-agnostic, we can compile and execute it without supplying any of the host-specified behavior.

# Compilation

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

# The Runtime Environment

Next, we need to set up a runtime environment to execute our program inside of.

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
