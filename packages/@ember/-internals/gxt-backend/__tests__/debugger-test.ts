/**
 * `{{debugger}}` calls Glimmer's debugger callback (compat, GXT_MODE).
 *
 * The callback (`setDebuggerCallback`) runs each time the statement renders,
 * with the template's self and `get(path)`: `get('this')` is the self, a block
 * param or `{{#let}}` binding is that local, anything else a path on the self.
 * gxt calls it through its `debugger` host hook.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { resetDebuggerCallback, setDebuggerCallback } from '@glimmer/runtime';

moduleFor(
  'GXT {{debugger}}',
  class extends RenderingTestCase {
    afterEach() {
      resetDebuggerCallback();
      super.afterEach();
    }

    ['@test the callback gets the block params of an {{#each}} row']() {
      const seen: unknown[] = [];
      setDebuggerCallback((_context, get) => {
        seen.push([get('item'), get('i')]);
      });
      this.render('{{#each this.items as |item i|}}{{debugger}}{{/each}}', {
        items: ['a', 'b'],
      });
      this.assert.deepEqual(seen, [
        ['a', 0],
        ['b', 1],
      ]);
    }

    ['@test the callback runs when its block renders, not when the template updates']() {
      let calls = 0;
      setDebuggerCallback((context, get) => {
        calls++;
        this.assert.strictEqual(get('this'), context, 'get("this") is the context');
      });
      this.render('{{this.text}}{{#if this.show}}{{debugger}}{{/if}}', {
        text: 'a',
        show: true,
      });
      this.assert.strictEqual(calls, 1, 'once on the first render');

      runTask(() => set(this.context, 'text', 'b'));
      this.assert.strictEqual(calls, 1, 'not again on an update of another binding');

      runTask(() => set(this.context, 'show', false));
      runTask(() => set(this.context, 'show', true));
      this.assert.strictEqual(calls, 2, 'again when its block renders again');
    }
  }
);
