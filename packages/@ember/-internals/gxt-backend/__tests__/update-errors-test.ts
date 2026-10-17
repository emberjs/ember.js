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
import EmberObject, { computed, set } from '@ember/object';
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
