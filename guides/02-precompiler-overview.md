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

# Precompiler Overview

It all starts with a template. For the purposes of precompilation, the template is a string. For example:

```
Hello, Glimmer!
```

or

```
<p>This string looks like HTML</p>
```

```
{{#ember-component as |compy386|}}This string looks like Ember{{/ember-component}}
```

```
<GlimmerComponent @args='are fun'>This string looks like GlimmerJS</GlimmerComponent>
```

Though the examples above may _look_ like HTML, Ember templates, or Glimmer templates, at the point of precompilation, they are just strings. These strings are transformed into Abstract Syntax Trees ([AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree)) by the Handlebars parser. At this point, parts of the string have meaning, but the Handlebars parser does not understand HTML syntax, so much of the template strings are still just strings.

From here, Glimmer further processes the AST, teasing meaning out of the strings that remain. When this preprocessing is complete, each part of the original template string is parsed and labeled. For example, the `p` and `GlimmerComponent` from the examples above are recognized as `ElementNode`s. The AST is ready for compilation.

Glimmer's `TemplateCompiler` transforms the AST into an Intermediate Representation ([IR](https://en.wikipedia.org/wiki/Intermediate_representation)) or `WireFormat`. The Intermediate Representation contains a list of `statements` or instructions which will eventually be used to render the template, and a `symbolTable` containing the variables created in the scope of a template block. For instance, in the `ember-component` example above, `{{#ember-component as |compy386|}} ... {{/ember-component}}` is the block, and `compy386` is the variable created in the scope of the block.

When the Intermediate Representation is ready, the precompilation step is complete. At this point, paths diverge; the final compilation steps are either completed at buildtime or at runtime, depending on the environment in which Glimmer is running. Read on!

[Next: Runtime Overview »](./03-runtime-overview.md)
