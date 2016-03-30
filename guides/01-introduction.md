### Table of Content

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

In additional to the basic Handlebars features such as helpers and partials,
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

* * *

[Next: Precompiler Overview »](./02-precompiler-overview.md)
