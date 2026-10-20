# @glimmer/dom (experimental)

Runtime helpers for **strict-mode** templates that are compiled directly to
JavaScript DOM operations, skipping the wire format, the opcode compiler, and
both VMs.

```hbs
{{#if @show}}<p>{{this.name}}</p>{{/if}}
```

compiles (via `codegenBabelPlugin` / `compileToDOM` in `@glimmer/compiler`) to
roughly:

```js
const $_t1 = html('<!>');
const $_t2 = html('<p><!></p>');

template(($_b, $_ctx) => {
  const $_s = $_ctx.self,
    $_a = $_ctx.args;
  const $_r = clone($_b, $_t1);
  when(
    $_b,
    at($_r, 0),
    () => bool($_a.show),
    ($_b) => {
      const $_r2 = clone($_b, $_t2);
      content($_b, at($_r2, 0, 0), () => get($_s, 'name'), 0);
      return $_r2;
    }
  );
  return $_r;
});
```

- Static markup is an HTML string, parsed once and cloned per render.
- Each dynamic part is one helper call. Values are thunks, read inside
  `@glimmer/validator` caches, so autotracking works unchanged.
- Each helper registers an updater on its block instead of the VM recording
  updating opcodes. Constant values never register one.
- Lexical scope is JavaScript's own: the compiled template is emitted where
  the `<template>` was, so it closes over the module's bindings.
- Well-known built-ins (`on`, `fn`, `hash`, `array`, `concat`, `get`, `eq`,
  `not`, `and`, `or`, `if`, ...) are compiled inline. Everything else goes
  through the existing helper, modifier and component managers.

## Using it in an app

Add the babel plugin before `babel-plugin-ember-template-compilation` (which
then only handles templates this one doesn't, such as `hbs` in tests):

```js
import { _codegenBabelPlugin } from 'ember-source/ember-template-compiler/index.js';

export default {
  plugins: [
    _codegenBabelPlugin, // or [_codegenBabelPlugin, { vmInterop: true }]
    ['babel-plugin-ember-template-compilation', {}],
    // ...
  ],
};
```

and render with `renderComponent` from `@glimmer/dom`. Nothing from the VM is
loaded unless something needs it.

## Interop with the VM (`@glimmer/dom/vm`)

Apps that also use the VM (the router, `@ember/renderer`, addons with VM
templates) compile with `{ vmInterop: true }`. Compiled templates then import
`template`/`setTemplate` from `@glimmer/dom/vm`, which makes them renderable
by the VM too: as route templates, from `renderComponent` in
`@ember/renderer`, and from VM-rendered components. In a route template,
`{{outlet}}` becomes an element that the VM renders the route's `<@outlet />`
into, in the same render tree as the route.

Importing `@glimmer/dom/vm` also lets compiled templates render components
that only have a VM template (e.g. `<LinkTo>`), inside a `<glimmer-island>`
element, with named args, attributes and modifiers, and the default block.

## Size

The two smoke-test apps whose sizes CI reports
(`smoke-tests/v2-app-hello-world-template` and `smoke-tests/v2-app-template`)
are compiled with this. JS in `dist/` (bytes, raw / gzip):

| app                                    | wire format + VM  | compiled to DOM   |
| -------------------------------------- | ----------------- | ----------------- |
| v2-app-hello-world-template            | 125,753 / 39,477  | 27,662 / 9,772    |
| v2-app-template (router, `{{outlet}}`) | 350,767 / 112,176 | 360,143 / 115,341 |

The full app gets slightly bigger: it still needs the VM for the router and
for `{{outlet}}`, and adds this runtime and the interop on top.

## Status

This is a prototype for exploring the idea. Not supported yet:

- loose mode (by design: this is for strict mode only)
- positional arguments to components, the `helper`/`modifier` keywords,
  `{{mount}}`
- blocks and `...attributes` when the VM renders a compiled component, and
  named blocks for components that only have a VM template
- SSR / rehydration, the debug render tree (Ember Inspector)
- foreign content at the root of a template (e.g. a component whose template
  is just `<path>`), and HTML that the parser restructures (`<table><tr>`
  without a `<tbody>`)
