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
  }
);
