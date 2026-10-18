// gxt NATIVE layer: render scheduling on the backburner `render` queue
// (native/host-hooks.ts) — renderSettled (port of the classic
// render-settled-test cases), re-render passes for writes made during a pass,
// the _RERENDER_LOOP_LIMIT cap, and the DEV backtracking assertion.
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { ENV } from '@ember/-internals/environment';
import { renderSettled } from '@ember/renderer';
import { run, schedule } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { setupNativeRendering, textOf } from './-helpers';

const { module, test } = QUnit;

class State {
  @tracked foo = 'bar';
}

module('gxt-native | renderSettled', function (hooks) {
  setupNativeRendering(hooks);

  test('resolves when no rendering is happening', async function (assert) {
    await renderSettled();
    assert.ok(true, 'resolved even without rendering');
  });

  test('resolves when renderers exist but no run loops are triggered', async function (assert) {
    const state = new State();
    this.render(<template>{{state.foo}}</template>);
    await renderSettled();
    assert.strictEqual(textOf(this.element), 'bar');
  });

  test('does not create extraneous promises', async function (assert) {
    const first = renderSettled();
    const second = renderSettled();
    assert.strictEqual(first, second);
    await Promise.all([first, second]);
  });

  test('resolves when rendering has completed (after a tracked update outside a run loop)', async function (assert) {
    const state = new State();
    this.render(<template>{{state.foo}}</template>);
    assert.strictEqual(textOf(this.element), 'bar');
    state.foo = 'baz'; // autorun, not flushed synchronously
    assert.strictEqual(textOf(this.element), 'bar');
    await renderSettled();
    assert.strictEqual(textOf(this.element), 'baz');
  });

  test('resolves in the run loop once the renderer has settled', async function (assert) {
    assert.expect(3);
    const state = new State();
    this.render(<template>{{state.foo}}</template>);
    assert.strictEqual(textOf(this.element), 'bar');
    let promise;
    run(() => {
      schedule('actions', null, () => {
        state.foo = 'set in actions';
        promise = renderSettled().then(() => {
          assert.strictEqual(textOf(this.element), 'set in afterRender');
        });
        schedule('afterRender', null, () => {
          state.foo = 'set in afterRender';
        });
      });
      // still not updated here
      assert.strictEqual(textOf(this.element), 'bar');
    });
    await promise;
  });
});

module('gxt-native | render passes', function (hooks) {
  setupNativeRendering(hooks);

  test('a write made during a pass (new component constructor) is rendered in the same run loop', function (assert) {
    const shared = new (class {
      @tracked count = 0;
    })();
    class Bumper extends Component {
      constructor(owner, args) {
        super(owner, args);
        shared.count++;
      }
      <template><b>bumper</b></template>
    }
    let host;
    class Host extends Component {
      @tracked show = false;
      constructor(owner, args) {
        super(owner, args);
        host = this;
      }
      <template><i>{{shared.count}}</i>{{#if this.show}}<Bumper />{{/if}}</template>
    }
    this.render(Host);
    assert.strictEqual(textOf(this.element), '0');
    run(() => (host.show = true));
    assert.strictEqual(textOf(this.element), '1bumper', 'the pass that created Bumper was followed by one rendering its write');
  });

  test('passes per run loop are capped by ENV._RERENDER_LOOP_LIMIT', function (assert) {
    const s = new (class {
      @tracked x = 0;
      @tracked y = 0;
    })();
    let armed = false;
    class PingPong extends Component {
      get a() {
        const v = s.x;
        if (armed) s.y = v + 1; // read x, write y (consumed by `b` in an earlier pass)
        return v;
      }
      get b() {
        const v = s.y;
        if (armed) s.x = v + 1; // read y, write x
        return v;
      }
      <template>{{this.a}}|{{this.b}}</template>
    }
    this.render(PingPong);
    const limit = ENV._RERENDER_LOOP_LIMIT;
    ENV._RERENDER_LOOP_LIMIT = 10;
    armed = true;
    try {
      assert.throws(() => run(() => s.x++), /infinite rendering invalidation detected/);
    } finally {
      armed = false;
      ENV._RERENDER_LOOP_LIMIT = limit;
    }
    run(() => s.x++); // recovers: the next run loop renders normally
    assert.ok(/^\d+\|\d+$/.test(textOf(this.element)), 'still rendering after the cap');
  });

  test('DEV: updating a value already consumed in the same render throws the backtracking assertion', function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }
    class Bad extends Component {
      @tracked count = 0;
      get bump() {
        this.count = this.count + 1; // count was consumed just before, in this render
        return 'x';
      }
      <template>{{this.count}}{{this.bump}}</template>
    }
    assert.throws(
      () => this.render(Bad),
      /You attempted to update `count` on `.*`, but it had already been used previously in the same computation/
    );
    this.result = null;
    assert.strictEqual(this.element.innerHTML, '', 'the partial render was torn down');
  });

  test('DEV: the assertion also guards update passes (write after consume inside a pass)', function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }
    let armed = false;
    let instance;
    class Later extends Component {
      @tracked count = 0;
      @tracked trigger = 0;
      constructor(owner, args) {
        super(owner, args);
        instance = this;
      }
      get bump() {
        this.trigger; // dependency that starts the pass
        if (armed) this.count = this.count + 1;
        return '';
      }
      <template>{{this.count}}{{this.bump}}</template>
    }
    this.render(Later);
    armed = true;
    try {
      assert.throws(
        () => run(() => instance.trigger++),
        /You attempted to update `count`/
      );
    } finally {
      armed = false;
    }
  });
});
