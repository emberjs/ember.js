# Status [![Build Status](https://travis-ci.org/tildeio/htmlbars.png)](https://travis-ci.org/tildeio/htmlbars)

HTMLBars is a layer built on top of the Handlebars template compiler.

# Goals

The goal of HTMLBars is to have a compiler for Handlebars that
builds a DOM rather than a String.

This means that helpers can have special behavior based on their
context (they know if they are inside an `<a>` tag, inside an
attribute, etc.)

Ultimately, the goal is to have a good data binding setup for
Handlebars that can work directly against DOM nodes and doesn't
need special tags in the String for the data binding code to work
(a major limitation in Ember).

There are also many performance gains in HTMLBars' approach to building
DOM vs the HTML-unaware string building approach of Handlebars.

# Usage

TODO: much change. This section will be updated shortly.

Until then, check out [ARCHITECTURE.md](ARCHITECTURE.md) for
info on how HTMLBars is structured and its approach to efficiently
building / emitting DOM.

