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

# Runtime Overview

The Glimmer runtime takes the compiled bytecode discussed in the previous section and renders it in the browser. At a high level, the runtime begins by rendering a component tree, beginning with one root component and walking down through its templates. While doing this, it saves an optimized set of bytecodes which can be used later on when rerendering the application. These update codes ignore content which is purely static, such as DOM elements and helpers or components which have static inputs, and adds updating instructions for dynamic content.

Glimmer simultaneously sets up a tree of _references_ and _validators_ for components, helpers, and values. These allow Glimmer to efficiently check if the state of a given subtree of the component hierarchy has changed, and rerender it if so.

## Application Lifecycle

At a high level, the runtime centers around around 3 main concepts:

1. [Components](#component-glossary)
2. [References](#reference-guide)
3. [Validators](#validator-guide)

**Components** as seen by Glimmer are a reusable unit of UI that encapsulates behavior and appearance. Because Glimmer VM is a highly configurable runtime, the exact meaning of "component" is determined by the host [environment](#environment) and one or more [component managers](#component-manager).

**References** are stable objects that represents the result of a pure (side-effect-free) computation, where the result of the computation might change over time. Glimmer creates references to represent values used in templates so that they can be efficiently shared across multiple components and efficiently updated should the underlying value change.

**Validators** are stable objects that provides certain guarantees about the freshness of a computation result. Validators can be combined, such that if any of a child validator's values have been changed, the parent will also be marked as changed.

A Glimmer application consists of a tree of components, starting with one root component, and evaluating and rendering any references to values, helpers, and other components it may have in its template. You can think of this as the `main` component, similar to the `main` function in many programming languages. Unlike those languages however, the Glimmer VM is fairly low level and doesn't provide a convention for defining this component. This allows host environments to define their conventions and `main` component as they see fit, and render it using Glimmer's `renderMain` function.

As it renders, Glimmer adds validators for every component and reference it creates. These validators are combined, such that the validator for a given  component represents the union of the validators for any references or components it contains, resulting in a tree of validators that matches the component tree.

Host environments can then provide different methods for invalidating state (via the validators), such as Ember's `set()` function or `@tracked` from Glimmer.js. When rerendering, Glimmer traverses the tree of components, checking each component's validator to see if it needs to be rerendered. If so, it traverses the component's subtree, but if not, the component is skipped entirely. This results in very efficient rerenders as only the portions that have changed will be rerendered by default.

[component-glossary]: ./11-glossary.md#component
[reference-guide]: ./04-references.md
[validator-guide]: ./05-validators.md

## The Virtual Machine

TODO

* * *

[Next: References »](./04-references.md)
