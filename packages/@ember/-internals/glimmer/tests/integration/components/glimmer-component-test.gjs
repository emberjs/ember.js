import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

class Toggle {
  @tracked isShowing = true;
}

class Label {
  @tracked text = 'first';
}

moduleFor(
  'Components test: @glimmer/component',
  class extends RenderingTestCase {
    '@test isDestroying and isDestroyed transition as the component is torn down'(assert) {
      let toggle = new Toggle();
      let instance;

      class Subject extends Component {
        constructor() {
          super(...arguments);
          instance = this;
          assert.step(
            `constructor: isDestroying=${this.isDestroying} isDestroyed=${this.isDestroyed}`
          );
        }

        willDestroy() {
          super.willDestroy();
          assert.step(
            `willDestroy: isDestroying=${this.isDestroying} isDestroyed=${this.isDestroyed}`
          );
        }

        <template>subject</template>
      }

      const Root = <template>{{#if toggle.isShowing}}<Subject />{{/if}}</template>;

      this.renderComponent(Root, { expect: 'subject' });

      assert.verifySteps(['constructor: isDestroying=false isDestroyed=false']);
      assert.false(instance.isDestroying, 'isDestroying is false while rendered');
      assert.false(instance.isDestroyed, 'isDestroyed is false while rendered');

      runTask(() => (toggle.isShowing = false));

      this.assertText('');
      assert.verifySteps(['willDestroy: isDestroying=true isDestroyed=false']);
      assert.true(instance.isDestroying, 'isDestroying is true after teardown');
      assert.true(instance.isDestroyed, 'isDestroyed is true after teardown');
    }

    '@test tracked state and args are reactive without re-constructing the component'(assert) {
      let label = new Label();
      let instance;

      class Subject extends Component {
        @tracked count = 0;

        constructor() {
          super(...arguments);
          instance = this;
          assert.step('constructor');
        }

        <template>{{@text}}-{{this.count}}</template>
      }

      const Root = <template><Subject @text={{label.text}} /></template>;

      this.renderComponent(Root, { expect: 'first-0' });

      assert.verifySteps(['constructor']);

      runTask(() => instance.count++);

      this.assertText('first-1');

      runTask(() => (label.text = 'second'));

      this.assertText('second-1');
      assert.verifySteps([], 'the component updated in place rather than being re-constructed');
    }

    '@test re-mounting constructs a new instance and leaves the old one destroyed'(assert) {
      let toggle = new Toggle();
      let instances = [];

      class Subject extends Component {
        constructor() {
          super(...arguments);
          instances.push(this);
          assert.step(`constructor: ${instances.length}`);
        }

        willDestroy() {
          super.willDestroy();
          assert.step(`willDestroy: ${instances.indexOf(this) + 1}`);
        }

        <template>subject</template>
      }

      const Root = <template>{{#if toggle.isShowing}}<Subject />{{/if}}</template>;

      this.renderComponent(Root, { expect: 'subject' });

      assert.verifySteps(['constructor: 1']);

      runTask(() => (toggle.isShowing = false));

      this.assertText('');
      assert.verifySteps(['willDestroy: 1']);

      runTask(() => (toggle.isShowing = true));

      this.assertText('subject');
      assert.verifySteps(['constructor: 2']);

      assert.strictEqual(instances.length, 2, 'a second instance was constructed');
      assert.notStrictEqual(instances[0], instances[1], 'the instances are distinct');
      assert.true(instances[0].isDestroyed, 'the first instance stayed destroyed');
      assert.false(instances[1].isDestroying, 'the second instance is not destroying');
      assert.false(instances[1].isDestroyed, 'the second instance is not destroyed');

      runTask(() => (toggle.isShowing = false));

      this.assertText('');
      assert.verifySteps(['willDestroy: 2']);
      assert.true(instances[1].isDestroyed, 'the second instance was destroyed in turn');
    }
  }
);
