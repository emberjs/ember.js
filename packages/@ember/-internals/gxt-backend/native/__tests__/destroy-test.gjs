// gxt NATIVE layer: component and render-root teardown. gxt's tree destruction
// runs the native manager's destructor → the Glimmer component manager's
// destroyComponent (willDestroy in `actions`, Ember destroy() in `destroy`), so
// Ember destroyables registered on a component run in the same run loop.
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { destroy, registerDestructor, isDestroying, isDestroyed } from '@ember/destroyable';
import { renderComponent } from '@ember/renderer';
import { run } from '@ember/runloop';
import { buildOwner } from 'internal-test-helpers';
import { setupNativeRendering, textOf } from './-helpers';

const { module, test } = QUnit;

module('gxt-native | destroy', function (hooks) {
  setupNativeRendering(hooks);

  test('{{#if}} removing a component: willDestroy, destructors, isDestroying/isDestroyed', function (assert) {
    let host;
    let child;
    class Child extends Component {
      constructor(owner, args) {
        super(owner, args);
        child = this;
        registerDestructor(this, () => assert.step('destructor'));
      }
      willDestroy() {
        assert.step(`willDestroy isDestroying=${this.isDestroying}`);
      }
      <template><span class="child">child</span></template>
    }
    class Host extends Component {
      @tracked show = true;
      constructor(owner, args) {
        super(owner, args);
        host = this;
      }
      <template>{{#if this.show}}<Child />{{/if}}</template>
    }
    this.render(Host);
    assert.strictEqual(this.element.querySelectorAll('.child').length, 1);
    assert.false(child.isDestroying);

    run(() => (host.show = false));

    assert.strictEqual(this.element.querySelectorAll('.child').length, 0, 'DOM removed');
    assert.verifySteps(['willDestroy isDestroying=true', 'destructor']);
    assert.true(child.isDestroying, 'isDestroying');
    assert.true(child.isDestroyed, 'isDestroyed');
    assert.true(isDestroyed(child), 'Ember destroyable state: destroyed');
  });

  test('re-showing the branch creates a fresh instance', function (assert) {
    let host;
    const made = [];
    class Child extends Component {
      constructor(owner, args) {
        super(owner, args);
        made.push(this);
      }
      <template>c</template>
    }
    class Host extends Component {
      @tracked show = true;
      constructor(owner, args) {
        super(owner, args);
        host = this;
      }
      <template>{{#if this.show}}<Child />{{/if}}</template>
    }
    this.render(Host);
    run(() => (host.show = false));
    run(() => (host.show = true));
    assert.strictEqual(made.length, 2);
    assert.true(made[0].isDestroyed);
    assert.false(made[1].isDestroying);
    assert.strictEqual(textOf(this.element), 'c');
  });

  test('destroying the render result destroys every component and removes the DOM', function (assert) {
    const destroyed = [];
    class Leaf extends Component {
      willDestroy() {
        destroyed.push(this.args.name);
      }
      <template><i>{{@name}}</i></template>
    }
    const Root = <template><Leaf @name="a" /><div><Leaf @name="b" /></div></template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'ab');
    run(() => this.result.destroy());
    this.result = null;
    assert.strictEqual(this.element.innerHTML, '', 'DOM removed');
    assert.deepEqual(destroyed.sort(), ['a', 'b']);
  });

  test('destroying the owner tears the render down (renderComponent RFC)', function (assert) {
    const owner = buildOwner();
    let leaf;
    class Leaf extends Component {
      constructor(o, args) {
        super(o, args);
        leaf = this;
      }
      <template>owned</template>
    }
    run(() => renderComponent(Leaf, { owner, into: this.element }));
    assert.strictEqual(textOf(this.element), 'owned');
    run(() => destroy(owner));
    assert.strictEqual(this.element.innerHTML, '');
    assert.true(isDestroying(leaf) && leaf.isDestroyed);
  });

  test('render-result destroy after the owner was destroyed is a no-op', function (assert) {
    const owner = buildOwner();
    let result;
    run(() => (result = renderComponent(<template>x</template>, { owner, into: this.element })));
    run(() => destroy(owner));
    run(() => result.destroy());
    assert.strictEqual(this.element.innerHTML, '');
  });
});
