import { moduleFor, RenderingTestCase, runTask, defineSimpleModifier } from 'internal-test-helpers';

import { schedule } from '@ember/runloop';
import { set } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import Component from '@glimmer/component';

moduleFor(
  'Run loop and lifecycle hooks',
  class extends RenderingTestCase {
    ['@test afterRender set']() {
      let ComponentClass = class extends Component {
        @tracked width = '5';

        inserted = defineSimpleModifier(() => {
          schedule('afterRender', () => {
            this.width = '10';
          });
        });
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div {{this.inserted}}>{{this.width}}</div>'),
          ComponentClass
        )
      );

      this.render('{{foo-bar}}');

      this.assertText('10');

      runTask(() => this.rerender());

      this.assertText('10');
    }

    ['@test afterRender set on parent']() {
      let ComponentClass = class extends Component {
        inserted = defineSimpleModifier(() => {
          schedule('afterRender', () => {
            set(this.args.parent, 'foo', 'wat');
          });
        });
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div {{this.inserted}}>{{@foo}}</div>'),
          ComponentClass
        )
      );

      this.render('{{foo-bar parent=this foo=this.foo}}');

      this.assertText('wat');

      runTask(() => this.rerender());

      this.assertText('wat');
    }

    ['@test lifecycle hooks are invoked in a predictable order'](assert) {
      let hooks = [];

      let componentClass = (name) =>
        class extends Component {
          constructor(owner, args) {
            super(owner, args);
            hooks.push(`${name}: constructor`);
          }

          modifier = defineSimpleModifier(() => {
            hooks.push(`${name}: modifier installed`);

            return () => hooks.push(`${name}: modifier destroyed`);
          });

          willDestroy() {
            super.willDestroy();
            hooks.push(`${name}: willDestroy`);
          }
        };

      this.owner.register(
        'component:the-top',
        setComponentTemplate(
          precompileTemplate(
            '<div {{this.modifier}}>{{the-middle value=@value}}{{the-sibling}}</div>'
          ),
          componentClass('the-top')
        )
      );

      this.owner.register(
        'component:the-middle',
        setComponentTemplate(
          precompileTemplate('<div {{this.modifier}}>{{the-bottom value=@value}}</div>'),
          componentClass('the-middle')
        )
      );

      this.owner.register(
        'component:the-bottom',
        setComponentTemplate(
          precompileTemplate('<div {{this.modifier}}>{{@value}}</div>'),
          componentClass('the-bottom')
        )
      );

      this.owner.register(
        'component:the-sibling',
        setComponentTemplate(
          precompileTemplate('<div {{this.modifier}}></div>'),
          componentClass('the-sibling')
        )
      );

      this.render('{{#if this.show}}{{the-top value=this.value}}{{/if}}', {
        show: true,
        value: 1,
      });

      this.assertText('1');

      assert.deepEqual(
        hooks,
        [
          'the-top: constructor',
          'the-middle: constructor',
          'the-bottom: constructor',
          'the-sibling: constructor',
          'the-bottom: modifier installed',
          'the-middle: modifier installed',
          'the-sibling: modifier installed',
          'the-top: modifier installed',
        ],
        'initial render'
      );

      hooks = [];

      runTask(() => this.rerender());

      assert.deepEqual(hooks, [], 'a rerender without changes runs no hook');

      runTask(() => set(this.context, 'value', 2));

      this.assertText('2');

      assert.deepEqual(hooks, [], 'an argument update runs no hook');

      runTask(() => set(this.context, 'show', false));

      this.assertText('');

      assert.deepEqual(
        hooks,
        [
          'the-bottom: modifier destroyed',
          'the-middle: modifier destroyed',
          'the-sibling: modifier destroyed',
          'the-top: modifier destroyed',
          'the-top: willDestroy',
          'the-middle: willDestroy',
          'the-bottom: willDestroy',
          'the-sibling: willDestroy',
        ],
        'destroy'
      );
    }
  }
);
