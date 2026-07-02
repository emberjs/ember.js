// @vitest-environment happy-dom
/**
 * SSR smoke tests for `renderToString` from `@ember/renderer`, run in Node.js
 * against the *built* ember-source package, with happy-dom registered as the
 * global DOM implementation (the `@vitest-environment happy-dom` pragma above
 * — equivalent to happy-dom's `GlobalRegistrator.register()` on a server).
 *
 * These prove the server-rendering contract:
 * - rendering works in Node once DOM building blocks are registered
 * - modifiers run during SSR, against real (happy-dom) elements
 * - rendering settles before serialization: tracked-state updates made
 *   during render are reflected in the output
 */
import { it, expect } from 'vitest';

import { renderToString } from 'ember-source/@ember/renderer/index.js';
import { template } from 'ember-source/@ember/template-compiler/runtime.js';
import { trackedObject } from 'ember-source/@ember/reactive/collections.js';
import { setModifierManager, capabilities } from 'ember-source/@ember/modifier/index.js';

// A minimal function-based modifier (mirrors internal-test-helpers'
// FunctionalModifierManager) so these tests don't need ember-modifier.
const MODIFIER_MANAGER = {
  capabilities: capabilities('3.22'),
  createModifier(fn, args) {
    return { fn, args };
  },
  installModifier(state, element) {
    state.fn(element, state.args.positional, state.args.named);
  },
  updateModifier() {},
  destroyModifier() {},
  getDebugName(fn) {
    return fn.name || '(anonymous function)';
  },
};

function modifier(fn) {
  return setModifierManager(() => MODIFIER_MANAGER, fn);
}

it('renders a component to a string', async () => {
  let Hello = template('<h1>Hello, {{@name}}!</h1>');

  let html = await renderToString(Hello, { args: { name: 'Zoey' } });

  expect(html).toBe('<h1>Hello, Zoey!</h1>');
});

it('renders {{{tripleStache}}} raw HTML', async () => {
  let Component = template('<div>{{{@html}}}</div>');

  let html = await renderToString(Component, { args: { html: '<b>bold</b>' } });

  expect(html).toBe('<div><b>bold</b></div>');
});

it('runs modifiers during SSR, and their DOM effects appear in the output', async () => {
  let ran = false;
  let autofocus = modifier((element) => {
    ran = true;
    element.setAttribute('data-focused', 'true');
  });
  let Component = template('<input {{autofocus}} />', {
    scope: () => ({ autofocus }),
  });

  let html = await renderToString(Component);

  expect(ran).toBe(true);
  expect(html).toBe('<input data-focused="true">');
});

it('settles before serializing: tracked state updated by a modifier is in the output', async () => {
  let state = trackedObject({ message: 'loading' });
  let load = modifier(() => {
    state.message = 'loaded';
  });
  let Component = template('<div {{load}}>{{state.message}}</div>', {
    scope: () => ({ load, state }),
  });

  let html = await renderToString(Component);

  expect(html).toBe('<div>loaded</div>');
});

it('emits rehydration markers when asked', async () => {
  let Hello = template('<h1>Hello!</h1>');

  let html = await renderToString(Hello, { env: { rehydratable: true } });

  expect(html).toContain('<!--%+b:0%-->');
  expect(html).toContain('<h1>Hello!</h1>');
});
