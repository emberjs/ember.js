import { set } from '@ember/object';
import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { fn } from '@ember/helper';
import { helperCapabilities, setHelperManager } from '@glimmer/manager';
import { Component } from '../utils/helpers';

moduleFor(
  'function calls on normal functions retain JS "this" semantics',
  class extends RenderingTestCase {
    ['@test this.method()'](assert) {
      let instance;

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          instance = this;
          assert.step('captured:demo');
        }

        foo() {
          assert.step(`match:${instance && this === instance}`);
        }

        <template>{{(this.foo)}}</template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.verifySteps(['captured:demo', 'match:true'])
    }

    ['@test this.obj.method()'](assert) {
      let innerInstance;

      class Inner {
        constructor() {
          innerInstance = this;
          assert.step('captured:inner}');
        }

        method() {
          assert.step(`match:${innerInstance && this === innerInstance}`);
        }
      }

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          this.obj = new Inner();
        }

        <template>{{ (this.obj.method) }}</template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.verifySteps(['captured:inner', 'match:true'])
    }

    ['@test this.obj.method() when this.obj is entirely replaced'](assert) {
      let instance;
      let seenThis;

      class Inner {
        method() {
          seenThis = this;
        }
      }

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          instance = this;
          this.obj = new Inner();
        }

        <template>{{ (this.obj.method) }}</template>
      }

      this.render(`<this.Demo />`, { Demo });

      let first = instance.obj;
      assert.strictEqual(seenThis, first);

      let second = new Inner();
      runTask(() => set(instance, 'obj', second));

      assert.strictEqual(seenThis, second);
    }

    ['@test passing function references loses the "this"'](assert) {
      let instance;
      let seenThis;

      class Child extends Component {
        <template>{{ (@cb) }}</template>
      }

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          instance = this;
        }

        foo() {
          assert.step(`match:${this === instance}`);
        }

        <template><Child @cb={{this.foo}} /></template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.verifySteps(['match:false']);
    }

    ['@test aliasing through let does not confuse o.method() using "o" for "this"'](assert) {
      let innerInstance;
      let seenThis;
      let receivedArg;

      class Inner {
        constructor() {
          innerInstance = this;
        }

        method(arg) {
          assert.step(`match:${innerInstance && this === innerInstance}`);
        }
      }

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          this.obj = new Inner();
        }

        <template>
          {{#let this.obj as |o|}}
            {{(o.method "did it")}}
          {{/let}}
        </template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.verifySteps(['match:true']);
    }

    ['@test methods called on an iterated item, use the item as the "this"'](assert) {
      let seenPairs = [];

      class Item {
        constructor(name) {
          this.name = name;
        }

        greet() {
          assert.step(`greet:${this.name}`);
        }
      }

      let items = [new Item('alice'), new Item('bob'), new Item('carol')];

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          this.items = items;
        }

        <template>
          <ul>
            {{#each this.items as |item|}}
              <li>{{item.greet}}</li>
            {{/each}}
          </ul>
        </template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.verifySteps(['greet:alice', 'greet:bob', 'greet:carol']);
    }

    ['@test already-bound functions are unaffected'](assert) {
      let instance;
      let seenThis;

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          instance = this;
        }

        foo = () => {
          seenThis = this;
        };

        <template>{{this.foo}}</template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.strictEqual(seenThis, instance);
    }

    ['@test (fn) on methods still behaves appropriately'](assert) {
      let instance;
      let seenThis;

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          instance = this;
        }

        foo = () => {
          seenThis = this;
        };

        <template>
          {{#let (fn this.foo) as |fned|}}
            {{ (fned) }}
          {{/let}}
        </template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.strictEqual(seenThis, instance);
    }

    ['@test a function with a custom helper manager read off a path keeps its manager'](assert) {
      let sawDefinition;

      class MyHelperManager {
        capabilities = helperCapabilities('3.23', { hasValue: true });

        createHelper(definition, args) {
          return { definition, args };
        }

        getValue({ definition }) {
          sawDefinition = definition;
          return 'CUSTOM_MANAGER_RAN';
        }

        getDebugName() {
          return 'my-custom-helper';
        }
      }

      function customHelper() {
        return 'PLAIN_FN_RAN';
      }
      setHelperManager(() => new MyHelperManager(), customHelper);

      class Inner {
        customHelper = customHelper;
      }

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          this.obj = new Inner();
        }

        <template>{{(this.obj.customHelper)}}</template>
      }

      this.render(`<this.Demo />`, { Demo });

      this.assertText('CUSTOM_MANAGER_RAN');
      assert.strictEqual(
        sawDefinition,
        customHelper,
        // i.e.: a.foo !== a.foo.bind(a)
        'the custom manager received the original function, not a `.bind()` wrapper'
      );
    }

    ['@test a plain method passed through (fn) is not this-bound'](assert) {
      class Inner {
        method() {
          assert.verifySteps(`calledWith:${this}`);
        }
      }

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          this.obj = new Inner();
        }

        <template>{{#let (fn this.obj.method) as |f|}}{{(f)}}{{/let}}</template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.verifySteps('calledWith:null');
    }
  }
);
