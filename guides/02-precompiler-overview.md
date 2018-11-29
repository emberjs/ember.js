### Table of Contents

1. [Introduction](./01-introduction.md)
2. [Precompiler Overview](./02-precompiler-overview.md)
3. [Runtime Overview](./03-runtime-overview.md)
4. [References](./04-references.md)
5. [Validators](./05-validators.md)
6. [~~Runtime Compiler~~](./06-runtime-compiler.md)
7. [~~Initial Render~~](./07-initial-render.md)
8. [~~Rerendering (Updating)~~](./08-rerendering-updating.md)
9. [~~The Environment~~](./09-the-environment.md)
10. [~~Optimizations~~](./10-optimizations.md)

# Precompiler Overview

The precompilation step, which generally occurs at build time, takes a template string and turns it into an Intermediate Representation (also known as IR or WireFormat). The Intermediate Representation is a set of structured instructions that could be used directly for rendering, but is more approrpriately further processed into optimized opcodes. The public interface for the precompilation is the `precompile` function from the `@glimmer/compiler` package.

```js
import { precompile } from '@glimmer/compiler';

...

const wireFormat = precompile('<p>This string is my template</p>');

...
```

## How the sausage is made
The precompilation process is relatively short and straightforward, and if you are satisfied with knowing that strings go in and Intermediate Representations come out, you can safely skip to the next guide. If you would like to know a little more about how the process works, read on.

### Template examples
```
Hello, Glimmer!
```

or

```
<p>This string looks like HTML</p>
```

or

```
{{#ember-component as |compy386|}}This string looks like Ember{{/ember-component}}
```

or

```
<GlimmerComponent @args='are fun'>This string looks like Glimmer.js</GlimmerComponent>
```

### Parsing the string with Handlebars

Though the examples above may _look_ like HTML, Ember templates, or Glimmer templates, at the point of precompilation they are just strings. These strings are transformed into Abstract Syntax Trees ([AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree)) by the Handlebars parser.

```
let ast = handlebars.parse('<p>This string looks like HTML</p>');
```

At this point in the process, parts of the string have meaning, but the Handlebars parser does not understand HTML syntax, so much of the template strings are still just strings.

### Identifying HTML and angle components

From here, Glimmer further processes the AST, teasing meaning out of the strings that remain. When this preprocessing is complete, each part of the original template string is parsed and labeled. For example, the `p` and `GlimmerComponent` from the examples above are recognized as `ElementNode`s. The AST is ready for compilation.

### Creating the Intermediate Representation

Glimmer's `TemplateCompiler` transforms the AST into an Intermediate Representation ([IR](https://en.wikipedia.org/wiki/Intermediate_representation)) or `WireFormat`. The Intermediate Representation contains a list of `statements` or instructions which will eventually be used to render the template, and a `symbolTable` containing the variables created in the scope of a template block. For instance, in the `ember-component` example above, `{{#ember-component as |compy386|}} ... {{/ember-component}}` is the block, and `compy386` is the variable created in the scope of the block.

When the Intermediate Representation is ready, the precompilation step is complete. At this point, paths diverge; the final compilation steps are either completed at build time or at run time, depending on the environment in which Glimmer is running. Read on!

[Next: Runtime Overview »](./03-runtime-overview.md)
