import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { Component } from '../utils/helpers';
import { _getCurrentRunLoop } from '@ember/runloop';

let canDataTransfer = Boolean(document.createEvent('HTMLEvents').dataTransfer);

function fireNativeWithDataTransfer(node, type, dataTransfer) {
  let event = document.createEvent('HTMLEvents');
  event.initEvent(type, true, true);
  event.dataTransfer = dataTransfer;
  node.dispatchEvent(event);
}

function triggerEvent(node, event) {
  switch (event) {
    case 'focusin':
      return node.focus();
    case 'focusout':
      return node.blur();
    default:
      return node.trigger(event);
  }
}

const SUPPORTED_EMBER_EVENTS = {
  touchstart: 'touchStart',
  touchmove: 'touchMove',
  touchend: 'touchEnd',
  touchcancel: 'touchCancel',
  keydown: 'keyDown',
  keyup: 'keyUp',
  keypress: 'keyPress',
  mousedown: 'mouseDown',
  mouseup: 'mouseUp',
  contextmenu: 'contextMenu',
  click: 'click',
  dblclick: 'doubleClick',
  focusin: 'focusIn',
  focusout: 'focusOut',
  submit: 'submit',
  input: 'input',
  change: 'change',
  dragstart: 'dragStart',
  drag: 'drag',
  dragenter: 'dragEnter',
  dragleave: 'dragLeave',
  dragover: 'dragOver',
  drop: 'drop',
  dragend: 'dragEnd',
};

moduleFor(
  'EventDispatcher',
  class extends RenderingTestCase {
    ['@test event handler methods are called when event is triggered'](assert) {
      let receivedEvent;
      let browserEvent;

      this.registerComponent('x-button', {
        ComponentClass: Component.extend(
          {
            tagName: 'button',
          },
          Object.keys(SUPPORTED_EMBER_EVENTS)
            .map((browerEvent) => ({
              [SUPPORTED_EMBER_EVENTS[browerEvent]](event) {
                receivedEvent = event;
              },
            }))
            .reduce((result, singleEventHandler) => ({ ...result, ...singleEventHandler }), {})
        ),
      });

      this.render(`{{x-button}}`);

      let elementNode = this.$('button');
      let element = elementNode[0];

      for (browserEvent in SUPPORTED_EMBER_EVENTS) {
        receivedEvent = null;
        runTask(() => triggerEvent(elementNode, browserEvent));
        assert.ok(receivedEvent, `${browserEvent} event was triggered`);
        assert.strictEqual(receivedEvent.target, element);
      }
    }

    ['@test event listeners are called when event is triggered'](assert) {
      let receivedEvent;
      let browserEvent;

      this.registerComponent('x-button', {
        ComponentClass: Component.extend({
          tagName: 'button',
          init() {
            this._super();
            Object.keys(SUPPORTED_EMBER_EVENTS).forEach((browserEvent) => {
              this.on(SUPPORTED_EMBER_EVENTS[browserEvent], (event) => (receivedEvent = event));
            });
          },
        }),
      });

      this.render(`{{x-button}}`);

      let elementNode = this.$('button');
      let element = elementNode[0];

      for (browserEvent in SUPPORTED_EMBER_EVENTS) {
        receivedEvent = null;
        runTask(() => triggerEvent(elementNode, browserEvent));
        assert.ok(receivedEvent, `${browserEvent} event was triggered`);
        assert.strictEqual(receivedEvent.target, element);
      }
    }

    ['@test events bubble view hierarchy for form elements'](assert) {
      let receivedEvent;

      this.registerComponent('x-foo', {
        ComponentClass: Component.extend({
          change(event) {
            receivedEvent = event;
          },
        }),
        template: `<input id="is-done" type="checkbox">`,
      });

      this.render(`{{x-foo}}`);

      runTask(() => this.$('#is-done').trigger('change'));
      assert.ok(receivedEvent, 'change event was triggered');
      assert.strictEqual(receivedEvent.target, this.$('#is-done')[0]);
    }

    ['@test case insensitive events'](assert) {
      let receivedEvent;

      this.registerComponent('x-bar', {
        ComponentClass: Component.extend({
          clicked(event) {
            receivedEvent = event;
          },
        }),
        template: `<button id="is-done" onclick={{action this.clicked}}>my button</button>`,
      });

      this.render(`{{x-bar}}`);

      runTask(() => this.$('#is-done').trigger('click'));
      assert.ok(receivedEvent, 'change event was triggered');
      assert.strictEqual(receivedEvent.target, this.$('#is-done')[0]);
    }

    ['@test case sensitive events'](assert) {
      let receivedEvent;

      this.registerComponent('x-bar', {
        ComponentClass: Component.extend({
          clicked(event) {
            receivedEvent = event;
          },
        }),
        template: `<button id="is-done" onClick={{action this.clicked}}>my button</button>`,
      });

      this.render(`{{x-bar}}`);

      runTask(() => this.$('#is-done').trigger('click'));
      assert.ok(receivedEvent, 'change event was triggered');
      assert.strictEqual(receivedEvent.target, this.$('#is-done')[0]);
    }

    ['@test events bubble to parent view'](assert) {
      let receivedEvent;

      this.registerComponent('x-foo', {
        ComponentClass: Component.extend({
          change(event) {
            receivedEvent = event;
          },
        }),
        template: `{{yield}}`,
      });

      this.registerComponent('x-bar', {
        ComponentClass: Component.extend({
          change() {},
        }),
        template: `<input id="is-done" type="checkbox">`,
      });

      this.render(`{{#x-foo}}{{x-bar}}{{/x-foo}}`);

      runTask(() => this.$('#is-done').trigger('change'));
      assert.ok(receivedEvent, 'change event was triggered');
      assert.strictEqual(receivedEvent.target, this.$('#is-done')[0]);
    }

    ['@test events bubbling up can be prevented by returning false'](assert) {
      let hasReceivedEvent;

      this.registerComponent('x-foo', {
        ComponentClass: Component.extend({
          change() {
            hasReceivedEvent = true;
          },
        }),
        template: `{{yield}}`,
      });

      this.registerComponent('x-bar', {
        ComponentClass: Component.extend({
          change() {
            return false;
          },
        }),
        template: `<input id="is-done" type="checkbox">`,
      });

      this.render(`{{#x-foo}}{{x-bar}}{{/x-foo}}`);

      runTask(() => this.$('#is-done').trigger('change'));
      assert.notOk(hasReceivedEvent, 'change event has not been received');
    }

    ['@test events bubbling up can be prevented by calling stopPropagation()'](assert) {
      let hasReceivedEvent;

      this.registerComponent('x-foo', {
        ComponentClass: Component.extend({
          change() {
            hasReceivedEvent = true;
          },
        }),
        template: `{{yield}}`,
      });

      this.registerComponent('x-bar', {
        ComponentClass: Component.extend({
          change(e) {
            e.stopPropagation();
          },
        }),
        template: `<input id="is-done" type="checkbox">`,
      });

      this.render(`{{#x-foo}}{{x-bar}}{{/x-foo}}`);

      runTask(() => this.$('#is-done').trigger('change'));
      assert.notOk(hasReceivedEvent, 'change event has not been received');
    }

    ['@test event handlers are wrapped in a run loop'](assert) {
      this.registerComponent('x-foo', {
        ComponentClass: Component.extend({
          change() {
            assert.ok(_getCurrentRunLoop(), 'a run loop should have started');
          },
        }),
        template: `<input id="is-done" type="checkbox">`,
      });

      this.render(`{{x-foo}}`);

      this.$('#is-done').trigger('click');
    }
  }
);

moduleFor(
  'EventDispatcher#setup',
  class extends RenderingTestCase {
    constructor() {
      super(...arguments);

      this.dispatcher = this.owner.lookup('event_dispatcher:main');
    }

    getBootOptions() {
      return {
        skipEventDispatcher: true,
      };
    }

    ['@test additional events can be specified'](assert) {
      this.dispatcher.setup({ myevent: 'myEvent' });

      this.registerComponent('x-foo', {
        ComponentClass: Component.extend({
          myEvent() {
            assert.ok(true, 'custom event was triggered');
          },
        }),
        template: `<p>Hello!</p>`,
      });

      this.render(`{{x-foo}}`);

      this.$('div').trigger('myevent');
    }

    ['@test a rootElement can be specified'](assert) {
      this.element.innerHTML = '<div id="app"></div>';
      // this.$().append('<div id="app"></div>');
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
          },
        }),

        template: `<p>Hello!</p>`,
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
  }
);

if (canDataTransfer) {
  moduleFor(
    'EventDispatcher - Event Properties',
    class extends RenderingTestCase {
      ['@test dataTransfer property is added to drop event'](assert) {
        let receivedEvent;
        this.registerComponent('x-foo', {
          ComponentClass: Component.extend({
            drop(event) {
              receivedEvent = event;
            },
          }),
        });

        this.render(`{{x-foo}}`);

        fireNativeWithDataTransfer(this.$('div')[0], 'drop', 'success');
        assert.equal(receivedEvent.dataTransfer, 'success');
      }
    }
  );
}
