/**
 * What a component's template renders is destroyed with the block the
 * component is invoked in (compat, GXT_MODE).
 *
 * Glimmer semantics: a component's template renders in the component's block,
 * a destroyable child of the block the component is invoked in
 * (`@glimmer/runtime` `associateDestroyable`). Tearing that block down (an
 * `{{#if}}` branch, an `{{#each}}` row) destroys the modifiers of the
 * component's elements and of the blocks its template renders; a block that
 * stays rendered keeps them.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { modifierCapabilities, setComponentTemplate, setModifierManager } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import Component from '@glimmer/component';
import ClassicComponent from '@ember/component';

moduleFor(
  "GXT a component's template is destroyed with the block it is invoked in",
  class extends RenderingTestCase {
    // `modifier:record`: records the name (its first positional argument) of
    // each modifier it installs and destroys.
    registerRecord(installed: unknown[], destroyed: unknown[]) {
      this.owner.register(
        'modifier:record',
        setModifierManager(
          () => ({
            capabilities: modifierCapabilities('3.22'),
            createModifier(_factory: unknown, args: { positional: readonly unknown[] }) {
              return { name: args.positional[0] };
            },
            installModifier(state: { name: unknown }) {
              installed.push(state.name);
            },
            updateModifier() {},
            destroyModifier(state: { name: unknown }) {
              destroyed.push(state.name);
            },
          }),
          {}
        )
      );
    }

    ['@test a template-only component in an {{#if}}']() {
      let installed: unknown[] = [];
      let destroyed: unknown[] = [];
      this.registerRecord(installed, destroyed);
      this.owner.register(
        'component:with-modifier',
        setComponentTemplate(precompileTemplate('<b {{record @name}}></b>'), templateOnly())
      );

      this.render('{{#if this.show}}<WithModifier @name="a" />{{/if}}', { show: true });
      this.assert.deepEqual(installed, ['a']);

      runTask(() => set(this.context, 'show', false));

      this.assert.deepEqual(destroyed, ['a'], 'the modifier is destroyed with the branch');
    }

    ['@test a Glimmer component in an {{#each}} row']() {
      let installed: unknown[] = [];
      let destroyed: unknown[] = [];
      this.registerRecord(installed, destroyed);
      this.owner.register(
        'component:with-modifier',
        setComponentTemplate(
          precompileTemplate('<b {{record @name}}></b>'),
          class extends Component {}
        )
      );

      this.render('{{#each this.list as |item|}}<WithModifier @name={{item}} />{{/each}}', {
        list: ['a', 'b', 'c'],
      });
      this.assert.deepEqual(installed, ['a', 'b', 'c']);

      runTask(() => set(this.context, 'list', ['a', 'c']));

      this.assert.deepEqual(destroyed, ['b'], 'the removed row destroys its modifier');
    }

    ['@test a classic component in an {{#if}}']() {
      let installed: unknown[] = [];
      let destroyed: unknown[] = [];
      this.registerRecord(installed, destroyed);
      this.owner.register(
        'component:with-modifier',
        setComponentTemplate(
          precompileTemplate('<b {{record this.name}}></b>'),
          class extends ClassicComponent {
            tagName = '';
          }
        )
      );

      this.render('{{#if this.show}}{{with-modifier name="a"}}{{/if}}', { show: true });
      this.assert.deepEqual(installed, ['a']);

      runTask(() => set(this.context, 'show', false));

      this.assert.deepEqual(destroyed, ['a'], 'the modifier is destroyed with the branch');
    }

    ["@test a block in a component's template"]() {
      let installed: unknown[] = [];
      let destroyed: unknown[] = [];
      this.registerRecord(installed, destroyed);
      this.owner.register(
        'component:with-block',
        setComponentTemplate(
          precompileTemplate(
            '{{#if @inner}}<b {{record "inner"}}></b>{{/if}}<i {{record "own"}}></i>'
          ),
          templateOnly()
        )
      );

      this.render('{{#if this.show}}<WithBlock @inner={{true}} />{{/if}}', { show: true });
      this.assert.deepEqual(installed, ['inner', 'own']);

      runTask(() => set(this.context, 'show', false));

      this.assert.deepEqual(
        destroyed.slice().sort(),
        ['inner', 'own'],
        'the modifiers of the template and of its block are destroyed with the branch'
      );
    }

    ['@test a component rendered next to a removed block keeps its modifiers']() {
      let installed: unknown[] = [];
      let destroyed: unknown[] = [];
      this.registerRecord(installed, destroyed);
      this.owner.register(
        'component:with-modifier',
        setComponentTemplate(
          precompileTemplate(
            '<b {{record @name}}></b>{{#if @inner}}<i {{record @inner}}></i>{{/if}}'
          ),
          templateOnly()
        )
      );

      this.render(
        '{{#if this.show}}<WithModifier @name="a" />{{/if}}<WithModifier @name="b" @inner="b-inner" />{{#if this.show}}<WithModifier @name="c" />{{/if}}',
        { show: true }
      );
      this.assert.deepEqual(installed, ['a', 'b', 'b-inner', 'c']);

      runTask(() => set(this.context, 'show', false));

      this.assert.deepEqual(destroyed.slice().sort(), ['a', 'c'], 'only the removed branches');

      runTask(() => set(this.context, 'show', true));
      runTask(() => set(this.context, 'show', false));

      this.assert.deepEqual(
        destroyed.slice().sort(),
        ['a', 'a', 'c', 'c'],
        'the remaining component keeps its modifiers'
      );
    }
  }
);
