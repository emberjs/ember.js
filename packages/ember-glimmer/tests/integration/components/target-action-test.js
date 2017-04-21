import { assign } from 'ember-utils';
import {
  moduleFor,
  RenderingTest,
  ApplicationTest
} from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { set, Mixin } from 'ember-metal';
import { Component } from '../../utils/helpers';
import { Controller, Object as EmberObject } from 'ember-runtime';
import { Route } from 'ember-routing';

moduleFor('Components test: sendAction', class extends RenderingTest {

  constructor() {
    super();
    this.actionCounts = {};
    this.sendCount = 0;
    this.actionArguments = null;

    var self = this;

    this.registerComponent('action-delegate', {
      ComponentClass: Component.extend({
        init() {
          this._super();
          self.delegate = this;
          this.name = 'action-delegate';
        }
      })
    });
  }

  renderDelegate(template = '{{action-delegate}}', context = {}) {
    let root = this;
    context = assign(context, {
      send(actionName, ...args) {
        root.sendCount++;
        root.actionCounts[actionName] = root.actionCounts[actionName] || 0;
        root.actionCounts[actionName]++;
        root.actionArguments = args;
      }
    });
    this.render(template, context);
  }

  assertSendCount(count) {
    this.assert.equal(this.sendCount, count, `Send was called ${count} time(s)`);
  }

  assertNamedSendCount(actionName, count) {
    this.assert.equal(this.actionCounts[actionName], count, `An action named '${actionName}' was sent ${count} times`);
  }

  assertSentWithArgs(expected, message = 'arguments were sent with the action') {
    this.assert.deepEqual(this.actionArguments, expected, message);
  }

  ['@test Calling sendAction on a component without an action defined does nothing']() {
    this.renderDelegate();

    this.runTask(() => this.delegate.sendAction());

    this.assertSendCount(0);
  }

  ['@test Calling sendAction on a component with an action defined calls send on the controller']() {
    this.renderDelegate();

    this.runTask(() => {
      set(this.delegate, 'action', 'addItem');
      this.delegate.sendAction();
    });

    this.assertSendCount(1);
    this.assertNamedSendCount('addItem', 1);
  }

  ['@test Calling sendAction on a component with a function calls the function']() {
    this.assert.expect(1);

    this.renderDelegate();

    this.runTask(() => {
      set(this.delegate, 'action', () => this.assert.ok(true, 'function is called'));
      this.delegate.sendAction();
    });
  }

  ['@test Calling sendAction on a component with a function calls the function with arguments']() {
    this.assert.expect(1);
    let argument = {};

    this.renderDelegate();

    this.runTask(() => {
      set(this.delegate, 'action', (actualArgument) => {
        this.assert.deepEqual(argument, actualArgument, 'argument is passed');
      });
      this.delegate.sendAction('action', argument);
    });
  }

  // TODO consolidate these next 2 tests
  ['@test Calling sendAction on a component with a reference attr calls the function with arguments']() {
    this.renderDelegate('{{action-delegate playing=playing}}', {
      playing: null
    });

    this.runTask(() => this.delegate.sendAction());

    this.assertSendCount(0);


    this.runTask(() => {
      set(this.context, 'playing', 'didStartPlaying');
    });

    this.runTask(() => {
      this.delegate.sendAction('playing');
    });

    this.assertSendCount(1);
    this.assertNamedSendCount('didStartPlaying', 1);
  }

  ['@test Calling sendAction on a component with a {{mut}} attr calls the function with arguments']() {
    this.renderDelegate('{{action-delegate playing=(mut playing)}}', {
      playing: null
    });

    this.runTask(() => this.delegate.sendAction('playing'));

    this.assertSendCount(0);

    this.runTask(() => this.delegate.attrs.playing.update('didStartPlaying'));
    this.runTask(() => this.delegate.sendAction('playing'));

    this.assertSendCount(1);
    this.assertNamedSendCount('didStartPlaying', 1);
  }

  ['@test Calling sendAction with a named action uses the component\'s property as the action name']() {
    this.renderDelegate();

    let component = this.delegate;

    this.runTask(() => {
      set(this.delegate, 'playing', 'didStartPlaying');
      component.sendAction('playing');
    });

    this.assertSendCount(1);
    this.assertNamedSendCount('didStartPlaying', 1);

    this.runTask(() => component.sendAction('playing'));

    this.assertSendCount(2);
    this.assertNamedSendCount('didStartPlaying', 2);

    this.runTask(() => {
      set(component, 'action', 'didDoSomeBusiness');
      component.sendAction();
    });

    this.assertSendCount(3);
    this.assertNamedSendCount('didDoSomeBusiness', 1);
  }

  ['@test Calling sendAction when the action name is not a string raises an exception']() {
    this.renderDelegate();

    this.runTask(() => {
      set(this.delegate, 'action', {});
      set(this.delegate, 'playing', {});
    });

    expectAssertion(() => this.delegate.sendAction());
    expectAssertion(() => this.delegate.sendAction('playing'));
  }

  ['@test Calling sendAction on a component with contexts']() {
    this.renderDelegate();

    let testContext = { song: 'She Broke My Ember' };
    let firstContext  = { song: 'She Broke My Ember' };
    let secondContext = { song: 'My Achey Breaky Ember' };

    this.runTask(() => {
      set(this.delegate, 'playing', 'didStartPlaying');
      this.delegate.sendAction('playing', testContext);
    });

    this.assertSendCount(1);
    this.assertNamedSendCount('didStartPlaying', 1);
    this.assertSentWithArgs([testContext], 'context was sent with the action');

    this.runTask(() => {
      this.delegate.sendAction('playing', firstContext, secondContext);
    });

    this.assertSendCount(2);
    this.assertNamedSendCount('didStartPlaying', 2);
    this.assertSentWithArgs([firstContext, secondContext], 'multiple contexts were sent to the action');
  }

  ['@test calling sendAction on a component within a block sends to the outer scope GH#14216'](assert) {
    let testContext = this;
    // overrides default action-delegate so actions can be added
    this.registerComponent('action-delegate', {
      ComponentClass: Component.extend({
        init() {
          this._super();
          testContext.delegate = this;
          this.name = 'action-delegate';
        },

        actions: {
          derp(arg1) {
            assert.ok(true, 'action called on action-delgate');
            assert.equal(arg1, 'something special', 'argument passed through properly');
          }
        }
      }),

      template: strip`
        {{#component-a}}
          {{component-b bar="derp"}}
        {{/component-a}}
      `
    });

    this.registerComponent('component-a', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          this.name = 'component-a';
        },
        actions: {
          derp() {
            assert.ok(false, 'no! bad scoping!');
          }
        }
      })
    });

    let innerChild;
    this.registerComponent('component-b', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          innerChild = this;
          this.name = 'component-b';
        }
      })
    });

    this.renderDelegate();

    this.runTask(() => innerChild.sendAction('bar', 'something special'));
  }
});

moduleFor('Components test: sendAction to a controller', class extends ApplicationTest {

  ['@test sendAction should trigger an action on the parent component\'s controller if it exists'](assert) {
    assert.expect(15);

    let component;

    this.router.map(function () {
      this.route('a');
      this.route('b');
      this.route('c', function () {
        this.route('d');
        this.route('e');
      });
    });

    this.addComponent('foo-bar', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        }
      }),
      template: `{{val}}`
    });

    this.add('controller:a', Controller.extend({
      send(actionName, actionContext) {
        assert.equal(actionName, 'poke', 'send() method was invoked from a top level controller');
        assert.equal(actionContext, 'top', 'action arguments were passed into the top level controller');
      }
    }));
    this.addTemplate('a', '{{foo-bar val="a" poke="poke"}}');

    this.add('route:b', Route.extend({
      actions: {
        poke(actionContext) {
          assert.ok(true, 'Unhandled action sent to route');
          assert.equal(actionContext, 'top no controller');
        }
      }
    }));
    this.addTemplate('b', '{{foo-bar val="b" poke="poke"}}');

    this.add('route:c', Route.extend({
      actions: {
        poke(actionContext) {
          assert.ok(true, 'Unhandled action sent to route');
          assert.equal(actionContext, 'top with nested no controller');
        }
      }
    }));
    this.addTemplate('c', '{{foo-bar val="c" poke="poke"}}{{outlet}}');

    this.add('route:c.d', Route.extend({}));

    this.add('controller:c.d', Controller.extend({
      send(actionName, actionContext) {
        assert.equal(actionName, 'poke', 'send() method was invoked from a nested controller');
        assert.equal(actionContext, 'nested', 'action arguments were passed into the nested controller');
      }
    }));
    this.addTemplate('c.d', '{{foo-bar val=".d" poke="poke"}}');

    this.add('route:c.e', Route.extend({
      actions: {
        poke(actionContext) {
          assert.ok(true, 'Unhandled action sent to route');
          assert.equal(actionContext, 'nested no controller');
        }
      }
    }));
    this.addTemplate('c.e', '{{foo-bar val=".e" poke="poke"}}');

    return this.visit('/a')
      .then(() => component.sendAction('poke', 'top'))
      .then(() => {
        this.assertText('a');
        return this.visit('/b');
      })
      .then(() => component.sendAction('poke', 'top no controller'))
      .then(() => {
        this.assertText('b');
        return this.visit('/c');
      })
      .then(() => component.sendAction('poke', 'top with nested no controller'))
      .then(() => {
        this.assertText('c');
        return this.visit('/c/d');
      })
      .then(() => component.sendAction('poke', 'nested'))
      .then(() => {
        this.assertText('c.d');
        return this.visit('/c/e');
      })
      .then(() => component.sendAction('poke', 'nested no controller'))
      .then(() => this.assertText('c.e'));
  }

  ['@test sendAction should not trigger an action in an outlet\'s controller if a parent component handles it'](assert) {
    assert.expect(1);

    let component;

    this.addComponent('x-parent', {
      ComponentClass: Component.extend({
        actions: {
          poke() {
            assert.ok(true, 'parent component handled the aciton');
          }
        }
      }),
      template: '{{x-child poke="poke"}}'
    });

    this.addComponent('x-child', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        }
      })
    });

    this.addTemplate('application', '{{x-parent}}');
    this.add('controller:application', Controller.extend({
      send(actionName) {
        throw new Error('controller action should not be called');
      }
    }));

    return this.visit('/').then(() => component.sendAction('poke'));
  }

});

moduleFor('Components test: sendAction of a closure action', class extends RenderingTest {

  ['@test action should be called'](assert) {
    assert.expect(1);
    let component;

    this.registerComponent('inner-component', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        }
      }),
      template: 'inner'
    });

    this.registerComponent('outer-component', {
      ComponentClass: Component.extend({
        outerSubmit() {
          assert.ok(true, 'outerSubmit called');
        }
      }),
      template: '{{inner-component submitAction=(action outerSubmit)}}'
    });

    this.render('{{outer-component}}');

    this.runTask(() => component.sendAction('submitAction'));
  }

  ['@test contexts passed to sendAction are appended to the bound arguments on a closure action']() {
    let first = 'mitch';
    let second = 'martin';
    let third = 'matt';
    let fourth = 'wacky wycats';

    let innerComponent;
    let actualArgs;

    this.registerComponent('inner-component', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          innerComponent = this;
        }
      }),
      template: 'inner'
    });

    this.registerComponent('outer-component', {
      ComponentClass: Component.extend({
        third,
        actions: {
          outerSubmit() {
            actualArgs = [...arguments];
          }
        }
      }),
      template: `{{inner-component innerSubmit=(action (action "outerSubmit" "${first}") "${second}" third)}}`
    });

    this.render('{{outer-component}}');

    this.runTask(() => innerComponent.sendAction('innerSubmit', fourth));

    this.assert.deepEqual(actualArgs, [first, second, third, fourth], 'action has the correct args');
  }
});

moduleFor('Components test: send', class extends RenderingTest {
  ['@test sending to undefined actions triggers an error'](assert) {
    assert.expect(2);

    let component;

    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        init() {
          this._super();
          component = this;
        },
        actions: {
          foo(message) {
            assert.equal('bar', message);
          }
        }
      })
    });

    this.render('{{foo-bar}}');

    this.runTask(() => component.send('foo', 'bar'));

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
      }
    };

    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        init() {
          this._super();
          component = this;
        },
        target
      })
    });

    this.render('{{foo-bar}}');

    this.runTask(() => component.send('foo', 'baz'));
  }

  ['@test a handled action can be bubbled to the target for continued processing']() {
    this.assert.expect(2);

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
          }
        },
        target: Controller.extend({
          actions: {
            poke: () => {
              this.assert.ok(true, 'action bubbled to controller');
            }
          }
        }).create()
      })
    });

    this.render('{{foo-bar poke="poke"}}');

    this.runTask(() => component.send('poke'));
  }

  ['@test action can be handled by a superclass\' actions object'](assert) {
    this.assert.expect(4);

    let component;

    let SuperComponent = Component.extend({
      actions: {
        foo() {
          assert.ok(true, 'foo');
        },
        bar(msg) {
          assert.equal(msg, 'HELLO');
        }
      }
    });

    let BarViewMixin = Mixin.create({
      actions: {
        bar(msg) {
          assert.equal(msg, 'HELLO');
          this._super(msg);
        }
      }
    });

    this.registerComponent('x-index', {
      ComponentClass: SuperComponent.extend(BarViewMixin, {
        init() {
          this._super(...arguments);
          component = this;
        },
        actions: {
          baz() {
            assert.ok(true, 'baz');
          }
        }
      })
    });

    this.render('{{x-index}}');

    this.runTask(() => {
      component.send('foo');
      component.send('bar', 'HELLO');
      component.send('baz');
    });
  }

  ['@test actions cannot be provided at create time'](assert) {
    expectAssertion(() => Component.create({
      actions: {
        foo() {
          assert.ok(true, 'foo');
        }
      }
    }));
    // but should be OK on an object that doesn't mix in Ember.ActionHandler
    EmberObject.create({
      actions: ['foo']
    });
  }
});
