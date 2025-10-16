import { expectDeprecation, moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { action, set } from '@ember/object';
import Mixin from '@ember/object/mixin';
import Controller from '@ember/controller';
import EmberObject from '@ember/object';

import { Component } from '../../utils/helpers';

moduleFor(
  'Components test: send',
  class extends RenderingTestCase {
    ['@test sending to undefined actions triggers an error'](assert) {
      assert.expect(4);

      let component;

      this.registerComponent('foo-bar', {
        ComponentClass: class extends Component {
          init() {
            super.init();
            component = this;
          }

          @action
          foo(message) {
            assert.equal('bar', message);
          }
        },
      });

      this.render('{{foo-bar}}');

      expectDeprecation(() => {
        runTask(() => component.send('foo', 'bar'));
      }, /send\(\) is deprecated/);

      expectDeprecation(() => {
        expectAssertion(() => {
          return component.send('baz', 'bar');
        }, /had no action handler for: baz/);
      }, /send\(\) is deprecated/);
    }

    ['@test `send` will call send from a target if it is defined']() {
      let component;
      let target = {
        send: (message, payload) => {
          this.assert.equal('foo', message);
          this.assert.equal('baz', payload);
        },
      };

      this.registerComponent('foo-bar', {
        ComponentClass: class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }
          target = target;
        },
      });

      this.render('{{foo-bar}}');

      expectDeprecation(() => {
        runTask(() => component.send('foo', 'baz'));
      }, /send\(\) is deprecated/);
    }

    ['@test a handled action can be bubbled to the target for continued processing']() {
      this.assert.expect(3);

      let component;

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
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
        }),
      });

      this.render('{{foo-bar poke="poke"}}');

      expectDeprecation(() => {
        runTask(() => component.send('poke'));
      }, /send\(\) is deprecated/);
    }

    ["@test action can be handled by a superclass' actions object"](assert) {
      this.assert.expect(5);

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

      this.registerComponent('x-index', {
        ComponentClass: class extends SuperComponent.extend(BarViewMixin) {
          init() {
            super.init(...arguments);
            component = this;
          }

          @action
          baz() {
            assert.ok(true, 'baz');
          }
        },
      });

      this.render('{{x-index}}');

      expectDeprecation(() => {
        runTask(() => {
          component.send('foo');
          component.send('bar', 'HELLO');
          component.send('baz');
        });
      }, /send\(\) is deprecated/);
    }

    ['@test actions cannot be provided at create time'](assert) {
      this.registerComponent('foo-bar', class extends Component {});
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

      this.registerComponent('rip-alley', {
        ComponentClass: class extends Component {
          init() {
            super.init(...arguments);
            component = this;
          }

          toString() {
            return 'component:rip-alley';
          }
        },
      });

      this.render('{{#if this.shouldRender}}{{rip-alley}}{{/if}}', {
        shouldRender: true,
      });

      runTask(() => {
        set(this.context, 'shouldRender', false);
      });

      expectDeprecation(() => {
        expectAssertion(() => {
          component.send('trigger-me-dead');
        }, "Attempted to call .send() with the action 'trigger-me-dead' on the destroyed object 'component:rip-alley'.");
      }, /send\(\) is deprecated/);
    }
  }
);
