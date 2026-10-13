// gxt NATIVE layer: the public `renderComponent` from `@ember/renderer`
// (RFC 1099). Ports of the `Strict Mode - renderComponent` cases in
// glimmer/tests/integration/components/render-component-test.ts that need no
// runtime template compilation (`precompileTemplate` is G10/Inc 8) and no
// helpers/modifiers (Inc 5): `<template>` values are compiled by the gxt vite
// plugin instead.
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { trackedObject } from '@ember/reactive/collections';
import { destroy, registerDestructor } from '@ember/destroyable';
import { renderComponent } from '@ember/renderer';
import Service, { service } from '@ember/service';
import { run } from '@ember/runloop';
import { setupNativeRendering, htmlOf, textOf } from './-helpers';

const { module, test } = QUnit;

module('gxt-native | renderComponent', function (hooks) {
  setupNativeRendering(hooks);

  test('manually calling destroy cleans up the DOM', function (assert) {
    const Foo = <template>Hello, world!</template>;
    this.render(Foo);
    assert.strictEqual(this.element.innerHTML, 'Hello, world!');
    run(() => this.result.destroy());
    this.result = null;
    assert.strictEqual(this.element.innerHTML, '');
  });

  test('multiple components have independent lifetimes', function (assert) {
    class State {
      @tracked showSecond = true;
    }
    const state = new State();
    const Foo = <template>Hello, world!</template>;
    const Root = <template><Foo />{{#if state.showSecond}}<Foo />{{/if}}</template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'Hello, world!Hello, world!');
    run(() => (state.showSecond = false));
    assert.strictEqual(textOf(this.element), 'Hello, world!');
  });

  test('when args are trackedObject, the rendered component responds', function (assert) {
    const args = trackedObject({ foo: 2 });
    const Root = <template>{{@foo}}</template>;
    this.render(Root, args);
    assert.strictEqual(textOf(this.element), '2');
    run(() => args.foo++);
    assert.strictEqual(textOf(this.element), '3');
  });

  test('when args are a custom tracked class, the rendered component responds (classic: @skip)', function (assert) {
    class Args {
      @tracked foo = 2;
    }
    const args = new Args();
    const Root = <template>{{@foo}}</template>;
    this.render(Root, args);
    run(() => args.foo++);
    assert.strictEqual(textOf(this.element), '3');
  });

  test('can render in to a detached element', function (assert) {
    const Inner = <template>hello there</template>;
    const element = document.createElement('div');
    let attach;
    class Root extends Component {
      @tracked attached;
      constructor(owner, args) {
        super(owner, args);
        const result = renderComponent(Inner, { into: element });
        attach = () => (this.attached = element);
        registerDestructor(this, () => result.destroy());
      }
      <template>{{this.attached}}</template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), '');
    run(() => attach());
    assert.strictEqual(htmlOf(this.element), '<div>hello there</div>');
  });

  test('replaces existing contents within the target element', function (assert) {
    const Inner = <template>hello there</template>;
    const element = document.createElement('div');
    element.innerHTML = 'general kenobi';
    let result;
    run(() => (result = renderComponent(Inner, { into: element })));
    assert.strictEqual(element.innerHTML, 'hello there');
    run(() => result.destroy());
    assert.strictEqual(element.innerHTML, '');
  });

  test('rendering again into the same element replaces the previous render', function (assert) {
    const B = <template>second</template>;
    const element = document.createElement('div');
    let destroyedA = false;
    class AClass extends Component {
      willDestroy() {
        destroyedA = true;
      }
      <template>first-class</template>
    }
    let second;
    run(() => renderComponent(AClass, { into: element }));
    assert.strictEqual(element.innerHTML, 'first-class');
    run(() => (second = renderComponent(B, { into: element })));
    assert.strictEqual(element.innerHTML, 'second');
    assert.true(destroyedA, 'the previous render was destroyed');
    run(() => second.destroy());
    assert.strictEqual(element.innerHTML, '');
  });

  test('a render requested while a root of the same owner renders comes right after that root', function (assert) {
    const element = document.createElement('div');
    const Inner = <template>inner</template>;
    let queued;
    let duringRoot;
    class Root extends Component {
      constructor(owner, args) {
        super(owner, args);
        queued = renderComponent(Inner, { into: element, owner });
        duringRoot = element.innerHTML;
      }
      <template>{{element}}</template>
    }
    this.render(Root);
    assert.strictEqual(duringRoot, '', 'not rendered while the root renders (Glimmer queues it)');
    assert.strictEqual(htmlOf(this.element), '<div>inner</div>');
    run(() => queued.destroy());
    assert.strictEqual(htmlOf(this.element), '<div></div>', 'a queued render can be destroyed');
  });

  test('a queued render stays next to a later render into the same element, until its owner is destroyed', function (assert) {
    const element = document.createElement('div');
    const data = trackedObject({ count: 1 });
    let destroyedQueued = false;
    class Queued extends Component {
      willDestroy() {
        destroyedQueued = true;
      }
      <template>q{{data.count}}</template>
    }
    const Later = <template>l{{data.count}}</template>;
    let later;
    class Root extends Component {
      constructor(owner, args) {
        super(owner, args);
        renderComponent(Queued, { into: element, owner });
        later = renderComponent(Later, { into: element });
      }
      <template>root</template>
    }
    this.render(Root);
    assert.strictEqual(htmlOf(element), 'l1q1', 'the queued render is added after the later one');
    run(() => data.count++);
    assert.strictEqual(htmlOf(element), 'l2q2', 'both stay reactive');
    run(() => later.destroy());
    assert.strictEqual(htmlOf(element), 'q2');
    run(() => destroy(this.owner));
    assert.strictEqual(htmlOf(element), '', 'the owner tears the queued render down');
    assert.true(destroyedQueued);
  });

  test('a render requested again by its reader replaces the previous render in place', function (assert) {
    const element = document.createElement('div');
    const data = trackedObject({ count: 1 });
    const owner = this.owner;
    let calls = 0;
    const Queued = <template>q</template>;
    const Later = <template>l{{data.count}}</template>;
    // a helper that renders: it depends on what its render read (Glimmer
    // consumes the render's reads into the helper's frame), so it runs again
    function render(Comp, renderOwner) {
      calls++;
      renderComponent(Comp, { into: element, owner: renderOwner });
    }
    const Root = <template>{{render Queued owner}}{{render Later}}{{element}}</template>;
    this.render(Root);
    assert.strictEqual(htmlOf(element), 'l1q');
    assert.strictEqual(calls, 2);
    run(() => data.count++);
    assert.strictEqual(calls, 3, 'the helper rendering `Later` ran again');
    assert.strictEqual(htmlOf(element), 'l2q', 'the new render took the previous one\'s place');
  });

  test('multiple renderComponents share reactivity', function (assert) {
    const args = trackedObject({ foo: 2 });
    const InnerOne = <template>{{@foo}}</template>;
    const InnerTwo = <template>{{@foo}}</template>;
    const element1 = document.createElement('div');
    const element2 = document.createElement('div');
    element1.setAttribute('data-one', '');
    element2.setAttribute('data-two', '');
    class Root extends Component {
      constructor(owner, a) {
        super(owner, a);
        const result1 = renderComponent(InnerOne, { into: element1, args });
        const result2 = renderComponent(InnerTwo, { into: element2, args });
        registerDestructor(this, () => {
          result1.destroy();
          result2.destroy();
        });
      }
      <template>{{element1}}{{element2}}</template>
    }
    this.render(Root);
    assert.strictEqual(htmlOf(this.element), '<div data-one="">2</div><div data-two="">2</div>');
    run(() => args.foo++);
    assert.strictEqual(htmlOf(this.element), '<div data-one="">3</div><div data-two="">3</div>');
  });

  test('multiple renderComponents share service injection (owner per render)', function (assert) {
    class State extends Service {
      @tracked foo = 2;
    }
    this.owner.register('service:state', State);
    class One extends Component {
      @service state;
      <template>{{this.state.foo}}</template>
    }
    class Two extends Component {
      @service state;
      <template>{{this.state.foo}}</template>
    }
    const element1 = document.createElement('div');
    const element2 = document.createElement('div');
    class Root extends Component {
      constructor(owner, a) {
        super(owner, a);
        const result1 = renderComponent(One, { into: element1, owner });
        const result2 = renderComponent(Two, { into: element2, owner });
        registerDestructor(this, () => {
          result1.destroy();
          result2.destroy();
        });
      }
      <template>{{element1}}{{element2}}</template>
    }
    this.render(Root);
    assert.strictEqual(htmlOf(this.element), '<div>2</div><div>2</div>');
    run(() => this.owner.lookup('service:state').foo++);
    assert.strictEqual(htmlOf(this.element), '<div>3</div><div>3</div>');
  });

  test('without an owner option the default owner object reaches the component', function (assert) {
    let seenOwner;
    class Needy extends Component {
      constructor(owner, args) {
        super(owner, args);
        seenOwner = owner;
      }
      <template>x</template>
    }
    const element = document.createElement('div');
    let result;
    run(() => (result = renderComponent(Needy, { into: element })));
    assert.strictEqual(element.textContent, 'x');
    assert.ok(seenOwner && typeof seenOwner === 'object', 'an owner object (RFC default `{}`)');
    run(() => result.destroy());
  });
});
