# Status [![Build Status](https://travis-ci.org/glimmerjs/glimmer-vm.svg?branch=master)](https://travis-ci.org/glimmerjs/glimmer-vm) [![Sauce Test Status](https://saucelabs.com/buildstatus/htmlbars-ci)](https://saucelabs.com/u/htmlbars-ci)

Glimmer is a flexible, low-level rendering pipeline for building a "live" DOM
from [Handlebars][handlebars] templates that can subsequently be updated cheaply
when data changes.

It is written in [TypeScript][typescript].

The project is still going through rapid changes at the moment. For the time
being, please refer the [architecture overview][guides] for more information.

# Building Glimmer

1. Ensure that [Node.js](http://nodejs.org/) is installed.
2. Run `npm install` or `yarn install` to ensure the required dependencies are installed.
3. Run `npm run build` to build each Glimmer package. The builds will be placed in the `dist/` directory.

Glimmer's packages are only built when running `npm run build` (or `ember build --env production`).
If you run `ember build` without setting the production environment, `dist/`
will only contain test assets.

If you want to use the built packages in other projects, you can use `npm run
yarn:link` to execute the `yarn link` command inside each built package. (You
must build the packages first with `npm run build`).

# How to Run Tests

## Via Ember CLI

1. Run: `ember test --server`

Ember CLI is a CI tool, so it will run tests as you change files.

## On the console with PhantomJS

1. Run `npm test`.

## In a browser

1. Run `npm start`.
2. Visit <http://localhost:7357/tests/>.

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

[handlebars]: http://handlebarsjs.com
[typescript]: http://www.typescriptlang.org
[guides]: ./guides/01-introduction.md
