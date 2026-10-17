/**
 * What user code throws while a template renders or updates reaches the code
 * that asked for the render (compat, GXT_MODE).
 *
 * Glimmer does not log an error of a helper, a condition, a binding or a
 * re-render and carry on: the render, or the revalidation of the run loop,
 * throws it.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { ApplicationTestCase, moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import EmberObject, { computed, get, set } from '@ember/object';
import ObjectProxy from '@ember/object/proxy';
import Component from '@ember/component';
import type Controller from '@ember/controller';
import Route from '@ember/routing/route';
import { run, _getCurrentRunLoop } from '@ember/runloop';
import { precompileTemplate } from '@ember/template-compilation';

const BoomClass = EmberObject.extend({
  init() {
    this._super(...arguments);
    throw new Error('the helper failed to initialize');
  },
  compute() {
    return 'computed';
  },
});

function boomFn(): never {
  throw new Error('the helper function failed');
}

moduleFor(
  'GXT errors: helpers resolved by name',
  class extends RenderingTestCase {
    ['@test what creating a helper class without a helper manager throws reaches the render'](
      assert: QUnit['assert']
    ) {
      this.owner.register('helper:boom-class', BoomClass);

      assert.throws(() => {
        this.render('{{boom-class}}');
      }, /the helper failed to initialize/);
    }

    ['@test ... also when the helper has arguments'](assert: QUnit['assert']) {
      this.owner.register('helper:boom-class', BoomClass);

      assert.throws(() => {
        this.render('{{boom-class "an argument"}}');
      }, /the helper failed to initialize/);
    }

    ['@test what a function registered as a helper throws reaches the render'](
      assert: QUnit['assert']
    ) {
      this.owner.register('helper:boom-fn', boomFn);

      assert.throws(() => {
        this.render('{{boom-fn}}');
      }, /the helper function failed/);
    }

    ['@test ... also when the function has arguments'](assert: QUnit['assert']) {
      this.owner.register('helper:boom-fn', boomFn);

      assert.throws(() => {
        this.render('{{boom-fn "an argument"}}');
      }, /the helper function failed/);
    }
  }
);

moduleFor(
  'GXT errors: {{#if}} conditions',
  class extends RenderingTestCase {
    ['@test what the truthiness of a condition throws after a change reaches the run loop'](
      assert: QUnit['assert']
    ) {
      const BoomProxy = ObjectProxy.extend({
        isTruthy: computed(function () {
          throw new Error('the truthiness failed');
        }),
      });

      this.render('{{#if this.value}}yes{{else}}no{{/if}}', { value: false });
      this.assertText('no');

      assert.throws(() => {
        runTask(() => set(this.context, 'value', BoomProxy.create({ content: {} })));
      }, /the truthiness failed/);
    }

    ['@test a condition that threw is not evaluated again by the sync of another change'](
      assert: QUnit['assert']
    ) {
      let reads = 0;
      const BoomProxy = ObjectProxy.extend({
        isTruthy: computed(function () {
          reads++;
          throw new Error('the truthiness failed');
        }),
      });

      this.render('[{{this.label}}]{{#if this.value}}yes{{else}}no{{/if}}', {
        label: 'a',
        value: false,
      });
      this.assertText('[a]no');

      assert.throws(() => {
        runTask(() => set(this.context, 'value', BoomProxy.create({ content: {} })));
      }, /the truthiness failed/);
      const readsAfterError = reads;

      runTask(() => set(this.context, 'label', 'b'));
      assert.strictEqual(reads, readsAfterError, 'the failed condition did not run again');
      assert.ok(this.element.textContent!.startsWith('[b]'), 'the other change rendered');
    }
  }
);

moduleFor(
  'GXT errors: the DOM sync at the end of a run loop',
  class extends RenderingTestCase {
    ['@test what the sync of a run loop throws reaches the code that ran the run loop'](
      assert: QUnit['assert']
    ) {
      const BoomProxy = ObjectProxy.extend({
        isTruthy: computed(function () {
          throw new Error('the truthiness failed');
        }),
      });

      this.render('{{#if this.value}}yes{{else}}no{{/if}}', { value: false });
      this.assertText('no');

      // A bare run loop (not `runTask`, which syncs after its run loop): the
      // sync runs at the end of the run loop.
      assert.throws(() => {
        run(() => set(this.context, 'value', BoomProxy.create({ content: {} })));
      }, /the truthiness failed/);
      assert.strictEqual(_getCurrentRunLoop(), null, 'the run loop has ended');
    }
  }
);

moduleFor(
  'GXT errors: attribute bindings of a classic component',
  class extends RenderingTestCase {
    ['@test what a bound property throws after a change reaches the run loop'](
      assert: QUnit['assert']
    ) {
      let instance: FooBar | undefined;
      class FooBar extends Component {
        _title = 'ok';
        get title(): string {
          if (this._title === 'boom') throw new Error('the bound property failed');
          return this._title;
        }
        set title(value: string) {
          this._title = value;
        }
        init() {
          super.init();
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          instance = this;
        }
      }
      FooBar.reopen({ attributeBindings: ['title'] });
      this.owner.register('component:foo-bar', FooBar);

      this.render('{{foo-bar}}');
      assert.strictEqual(this.$('div').attr('title'), 'ok');

      assert.throws(() => {
        runTask(() => set(instance!, 'title', 'boom'));
      }, /the bound property failed/);
    }
  }
);

moduleFor(
  "GXT errors: a change of a route controller's model",
  class extends ApplicationTestCase {
    async ['@test what re-rendering the route template throws reaches the run loop'](
      assert: QUnit['assert']
    ) {
      this.add(
        'component:foo-bar',
        class extends Component {
          destroy() {
            super.destroy();
            throw new Error('the teardown failed');
          }
        }
      );
      this.add(
        'route:application',
        class extends Route {
          model() {
            return { show: true };
          }
        }
      );
      this.add(
        'template:application',
        precompileTemplate('[{{#if this.model.show}}{{foo-bar}}{{/if}}]')
      );

      await this.visit('/');
      const controller = this.applicationInstance!.lookup('controller:application') as Controller;

      assert.throws(() => {
        runTask(() => set(controller, 'model', { show: false }));
      }, /the teardown failed/);
      this.assertText('[]');
    }
  }
);

// A classic component whose `didReceiveAttrs` throws once its `value` is
// 'boom'. An update runs the hook while it renders: what it throws is an error
// of the update, as Glimmer's curly component manager throws it from the
// revalidation of the run loop.
class ReceiveAttrsBoom extends Component {
  didReceiveAttrs() {
    super.didReceiveAttrs();
    if (get(this, 'value') === 'boom') throw new Error('didReceiveAttrs failed');
  }
}

moduleFor(
  'GXT errors: hook errors of an update',
  class extends RenderingTestCase {
    ["@test what an updated component's didReceiveAttrs throws reaches runTask"](
      assert: QUnit['assert']
    ) {
      this.owner.register('component:foo-bar', ReceiveAttrsBoom);
      this.render('{{foo-bar value=this.value}}', { value: 'ok' });

      assert.throws(() => {
        runTask(() => set(this.context, 'value', 'boom'));
      }, /didReceiveAttrs failed/);
    }

    ["@test what an updated component's didReceiveAttrs throws reaches a bare run loop"](
      assert: QUnit['assert']
    ) {
      this.owner.register('component:foo-bar', ReceiveAttrsBoom);
      this.render('{{foo-bar value=this.value}}', { value: 'ok' });

      // The sync runs at the end of the run loop (`runTask` syncs after it).
      assert.throws(() => {
        run(() => set(this.context, 'value', 'boom'));
      }, /didReceiveAttrs failed/);
      assert.strictEqual(_getCurrentRunLoop(), null, 'the run loop has ended');
    }

    ['@test what the constructor of a component in a new {{#if}} branch throws reaches runTask'](
      assert: QUnit['assert']
    ) {
      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init();
            throw new Error('init failed');
          }
        }
      );
      this.render('{{#if this.show}}{{foo-bar}}{{/if}}', { show: false });

      assert.throws(() => {
        runTask(() => set(this.context, 'show', true));
      }, /init failed/);
    }

    ['@test the next update after an update error renders and throws nothing'](
      assert: QUnit['assert']
    ) {
      this.owner.register('component:foo-bar', ReceiveAttrsBoom);
      this.render('[{{this.label}}]{{foo-bar value=this.value}}', { label: 'a', value: 'ok' });

      assert.throws(() => {
        runTask(() => set(this.context, 'value', 'boom'));
      }, /didReceiveAttrs failed/);

      runTask(() => {
        set(this.context, 'value', 'ok');
        set(this.context, 'label', 'b');
      });
      this.assertText('[b]');
    }
  }
);

moduleFor(
  'GXT errors: hook errors of an update of a route template',
  class extends ApplicationTestCase {
    async ["@test what an updated component's didReceiveAttrs throws reaches the change of the controller"](
      assert: QUnit['assert']
    ) {
      this.add('component:foo-bar', ReceiveAttrsBoom);
      this.add(
        'route:application',
        class extends Route {
          model() {
            return { value: 'ok' };
          }
        }
      );
      this.add('template:application', precompileTemplate('[{{foo-bar value=this.model.value}}]'));

      await this.visit('/');
      const controller = this.applicationInstance!.lookup('controller:application') as Controller;

      assert.throws(() => {
        runTask(() => set(controller, 'model', { value: 'boom' }));
      }, /didReceiveAttrs failed/);
    }
  }
);
