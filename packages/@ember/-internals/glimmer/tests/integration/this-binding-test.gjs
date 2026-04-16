import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { on } from '@ember/modifier';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import { Component } from '../utils/helpers';

moduleFor(
  'Path expression this-binding for class methods',
  class extends RenderingTestCase {
    ['@test this.foo maintains this binding'](assert) {
      let instance;
      let seenThis;

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
          precompileTemplate(
            '<button type="button" {{on "click" this.foo}}>click me</button>',
            { strictMode: true, scope: () => ({ on }) }
          ),
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

    ['@test this.obj.method maintains this binding through property chain'](assert) {
      let innerInstance;
      let seenThis;

      class Inner {
        constructor() {
          innerInstance = this;
        }

        method() {
          seenThis = this;
        }
      }

      let DemoComponent = class extends Component {
        init() {
          super.init(...arguments);
          this.obj = new Inner();
        }
      };

      this.owner.register(
        'component:demo-el',
        setComponentTemplate(
          precompileTemplate(
            '<button type="button" {{on "click" this.obj.method}}>click me</button>',
            { strictMode: true, scope: () => ({ on }) }
          ),
          DemoComponent
        )
      );

      this.render('{{demo-el}}');

      assert.ok(innerInstance, 'inner instance was captured');

      runTask(() => this.$('button').click());

      assert.strictEqual(
        seenThis,
        innerInstance,
        '`this` inside the nested method should be the inner object instance'
      );
    }
  }
);
