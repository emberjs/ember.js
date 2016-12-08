import { RenderingTest, moduleFor } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import {
  setDebuggerCallback,
  resetDebuggerCallback
} from '../../../helpers/debugger';
import { set } from 'ember-metal';
import { A as emberA } from 'ember-runtime';

// This file is generally not I-N-U-R tested, because the {{debugger}} helper currently
// does not run during re-render. This is something we eventually want to do, and when
// we implement that feature these tests should be updated accordingly.

moduleFor('Helpers test: {{debugger}}', class extends RenderingTest {
  teardown() {
    super.teardown();
    resetDebuggerCallback();
  }

  expectDebuggerCallback(callback, debuggerCallback, times = 1) {
    let called = 0;

    setDebuggerCallback((context, get) => {
      called++;
      debuggerCallback(context, get);
    });

    callback();

    this.assert.strictEqual(called, times, `Expect debugger callback to be called exactly ${times} time(s)`);
  }

  expectNoDebuggerCallback(callback) {
    let called = 0;

    setDebuggerCallback(() => called++);

    callback();

    this.assert.strictEqual(called, 0, 'Expect no debugger callback');
  }

  ['@test should have the right context when used in a component layout'](assert) {
    let instance;

    this.registerComponent('my-wrapper', {
      template: `{{yield}}`
    });

    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        init() {
          this._super();
          instance = this;
        }
      }),
      template: `{{debugger}}foo-bar`
    });

    this.expectDebuggerCallback(
      () => {
        this.render('{{#my-wrapper}}{{foo-bar}}{{/my-wrapper}}');
      },

      context => {
        assert.strictEqual(context, instance, 'context should be the component instance');
      }
    );

    this.assertText('foo-bar');

    this.expectNoDebuggerCallback(
      ()=> this.runTask(() => this.rerender())
    );

    this.assertText('foo-bar');
  }

  ['@test should have the right context when yielded'](assert) {
    let instance;

    this.registerComponent('my-wrapper', {
      template: `{{yield}}`
    });

    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        init() {
          this._super();
          instance = this;
        }
      }),
      template: `{{#my-wrapper}}{{debugger}}foo-bar{{/my-wrapper}}`
    });

    this.expectDebuggerCallback(
      () => {
        this.render('{{foo-bar}}');
      },

      context => {
        assert.strictEqual(context, instance, 'context should be the component instance');
      }
    );

    this.assertText('foo-bar');

    this.expectNoDebuggerCallback(
      ()=> this.runTask(() => this.rerender())
    );

    this.assertText('foo-bar');
  }

  ['@test should be called once per iteration in a loop'](assert) {
    let count = 0;

    setDebuggerCallback(() => count++);

    let items = emberA([1, 2, 3, 4, 5]);

    this.render('{{#each items as |item|}}{{debugger}}[{{item}}]{{/each}}', { items });

    this.assertText('[1][2][3][4][5]');

    assert.equal(count, 5, 'should have fired once per iteration');

    count = 0;

    this.runTask(() => this.rerender());

    this.assertText('[1][2][3][4][5]');

    assert.strictEqual(count, 0, 'should not fire for re-render');

    count = 0;

    this.runTask(() => items.pushObjects([6, 7, 8]));

    this.assertText('[1][2][3][4][5][6][7][8]');

    assert.equal(count, 3, 'should fire once per new items added to the loop');
  }

  ['@test could `get` properties from "self"'](assert) {
    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        init() {
          this._super();
          this.zomg = 'zomg';
        }
      }),
      template: `{{debugger not.here}}foo-bar`
    });

    this.expectDebuggerCallback(
      () => {
        this.render('{{foo-bar lol="lol" foo=foo}}', { foo: { bar: { baz: 'fooBarBaz' } } });
      },

      (context, get) => {
        assert.equal(get('this'), context, '{{this}}');

        assert.equal(get('lol'), 'lol', '{{lol}}');
        assert.equal(get('this.lol'), 'lol', '{{this.lol}}');

        assert.equal(get('zomg'), 'zomg', '{{zomg}}');
        assert.equal(get('this.zomg'), 'zomg', '{{this.zomg}}');

        assert.equal(get('foo.bar.baz'), 'fooBarBaz', '{{foo.bar.baz}}');
        assert.equal(get('this.foo.bar.baz'), 'fooBarBaz', '{{this.foo.bar.baz}}');

        assert.strictEqual(get('nope'), undefined, '{{nope}}');
        assert.strictEqual(get('this.nope'), undefined, '{{this.nope}}');

        assert.strictEqual(get('not.here'), undefined, '{{not.here}}');
        assert.strictEqual(get('this.not.here'), undefined, '{{this.not.here}}');
      }
    );

    this.assertText('foo-bar');

    this.expectNoDebuggerCallback(
      ()=> this.runTask(() => this.rerender())
    );

    this.assertText('foo-bar');
  }

  ['@test could `get` local variables'](assert) {
    let obj = {
      foo: 'foo',
      bar: { baz: { bat: 'barBazBat' } }
    };

    this.expectDebuggerCallback(
      () => {
        this.render('{{#each-in obj as |key value|}}{{debugger}}[{{key}}]{{/each-in}}', { obj });
      },

      (context, get) => {
        assert.equal(get('this'), context, '{{this}}');

        assert.equal(get('obj'), obj);

        // Glimmer bug:
        // assert.strictEqual(get('this.key'), undefined, '{{this.key}}');
        // assert.strictEqual(get('this.value'), undefined, '{{this.value}}');

        let key = get('key');

        if (key === 'foo') {
          assert.equal(get('value'), 'foo', '{{value}} for key=foo');
          assert.strictEqual(get('value.baz.bat'), undefined, '{{value.baz.bat}} for key=foo');
          assert.strictEqual(get('value.nope'), undefined, '{{value.nope}} for key=foo');
        } else if (key === 'bar') {
          assert.equal(get('value'), obj.bar, '{{value}} for key=bar');
          assert.equal(get('value.baz.bat'), 'barBazBat', '{{value.baz.bat}} for key=bar');
          assert.strictEqual(get('value.nope'), undefined, '{{value.nope}} for key=bar');
        } else {
          assert.ok(false, `Unknown key: ${key}`);
        }
      },

      2
    );

    this.assertText('[foo][bar]');

    this.expectNoDebuggerCallback(
      ()=> this.runTask(() => this.rerender())
    );

    this.assertText('[foo][bar]');

    this.expectDebuggerCallback(
      () => {
        this.runTask(() => set(obj, 'baz', 'baz'));
      },

      (context, get) => {
        assert.equal(get('this'), context, '{{this}}');

        assert.equal(get('obj'), obj);

        assert.strictEqual(get('this.key'), undefined, '{{this.key}}');
        assert.strictEqual(get('this.value'), undefined, '{{this.value}}');

        assert.equal(get('key'), 'baz', '{{key}} for key=baz');
        assert.equal(get('value'), 'baz', '{{value}} for key=baz');
        assert.strictEqual(get('value.baz.bat'), undefined, '{{value.baz.bat}} for key=baz');
        assert.strictEqual(get('value.nope'), undefined, '{{value.nope}} for key=baz');
      }
    );

    this.assertText('[foo][bar][baz]');

    this.expectNoDebuggerCallback(
      ()=> this.runTask(() => this.rerender())
    );

    this.assertText('[foo][bar][baz]');
  }

});
