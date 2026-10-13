// gxt NATIVE layer: the `{{on}}` modifier (native/runtime-helpers.ts `on`,
// driven by native/modifier-manager.ts) — Glimmer `on` semantics: one
// listener, re-attached only when the event name / handler identity / options
// change; once / capture / passive; argument asserts; removed with the element.
// Port of the classic `{{on}} Modifier` rendering tests to strict `.gjs`.
//
// P0a regression: under the compat bridge `{{on "click" this.increment}}` with a
// class-field arrow handler fired DURING render (+2 per click). Here the
// handler must never run during render and run exactly once per click.
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { fn } from '@ember/helper';
import { getInternalModifierManager } from '@glimmer/manager';
import { on } from '@ember/modifier';
import { run } from '@ember/runloop';
import { trackedArray } from '@ember/reactive/collections';
import { setupNativeRendering, textOf } from './-helpers';

const { module, test } = QUnit;

module('gxt-native | {{on}}', function (hooks) {
  setupNativeRendering(hooks);

  hooks.beforeEach(function () {
    this.startingCounters = getInternalModifierManager(on).counters;
    this.assertCounts = (assert, expected) => {
      assert.deepEqual(
        getInternalModifierManager(on).counters,
        {
          adds: expected.adds + this.startingCounters.adds,
          removes: expected.removes + this.startingCounters.removes,
        },
        `counters have incremented by ${JSON.stringify(expected)}`
      );
    };
    this.click = (selector = 'button') => run(() => this.element.querySelector(selector).click());
  });

  test('P0a: a class-field arrow handler fires exactly once per click, never during render', function (assert) {
    let counter;
    class Counter extends Component {
      @tracked count = 0;
      increment = () => this.count++;
      constructor(owner, args) {
        super(owner, args);
        counter = this;
      }
      <template><button {{on "click" this.increment}}>{{this.count}}</button></template>
    }
    this.render(Counter);
    assert.strictEqual(counter.count, 0, 'not called during the initial render');
    assert.strictEqual(textOf(this.element), '0');
    this.click();
    assert.strictEqual(counter.count, 1, 'once per click');
    assert.strictEqual(textOf(this.element), '1', 'the click re-rendered');
    this.click();
    this.click();
    assert.strictEqual(counter.count, 3);
    assert.strictEqual(textOf(this.element), '3');
    this.assertCounts(assert, { adds: 1, removes: 0 });
  });

  test('modern-app flow: a click pushes into a trackedArray; the {{#each}} renders the new row', function (assert) {
    class Cart {
      items = trackedArray([{ name: 'apple' }]);
      add(name) {
        this.items.push({ name });
      }
    }
    const cart = new Cart();
    class List extends Component {
      add = () => cart.add(`item-${cart.items.length}`);
      <template>
        <button {{on "click" this.add}}>+</button>
        <ul>{{#each cart.items as |item|}}<li>{{item.name}}</li>{{/each}}</ul>
        <p>{{cart.items.length}} items</p>
      </template>
    }
    this.render(List);
    assert.strictEqual(this.element.querySelectorAll('li').length, 1);
    this.click();
    assert.strictEqual(this.element.querySelector('p').textContent, '2 items');
    assert.deepEqual(
      [...this.element.querySelectorAll('li')].map((li) => li.textContent),
      ['apple', 'item-1'],
      'the in-place push re-synced the rows'
    );
  });

  test('unbound `on` (Ember strict-mode built-in keyword) behaves the same', function (assert) {
    let count = 0;
    let event;
    const handler = (evt) => {
      count++;
      event = evt;
    };
    const Root = <template><button {{on "click" handler}}>b</button></template>;
    this.render(Root);
    assert.strictEqual(count, 0);
    this.click();
    assert.strictEqual(count, 1);
    assert.strictEqual(event.target, this.element.querySelector('button'), 'receives the event');
    this.assertCounts(assert, { adds: 1, removes: 0 });
  });

  test('re-renders do not re-attach; a new handler identity does', function (assert) {
    const calls = [];
    let root;
    class Root extends Component {
      @tracked handler = () => calls.push('first');
      @tracked label = 'a';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><button {{on "click" this.handler}}>{{this.label}}</button></template>
    }
    this.render(Root);
    run(() => (root.label = 'b'));
    this.assertCounts(assert, { adds: 1, removes: 0 });
    run(() => (root.handler = () => calls.push('second')));
    this.assertCounts(assert, { adds: 2, removes: 1 });
    this.click();
    assert.deepEqual(calls, ['second'], 'only the new handler is attached');
  });

  test('fn partial application: a stable function (no re-attach) reading the latest args', function (assert) {
    const calls = [];
    let root;
    class Root extends Component {
      @tracked id = 1;
      @tracked label = 'x';
      select = (id, evt) => calls.push([id, evt.type]);
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><button {{on "click" (fn this.select this.id)}}>{{this.label}}</button></template>
    }
    this.render(Root);
    this.click();
    run(() => (root.label = 'y'));
    run(() => (root.id = 2));
    this.click();
    assert.deepEqual(calls, [
      [1, 'click'],
      [2, 'click'],
    ]);
    this.assertCounts(assert, { adds: 1, removes: 0 });
  });

  test('once=true: the callback runs only once; switching once=false → true re-attaches', function (assert) {
    let count = 0;
    let root;
    class Root extends Component {
      @tracked once = false;
      handler = () => count++;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><button {{on "click" this.handler once=this.once}}>b</button></template>
    }
    this.render(Root);
    this.click();
    this.click();
    assert.strictEqual(count, 2);
    run(() => (root.once = true));
    this.click();
    this.click();
    assert.strictEqual(count, 3, 'once');
    this.assertCounts(assert, { adds: 2, removes: 1 });
  });

  test('capture: true uses capture semantics; by default bubbling', function (assert) {
    const order = [];
    const outer = () => order.push('outer');
    const inner = () => order.push('inner');
    const Root = <template>
      <div {{on "click" outer capture=true}}><button {{on "click" inner}}>b</button></div>
    </template>;
    this.render(Root);
    this.click();
    assert.deepEqual(order, ['outer', 'inner'], 'the capturing ancestor runs first');
  });

  test('passive: calling preventDefault throws in development', function (assert) {
    let error;
    const handler = (evt) => {
      try {
        evt.preventDefault();
      } catch (e) {
        error = e;
      }
    };
    const Root = <template><button {{on "click" handler passive=true}}>b</button></template>;
    this.render(Root);
    this.click();
    assert.ok(/marked this listener as 'passive'/.test(error?.message), String(error?.message));
  });

  test('the listener is removed with its element', function (assert) {
    let root;
    let count = 0;
    class Root extends Component {
      @tracked show = true;
      handler = () => count++;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>{{#if this.show}}<button {{on "click" this.handler}}>b</button>{{/if}}</template>
    }
    this.render(Root);
    const buttonEl = this.element.querySelector('button');
    this.assertCounts(assert, { adds: 1, removes: 0 });
    run(() => (root.show = false));
    this.assertCounts(assert, { adds: 1, removes: 1 });
    run(() => buttonEl.click());
    assert.strictEqual(count, 0, 'a detached element no longer calls the handler');
  });

  test('`this` inside the handler is not the component (Glimmer untouchable this)', function (assert) {
    let error;
    class Root extends Component {
      handler() {
        try {
          this.anything;
        } catch (e) {
          error = e;
        }
      }
      <template><button {{on "click" this.handler}}>b</button></template>
    }
    this.render(Root);
    this.click();
    assert.ok(/You accessed `this.anything` from a function passed to the `on` modifier/.test(error?.message));
  });

  test('a missing callback throws a helpful error', function (assert) {
    const Root = <template><button {{on "click" undefined}}>b</button></template>;
    assert.throws(
      () => this.render(Root),
      /You must pass a function as the second argument to the `on` modifier; you passed undefined/
    );
  });

  test('extra positional arguments are rejected (use fn)', function (assert) {
    const handler = () => {};
    const Root = <template><button {{on "click" handler "extra"}}>b</button></template>;
    assert.throws(() => this.render(Root), /You can only pass two positional arguments/);
  });
});
