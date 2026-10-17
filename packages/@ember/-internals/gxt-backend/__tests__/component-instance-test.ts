/**
 * A component instance belongs to its invocation (compat, GXT_MODE).
 *
 * Glimmer semantics: each invocation of a component creates its own instance
 * (`@glimmer/runtime` `CreateComponentOpcode`), whose `this.args` are that
 * invocation's arguments. An instance is never handed to another invocation,
 * also not to one rendered after a re-render of the page.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import Component from '@glimmer/component';

moduleFor(
  'GXT a component instance belongs to its invocation',
  class extends RenderingTestCase {
    // `component:show-arg`: a Glimmer component rendering its `@value` through
    // `this.args`, that records each instance it creates.
    registerShowArg(instances: Component<{ value: string }>[]) {
      this.owner.register(
        'component:show-arg',
        setComponentTemplate(
          precompileTemplate('[{{this.value}}]'),
          class extends Component<{ value: string }> {
            constructor(owner: object, args: { value: string }) {
              super(owner, args);
              instances.push(this);
            }
            get value() {
              return this.args.value;
            }
          }
        )
      );
    }

    ['@test an invocation rendered after a re-render gets its own instance']() {
      let instances: Component<{ value: string }>[] = [];
      this.registerShowArg(instances);

      this.render('<ShowArg @value="a" />{{#if this.show}}<ShowArg @value="b" />{{/if}}', {
        show: false,
      });
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'show', true));

      this.assertText('[a][b]');
      this.assert.strictEqual(instances.length, 2, 'each invocation has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.args.value),
        ['a', 'b'],
        'each instance has the arguments of its invocation'
      );
    }

    ['@test a row added after a re-render gets its own instance']() {
      let instances: Component<{ value: string }>[] = [];
      this.registerShowArg(instances);

      this.render('{{#each this.list as |item|}}<ShowArg @value={{item}} />{{/each}}', {
        list: ['a'],
      });
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'list', ['a', 'b']));

      this.assertText('[a][b]');
      this.assert.strictEqual(instances.length, 2, 'each row has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.args.value),
        ['a', 'b'],
        'each instance has the arguments of its row'
      );

      runTask(() => set(this.context, 'list', ['b']));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 2, 'the remaining row keeps its instance');
      this.assert.strictEqual(instances[1]!.args.value, 'b');
    }
  }
);
