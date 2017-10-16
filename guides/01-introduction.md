### Table of Contents

1. [Introduction](./01-introduction.md)
2. [~~Precompiler Overview~~](./02-precompiler-overview.md)
3. [~~Runtime Overview~~](./03-runtime-overview.md)
4. [References](./04-references.md)
5. [Validators](./05-validators.md)
6. [~~Runtime Compiler~~](./06-runtime-compiler.md)
7. [~~Initial Render~~](./07-initial-render.md)
8. [~~Rerendering (Updating)~~](./08-rerendering-updating.md)
9. [~~The Environment~~](./09-the-environment.md)
10. [~~Optimizations~~](./10-optimizations.md)

# Introduction

Glimmer is a flexible, low-level rendering pipeline for building a "live" DOM
from [Handlebars][handlebars] templates that can subsequently be updated cheaply
when data changes.

In addition to the basic Handlebars features such as helpers and partials,
Glimmer also comes with built-in support for a very flexible and powerful
primitive called "Components" and a set of low-level hooks which the host
environment can use to build other high-level, user-facing features.

This document will give you an overview of Glimmer's core architecture. While
this guide is fairly detailed, this is not intended to be an always up-to-date
API documentation or getting started guide. When code examples are given in
this document, you should generally treat them as simplified pseudo-code that
help illustrate the design rather than describing the precise implementation
details in the current codebase.

The code examples in this document are written in [TypeScript][typescript].

[handlebars]: http://handlebarsjs.com
[typescript]: http://www.typescriptlang.org

## Architecture

The key insight of Glimmer is that Handlebars is a declarative programming
language for building and updating DOM. By structuring web UI around Handlebars
templates as the central abstraction, we can use advanced techniques from
programming languages and compilers to significantly boost the performance of
web applications in practice.

Because of this, Glimmer's architecture has more in common with compiler
toolchains like clang/LLVM or javac/JVM than traditional JavaScript libraries.

At a high level, Glimmer is made up of two parts:

1. The compiler, which turns templates into optimized binary bytecode.
2. The runtime, which evaluates that bytecode and translates its instructions into
   things like creating DOM elements or instantiating JavaScript component classes.

### Compiler

The compiler is responsible for turning your program's Handlebars templates into
Glimmer binary bytecode.

Because Glimmer is an optimizing compiler, it must know about all of the
templates in a program in order to understand how they work together. This is in
contrast to transpilers like Babel, which can transform each file in isolation.

As the compiler traverses your application and discovers templates, it parses
each one and creates an _intermediate representation_ (IR). The IR is similar to
the final bytecode program but contains symbolic references to external objects
(other templates, helpers, etc.) that may not have been discovered yet.

Once all of the templates have been parsed into IR, the compiler performs a
final pass that resolves symbolic addresses and writes the final opcodes into a
shared binary buffer. In native compiler terms, you can think of this as the
"linking" step that produces the final executable.

This binary executable is saved to disk as a `.gbx` file that can be served to a
browser and evaluated with the runtime.

But we're not quite done yet. The bytecode program will be evaluated in the
browser where it needs to interoperate with JavaScript. For example, users
implement their template helpers as JavaScript functions. In our compiled
program, how do we know what function to call if the user types `{{formatDate
user.createdAt}}`?

During compilation, Glimmer will assign unique numeric identifiers to each
referenced external object (like a helper or component). We call these
identifiers _handles_, and they are how we refer to "live" JavaScript objects
like functions in the binary bytecode.

When evaluating Glimmer bytecode in the browser, instead of asking for the
`"formatDate"` helper, the runtime might ask for the object with handle `4`.

In order to satisfy this request, the compiler also produces a data structure
called the _external module table_ that maps each handle to its associated
JavaScript object.

For example, imagine we compile a template that invokes two helpers, `formatDate` and
`pluralize`. These helpers get assigned handles `0` and `1` respectively. In order to
allow the runtime to turn those handles into the correct function object, the compiler
might produce a map like this:

```js
// module-table.ts
import formatDate from 'app/helpers/format-date';
import pluralize from 'app/helpers/pluralize';

export default [formatDate, pluralize];
```

With this data structure, we can easily implement a function that translates handles into
the appropriate live object:

```ts
import moduleTable from './module-table';

function resolveHandle<T>(handle: number): T {
  return moduleTable[handle];
}
```

You can think of the external module table as the bridge between Glimmer's
bytecode and the JavaScript VM. We can compactly represent references to
external objects in the bytecode using handles, and then rehydrate them later
with minimal overhead.

Now that we have our compiled bytecode and the module table, we're ready to run
our app in the browser, or any other JavaScript environment, like Node.js.

### Runtime

TODO

* * *

[Next: Precompiler Overview »](./02-precompiler-overview.md)
