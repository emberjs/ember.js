import { RenderingTest, moduleFor } from '../utils/test-case';
import { Component } from '../utils/helpers';
import {
  instrumentationSubscribe,
  instrumentationReset,
  run
} from 'ember-metal';
import { EMBER_IMPROVED_INSTRUMENTATION } from 'ember/features';
import { EventDispatcher } from 'ember-views';

let canDataTransfer = !!document.createEvent('HTMLEvents').dataTransfer;

function fireNativeWithDataTransfer(node, type, dataTransfer) {
  let event = document.createEvent('HTMLEvents');
  event.initEvent(type, true, true);
  event.dataTransfer = dataTransfer;
  node.dispatchEvent(event);
}

moduleFor('EventDispatcher', class extends RenderingTest {
  ['@test events bubble view hierarchy for form elements'](assert) {
    let receivedEvent;

    this.registerComponent('x-foo', {
      ComponentClass: Component.extend({
        change(event) {
          receivedEvent = event;
        }
      }),
      template: `<input id="is-done" type="checkbox">`
    });

    this.render(`{{x-foo}}`);

    this.runTask(() => this.$('#is-done').trigger('change'));
    assert.ok(receivedEvent, 'change event was triggered');
    assert.strictEqual(receivedEvent.target, this.$('#is-done')[0]);
  }

  ['@test dispatches to the nearest event manager'](assert) {
    let receivedEvent;

    this.registerComponent('x-foo', {
      ComponentClass: Component.extend({
        click(event) {
          assert.notOk(true, 'should not trigger `click` on component');
        },

        eventManager: {
          click(event) {
            receivedEvent = event;
          }
        }
      }),

      template: `<input id="is-done" type="checkbox">`
    });

    this.render(`{{x-foo}}`);

    this.runTask(() => this.$('#is-done').trigger('click'));
    assert.strictEqual(receivedEvent.target, this.$('#is-done')[0]);
  }

  ['@test event manager can re-dispatch to the component'](assert) {
    let handlers = [];

    this.registerComponent('x-foo', {
      ComponentClass: Component.extend({
        click() {
          handlers.push('component');
        },

        eventManager: {
          click(event, component) {
            handlers.push('eventManager');
            // Re-dispatch event when you get it.
            //
            // The second parameter tells the dispatcher
            // that this event has been handled. This
            // API will clearly need to be reworked since
            // multiple eventManagers in a single view
            // hierarchy would break, but it shows that
            // re-dispatching works
            component.$().trigger('click', this);
          }
        }
      }),

      template: `<input id="is-done" type="checkbox">`
    });

    this.render(`{{x-foo}}`);

    this.runTask(() => this.$('#is-done').trigger('click'));
    assert.deepEqual(handlers, ['eventManager', 'component']);
  }

  ['@test event handlers are wrapped in a run loop'](assert) {
    this.registerComponent('x-foo', {
      ComponentClass: Component.extend({
        change() {
          assert.ok(run.currentRunLoop, 'a run loop should have started');
        }
      }),
      template: `<input id="is-done" type="checkbox">`
    });

    this.render(`{{x-foo}}`);

    this.$('#is-done').trigger('click');
  }
});

moduleFor('EventDispatcher#setup', class extends RenderingTest {
  constructor() {
    super();

    let dispatcher = this.owner.lookup('event_dispatcher:main');
    run(dispatcher, 'destroy');
    this.owner.__container__.reset('event_dispatcher:main');
    this.dispatcher = this.owner.lookup('event_dispatcher:main');
  }

  ['@test additonal events can be specified'](assert) {
    this.dispatcher.setup({ myevent: 'myEvent' });

    this.registerComponent('x-foo', {
      ComponentClass: Component.extend({
        myEvent() {
          assert.ok(true, 'custom event was triggered');
        }
      }),
      template: `<p>Hello!</p>`
    });

    this.render(`{{x-foo}}`);

    this.$('div').trigger('myevent');
  }

  ['@test canDispatchToEventManager is deprecated'](assert) {
    this.dispatcher.canDispatchToEventManager = null;
    this.registerComponent('x-foo', {
      ComponentClass: Component.extend({
        eventManager: {
          myEvent() {}
        }
      }),
      template: `<p>Hello!</p>`
    });

    expectDeprecation(() => {
      this.render(`{{x-foo}}`);
    }, '[DEPRECATED] `canDispatchToEventManager` has been deprecated.');

    this.$('div').trigger('myevent');
  }

  ['@test canDispatchToEventManager is deprecated in EventDispatcher'](assert) {
    let MyDispatcher = EventDispatcher.extend({
      canDispatchToEventManager: null
    });

    expectDeprecation(() => {
      MyDispatcher.create();
    }, '[DEPRECATED] `canDispatchToEventManager` has been deprecated.');
  }

  ['@test a rootElement can be specified'](assert) {
    this.$().append('<div id="app"></div>');
    this.dispatcher.setup({ myevent: 'myEvent' }, '#app');

    assert.ok(this.$('#app').hasClass('ember-application'), 'custom rootElement was used');
    assert.equal(this.dispatcher.rootElement, '#app', 'the dispatchers rootElement was updated');
  }

  ['@test default events can be disabled via `customEvents`'](assert) {
    this.dispatcher.setup({ click: null });

    this.registerComponent('x-foo', {
      ComponentClass: Component.extend({
        click() {
          assert.ok(false, 'click method was called');
        },

        null() {
          assert.ok(false, 'null method was called');
        },

        doubleClick() {
          assert.ok(true, 'a non-disabled event is still handled properly');
        }
      }),

      template: `<p>Hello!</p>`
    });

    this.render(`{{x-foo}}`);

    this.$('div').trigger('click');
    this.$('div').trigger('dblclick');
  }

  ['@test throws if specified rootElement does not exist'](assert) {
    assert.throws(() => {
      this.dispatcher.setup({ myevent: 'myEvent' }, '#app');
    });
  }
});

if (EMBER_IMPROVED_INSTRUMENTATION) {
  moduleFor('EventDispatcher - Instrumentation', class extends RenderingTest {
    teardown() {
      super.teardown();
      instrumentationReset();
    }

    ['@test instruments triggered events'](assert) {
      let clicked = 0;

      this.registerComponent('x-foo', {
        ComponentClass: Component.extend({
          click(evt) {
            clicked++;
          }
        }),
        template: `<p>hello</p>`
      });

      this.render(`{{x-foo}}`);

      this.$('div').trigger('click');

      assert.equal(clicked, 1, 'precond - the click handler was invoked');

      let clickInstrumented = 0;
      instrumentationSubscribe('interaction.click', {
        before() {
          clickInstrumented++;
          assert.equal(clicked, 1, 'invoked before event is handled');
        },
        after() {
          clickInstrumented++;
          assert.equal(clicked, 2, 'invoked after event is handled');
        }
      });

      let keypressInstrumented = 0;
      instrumentationSubscribe('interaction.keypress', {
        before() {
          keypressInstrumented++;
        },
        after() {
          keypressInstrumented++;
        }
      });

      this.$('div').trigger('click');
      this.$('div').trigger('change');
      assert.equal(clicked, 2, 'precond - The click handler was invoked');
      assert.equal(clickInstrumented, 2, 'The click was instrumented');
      assert.strictEqual(keypressInstrumented, 0, 'The keypress was not instrumented');
    }
  });
}

if (canDataTransfer) {
  moduleFor('EventDispatcher - Event Properties', class extends RenderingTest {
    ['@test dataTransfer property is added to drop event'](assert) {
      let receivedEvent;
      this.registerComponent('x-foo', {
        ComponentClass: Component.extend({
          drop(event) {
            receivedEvent = event;
          }
        })
      });

      this.render(`{{x-foo}}`);

      fireNativeWithDataTransfer(this.$('div')[0], 'drop', 'success');
      assert.equal(receivedEvent.dataTransfer, 'success');
    }
  });
}
