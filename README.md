# Status [![Build Status](https://travis-ci.org/tildeio/glimmer.svg?branch=master)](https://travis-ci.org/tildeio/glimmer) [![Sauce Test Status](https://saucelabs.com/buildstatus/htmlbars-ci)](https://saucelabs.com/u/htmlbars-ci)

Glimmer is a layer built on top of the Handlebars template compiler.

# Goals

The goal of Glimmer is to have a compiler for Handlebars that
builds a DOM rather than a String.

This means that helpers can have special behavior based on their
context (they know if they are inside an `<a>` tag, inside an
attribute, etc.)

Ultimately, the goal is to have a good data binding setup for
Handlebars that can work directly against DOM nodes and doesn't
need special tags in the String for the data binding code to work
(a major limitation in Ember).

There are also many performance gains in Glimmer' approach to building
DOM vs the HTML-unaware string building approach of Handlebars.

# Usage

TODO: much change. This section will be updated shortly.

# Building Glimmer

1. Ensure that [Node.js](http://nodejs.org/) is installed.
2. Run `npm install` to ensure the required dependencies are installed.
3. Run `npm run-script build` to build Glimmer. The builds will be placed in the `dist/` directory.

# How to Run Tests

## Via Ember CLI

1. Run: `ember test --server`

Ember CLI is a CI tool, so it will run tests as you change files.

## On the console with PhantomJS

1. Run `npm test`.

## In a browser

1. Run `npm start`.
2. Visit <http://localhost:4200/tests/>.

# TypeScript Notes

## "Friend" Properties and Methods

In TypeScript, `private` and `protected` refer to the class itself
(and its subclasses).

Sometimes, you want to add a property or method that shouldn't be
considered part of the external API (for other packages or Ember)
but is expected to be used as part of an internal protocol.

In that case, it's ok to mark the property as `private` or
`protected` and use `['property']` syntax to access the property
inside of the same package.

```js
class Layout {
  private template: Template;
}

function compile(layout: Layout, environment: Environment): CompiledBlock {
  return layout['template'].compile(environment);
}
```

The idea is that the `compile` function might as well be a private method
on the class, but because the function leaks into untyped code, we want
to be more careful and avoid exporting it.

Other use-cases might include protocols where a cluster of classes is
intended to work together internally, but it's difficult to describe
as a single class hierarchy.

This is a semi-blessed workflow according to the TypeScript team, and
Visual Studio Code (and tsc) correctly type check uses of indexed
properties, and provide autocompletion, etc.

**You should not treat use of `['foo']` syntax as license to access
private properties outside of the package.**
