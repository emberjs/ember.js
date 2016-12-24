import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import {
  instrumentationSubscribe,
  instrumentationReset,
  set
} from 'ember-metal';

moduleFor('Components instrumentation', class extends RenderingTest {
  constructor() {
    super();

    this.resetEvents();

    instrumentationSubscribe('render.component', {
      before: (name, timestamp, payload) => {
        if (payload.view !== this.component) {
          this.actual.before.push(payload);
        }
      },
      after: (name, timestamp, payload) => {
        if (payload.view !== this.component) {
          this.actual.after.push(payload);
        }
      }
    });
  }

  resetEvents() {
    this.expected = {
      before: [],
      after: []
    };

    this.actual = {
      before: [],
      after: []
    };
  }

  teardown() {
    this.assert.deepEqual(this.actual.before, [], 'No unexpected events (before)');
    this.assert.deepEqual(this.actual.after, [], 'No unexpected events (after)');
    super.teardown();
    instrumentationReset();
  }

  ['@test zomg'](assert) { assert.ok(true); }

  ['@test it should receive an instrumentation event for both initial render and updates'](assert) {
    let testCase = this;

    let BaseClass = Component.extend({
      tagName: '',

      willRender() {
        testCase.expected.before.push(this);
        testCase.expected.after.unshift(this);
      }
    });

    this.registerComponent('x-bar', {
      template: '[x-bar: {{bar}}] {{yield}}',
      ComponentClass: BaseClass.extend()
    });

    this.registerComponent('x-baz', {
      template: '[x-baz: {{baz}}]',
      ComponentClass: BaseClass.extend()
    });

    this.registerComponent('x-bat', {
      template: '[x-bat: {{bat}}]',
      ComponentClass: BaseClass.extend()
    });

    this.render(`[-top-level: {{foo}}] {{#x-bar bar=bar}}{{x-baz baz=baz}}{{/x-bar}} {{x-bat bat=bat}}`, {
      foo: 'foo', bar: 'bar', baz: 'baz', bat: 'bat'
    });

    this.assertText('[-top-level: foo] [x-bar: bar] [x-baz: baz] [x-bat: bat]');

    this.assertEvents('after initial render', true);

    this.runTask(() => this.rerender());

    this.assertEvents('after no-op rerender');

    this.runTask(() => set(this.context, 'foo', 'FOO'));

    this.assertEvents('after updating top-level');

    this.runTask(() => set(this.context, 'baz', 'BAZ'));

    this.assertEvents('after updating inner-most');

    this.runTask(() => {
      set(this.context, 'bar', 'BAR');
      set(this.context, 'bat', 'BAT');
    });

    this.assertEvents('after updating the rest');

    this.runTask(() => {
      set(this.context, 'foo', 'FOO');
      set(this.context, 'bar', 'BAR');
      set(this.context, 'baz', 'BAZ');
      set(this.context, 'bat', 'BAT');
    });

    this.assertEvents('after reset');
  }

  assertEvents(label, initialRender = false) {
    let { actual, expected } = this;

    this.assert.strictEqual(actual.before.length, actual.after.length, `${label}: before and after callbacks should be balanced`);

    this._assertEvents(`${label} (before):`, actual.before, expected.before, initialRender);
    this._assertEvents(`${label} (after):`, actual.before, expected.before, initialRender);

    this.resetEvents();
  }

  _assertEvents(label, actual, expected, initialRender) {
    this.assert.equal(actual.length, expected.length, `${label}: expected ${expected.length} and got ${actual.length}`);

    actual.forEach((payload, i) => this.assertPayload(payload, expected[i], initialRender));
  }

  assertPayload(payload, component, initialRender) {
    this.assert.equal(payload.object, component.toString(), 'payload.object');
    this.assert.ok(payload.containerKey, 'the container key should be present');
    this.assert.equal(payload.containerKey, component._debugContainerKey, 'payload.containerKey');
    this.assert.equal(payload.view, component, 'payload.view');
    this.assert.strictEqual(payload.initialRender, initialRender, 'payload.initialRender');
  }
});
