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
- Components that don't have a compiled template (e.g. from addons) are
  rendered by the VM, inside a `<glimmer-island>` element.

## Status

This is a prototype for exploring the idea. It is not part of the published
ember-source build. Not supported yet:

- loose mode (by design: this is for strict mode only)
- positional arguments to components, the `helper`/`modifier` keywords,
  `{{outlet}}`, `{{mount}}`
- rendering compiled components from inside the VM (only the other way
  around)
- SSR / rehydration, the debug render tree
- foreign content at the root of a template (e.g. a component whose template
  is just `<path>`), and HTML that the parser restructures (`<table><tr>`
  without a `<tbody>`)
