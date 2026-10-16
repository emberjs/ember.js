/**
 * Components destroyed with the block they render in (compat, GXT_MODE).
 *
 * Glimmer semantics: a component is a destroyable child of the block it is
 * rendered in (`@glimmer/runtime` `associateDestroyable`). Tearing a block down
 * (an `{{#if}}` branch, an `{{#each}}` row) destroys the components rendered in
 * it and in the blocks rendered in it, a yielded block's included, in the order
 * they were created. Their managers' scheduled destructors (a Glimmer
 * component's `willDestroy`, scheduled into the `actions` queue) run before the
 * run loop that tore the block down ends.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import Component from '@glimmer/component';

moduleFor(
  'GXT components are destroyed with their block',
  class extends RenderingTestCase {
    // `component:{name}`: a Glimmer component rendering `template` whose
    // `willDestroy` records its `@id`.
    registerRecorded(name: string, template: string, destroyed: unknown[]) {
      this.owner.register(
        `component:${name}`,
        setComponentTemplate(
          precompileTemplate(template),
          class extends Component<{ id: unknown }> {
            willDestroy() {
              super.willDestroy();
              destroyed.push(this.args.id);
            }
          }
        )
      );
    }

    ['@test a component in a block of a yielded block is destroyed in the run loop that removes the outer block']() {
      let destroyed: unknown[] = [];
      this.owner.register(
        'component:outer-box',
        setComponentTemplate(precompileTemplate('<div>{{yield}}</div>'), class extends Component {})
      );
      this.registerRecorded('inner-item', '{{@id}}', destroyed);

      this.render(
        '{{#if this.show}}{{#outer-box}}{{#if this.inner}}{{inner-item id=1}}{{/if}}{{inner-item id=2}}{{/outer-box}}{{/if}}',
        { show: true, inner: true }
      );
      this.assertText('12');

      runTask(() => set(this.context, 'show', false));

      this.assertText('');
      this.assert.deepEqual(destroyed, [1, 2], 'both components are destroyed');

      runTask(() => set(this.context, 'show', true));

      this.assertText('12');
      this.assert.deepEqual(destroyed, [1, 2], 'the new components are live');
    }

    ['@test the components of a block are destroyed in the order they were created']() {
      let destroyed: unknown[] = [];
      this.registerRecorded('parent-item', '[{{yield}}]', destroyed);
      this.registerRecorded('child-item', '{{@id}}', destroyed);

      this.render(
        '{{#if this.show}}{{#parent-item id="a"}}{{child-item id="a1"}}{{/parent-item}}{{child-item id="b"}}{{child-item id="c"}}{{/if}}',
        { show: true }
      );
      this.assertText('[a1]bc');

      runTask(() => set(this.context, 'show', false));

      this.assertText('');
      this.assert.deepEqual(destroyed, ['a', 'a1', 'b', 'c']);
    }

    ['@test the rows of an {{#each}} destroy their components in the run loop that removes them']() {
      let destroyed: unknown[] = [];
      this.registerRecorded('row-item', '({{@id}})', destroyed);

      this.render('<ul>{{#each this.list as |item|}}<li>{{row-item id=item}}</li>{{/each}}</ul>', {
        list: ['a', 'b', 'c'],
      });
      this.assertText('(a)(b)(c)');

      runTask(() => set(this.context, 'list', ['a']));

      this.assertText('(a)');
      this.assert.deepEqual(destroyed, ['b', 'c'], 'the removed rows destroy their components');

      runTask(() => set(this.context, 'list', []));

      this.assertText('');
      this.assert.deepEqual(destroyed, ['b', 'c', 'a'], 'the last row destroys its component');
    }
  }
);
