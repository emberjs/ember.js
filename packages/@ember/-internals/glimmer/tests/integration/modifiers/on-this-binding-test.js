import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import { Component } from '../../utils/helpers';

moduleFor(
  '{{on}} Modifier | this-binding for class methods',
  class extends RenderingTestCase {
    ['@test a class method passed to {{on}} keeps its `this` context'](assert) {
      let instance;
      let seenThis = null;

      let DemoComponent = class extends Component {
        init() {
          super.init(...arguments);
          instance = this;
        }

        foo() {
          seenThis = this;
        }
      };

      this.owner.register(
        'component:demo-el',
        setComponentTemplate(
          precompileTemplate('<button type="button" {{on "click" this.foo}}>click me</button>', {
            strictMode: false,
          }),
          DemoComponent
        )
      );

      this.render('{{demo-el}}');

      assert.ok(instance, 'component instance was captured');

      runTask(() => this.$('button').click());

      assert.strictEqual(
        seenThis,
        instance,
        '`this` inside the class method should be the component instance'
      );
    }
  }
);
