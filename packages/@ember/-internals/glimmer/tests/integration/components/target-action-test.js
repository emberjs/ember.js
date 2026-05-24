import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { action, set } from '@ember/object';
import Mixin from '@ember/object/mixin';
import Controller from '@ember/controller';
import EmberObject from '@ember/object';
import { context } from '@ember/-internals/environment';

import { Component } from '../../utils/helpers';

moduleFor(
  'Components test: send',
  class extends RenderingTestCase {
    ['@test sending to undefined actions triggers an error'](assert) {
      assert.expect(2);

      let component;

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init();
            component = this;
          }

          @action
          foo(message) {
            assert.equal('bar', message);
          }
        }
      );

      this.render('{{foo-bar}}');

      runTask(() => component.send('foo', 'bar'));

      expectAssertion(() => {
        return component.send('baz', 'bar');
      }, /had no action handler for: baz/);
    }

    ['@test `send` will call send from a target if it is defined']() {
      let component;
      let target = {
        send: (message, payload) => {
          this.assert.equal('foo', message);
          this.assert.equal('baz', payload);
        },
      };

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = target;
        }
      );

      this.render('{{foo-bar}}');

      runTask(() => component.send('foo', 'baz'));
    }

    ['@test a handled action can be bubbled to the target for continued processing']() {
      this.assert.expect(2);

      let component;

      this.owner.register(
        'component:foo-bar',
        Component.extend({
          init() {
            this._super(...arguments);
            component = this;
          },
          actions: {
            poke: () => {
              this.assert.ok(true, 'component action called');
              return true;
            },
          },
          target: Controller.extend({
            actions: {
              poke: () => {
                this.assert.ok(true, 'action bubbled to controller');
              },
            },
          }).create(),
        })
      );

      this.render('{{foo-bar poke="poke"}}');

      runTask(() => component.send('poke'));
    }

    ["@test action can be handled by a superclass' actions object"](assert) {
      this.assert.expect(4);

      let component;

      let SuperComponent = class extends Component {
        @action
        foo() {
          assert.ok(true, 'foo');
        }

        @action
        bar(msg) {
          assert.equal(msg, 'HELLO');
        }
      };

      let BarViewMixin = Mixin.create({
        actions: {
          bar(msg) {
            assert.equal(msg, 'HELLO');
            this._super(msg);
          },
        },
      });

      this.owner.register(
        'component:x-index',
        class extends SuperComponent.extend(BarViewMixin) {
          init() {
            super.init(...arguments);
            component = this;
          }

          @action
          baz() {
            assert.ok(true, 'baz');
          }
        }
      );

      this.render('{{x-index}}');

      runTask(() => {
        component.send('foo');
        component.send('bar', 'HELLO');
        component.send('baz');
      });
    }

    ['@test actions cannot be provided at create time'](assert) {
      this.owner.register('component:foo-bar', class extends Component {});
      let ComponentFactory = this.owner.factoryFor('component:foo-bar');

      expectAssertion(() => {
        ComponentFactory.create({
          actions: {
            foo() {
              assert.ok(true, 'foo');
            },
          },
        });
      }, /`actions` must be provided at extend time, not at create time/);
      // but should be OK on an object that doesn't mix in Ember.ActionHandler
      EmberObject.create({
        actions: ['foo'],
      });
    }

    ['@test asserts if called on a destroyed component']() {
      let component;

      this.owner.register(
        'component:rip-alley',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }

          toString() {
            return 'component:rip-alley';
          }
        }
      );

      this.render('{{#if this.shouldRender}}{{rip-alley}}{{/if}}', {
        shouldRender: true,
      });

      runTask(() => {
        set(this.context, 'shouldRender', false);
      });

      expectAssertion(() => {
        component.send('trigger-me-dead');
      }, "Attempted to call .send() with the action 'trigger-me-dead' on the destroyed object 'component:rip-alley'.");
    }
  }
);

moduleFor(
  'Components test: triggerAction',
  class extends RenderingTestCase {
    ['@test returns false if no target or action are specified'](assert) {
      let component;

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction(), false);
    }

    ['@test invokes target method by action name'](assert) {
      assert.expect(2);
      let component;

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = EmberObject.create({
            anEvent() {
              assert.ok(true, 'anEvent method was called');
            },
          });
          action = 'anEvent';
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction(), true);
    }

    ['@test invokes target.send when target has send()'](assert) {
      assert.expect(3);
      let component;

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = EmberObject.create({
            send(evt, ctx) {
              assert.equal(evt, 'anEvent', 'send() method was invoked with correct event name');
              assert.equal(ctx, component, 'send() method was invoked with correct context');
            },
          });
          action = 'anEvent';
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction(), true);
    }

    ['@test resolves target from property path string'](assert) {
      assert.expect(2);
      let component;
      let myTarget = EmberObject.create({
        anEvent() {
          assert.ok(true, 'anEvent method was called on resolved target');
        },
      });

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = 'myTarget';
          myTarget = myTarget;
          action = 'anEvent';
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction(), true);
    }

    ['@test resolves target from global path when property not found on component'](assert) {
      assert.expect(2);
      let originalLookup = context.lookup;
      let lookup = {};
      context.lookup = lookup;

      let component;
      lookup.Test = {};
      lookup.Test.targetObj = EmberObject.create({
        anEvent() {
          assert.ok(true, 'anEvent method was called on global object');
        },
      });

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = 'Test.targetObj';
          action = 'anEvent';
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction(), true);

      context.lookup = originalLookup;
    }

    ['@test uses actionContext object specified as a property on the component'](assert) {
      assert.expect(2);
      let component;
      let ctx = {};

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = EmberObject.create({
            anEvent(c) {
              assert.strictEqual(c, ctx, 'anEvent method was called with the expected context');
            },
          });
          action = 'anEvent';
          actionContext = ctx;
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction(), true);
    }

    ['@test resolves actionContext from property path string'](assert) {
      assert.expect(2);
      let component;
      let aContext = {};

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = EmberObject.create({
            anEvent(c) {
              assert.strictEqual(c, aContext, 'actionContext was resolved via property path');
            },
          });
          action = 'anEvent';
          actionContext = 'aContext';
          aContext = aContext;
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction(), true);
    }

    ['@test uses target specified in argument over property target'](assert) {
      assert.expect(2);
      let component;
      let targetObj = EmberObject.create({
        anEvent() {
          assert.ok(true, 'anEvent method was called on override target');
        },
      });

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          action = 'anEvent';
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction({ target: targetObj }), true);
    }

    ['@test uses action specified in argument over property action'](assert) {
      assert.expect(2);
      let component;

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = EmberObject.create({
            anEvent() {
              assert.ok(true, 'anEvent method was called via override action');
            },
          });
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction({ action: 'anEvent' }), true);
    }

    ['@test uses actionContext specified in argument over property actionContext'](assert) {
      assert.expect(2);
      let component;
      let ctx = {};

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = EmberObject.create({
            anEvent(c) {
              assert.strictEqual(c, ctx, 'override actionContext was passed');
            },
          });
          action = 'anEvent';
          actionContext = 'wrong';
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction({ actionContext: ctx }), true);
    }

    ['@test array actionContext becomes multiple arguments'](assert) {
      assert.expect(3);
      let component;
      let param1 = 'someParam';
      let param2 = 'someOtherParam';

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = EmberObject.create({
            anEvent(first, second) {
              assert.strictEqual(first, param1, 'first param matches');
              assert.strictEqual(second, param2, 'second param matches');
            },
          });
          action = 'anEvent';
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction({ actionContext: [param1, param2] }), true);
    }

    ['@test null actionContext is passed as null'](assert) {
      assert.expect(2);
      let component;

      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = EmberObject.create({
            anEvent(ctx) {
              assert.strictEqual(ctx, null, 'null actionContext was passed');
            },
          });
          action = 'anEvent';
        }
      );

      this.render('{{foo-bar}}');

      assert.strictEqual(component.triggerAction({ actionContext: null }), true);
    }
  }
);
