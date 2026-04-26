import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { Component } from '../utils/helpers';

moduleFor(
  'Path expression this-binding for class methods',
  class extends RenderingTestCase {
    ['@test this.foo maintains this binding'](assert) {
      let instance;
      let seenThis;

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          instance = this;
        }

        foo() {
          seenThis = this;
        }

        <template><button type="button" {{on "click" this.foo}}>click me</button></template>
      }

      this.render(`<this.Demo />`, { Demo });

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

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          this.obj = new Inner();
        }

        <template><button type="button" {{on "click" this.obj.method}}>click me</button></template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.ok(innerInstance, 'inner instance was captured');

      runTask(() => this.$('button').click());

      assert.strictEqual(
        seenThis,
        innerInstance,
        '`this` inside the nested method should be the inner object instance'
      );
    }
    ['@test #let block param preserves this binding on method access'](assert) {
      let innerInstance;
      let seenThis;
      let receivedArg;

      class Inner {
        constructor() {
          innerInstance = this;
        }

        method(arg) {
          seenThis = this;
          receivedArg = arg;
        }
      }

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          this.obj = new Inner();
        }

        <template>
          {{#let this.obj as |o|}}
            <button type="button" {{on "click" (fn o.method "did it")}}>click me</button>
          {{/let}}
        </template>
      }

      this.render(`<this.Demo />`, { Demo });

      assert.ok(innerInstance, 'inner instance was captured');

      runTask(() => this.$('button').click());

      assert.strictEqual(
        seenThis,
        innerInstance,
        '`this` inside o.method should be the inner object instance'
      );
      assert.strictEqual(receivedArg, 'did it', 'argument from fn is passed through');
    }

    ['@test each over array of objects preserves this binding on item methods'](assert) {
      let seenPairs = [];

      class Item {
        constructor(name) {
          this.name = name;
        }

        greet() {
          seenPairs.push({ self: this, name: this.name });
        }
      }

      let items = [new Item('alice'), new Item('bob'), new Item('carol')];

      class Demo extends Component {
        constructor(...args) {
          super(...args);
          this.items = items;
        }

        <template>
          {{#each this.items as |item|}}
            <button type="button" class={{item.name}} {{on "click" item.greet}}>{{item.name}}</button>
          {{/each}}
        </template>
      }

      this.render(`<this.Demo />`, { Demo });

      runTask(() => this.$('button.alice').click());
      runTask(() => this.$('button.bob').click());
      runTask(() => this.$('button.carol').click());

      assert.strictEqual(seenPairs.length, 3, 'all three handlers fired');
      assert.strictEqual(seenPairs[0].self, items[0], 'alice: this is the Item instance');
      assert.strictEqual(seenPairs[0].name, 'alice', 'alice: this.name is correct');
      assert.strictEqual(seenPairs[1].self, items[1], 'bob: this is the Item instance');
      assert.strictEqual(seenPairs[1].name, 'bob', 'bob: this.name is correct');
      assert.strictEqual(seenPairs[2].self, items[2], 'carol: this is the Item instance');
      assert.strictEqual(seenPairs[2].name, 'carol', 'carol: this.name is correct');
    }
  }
);
