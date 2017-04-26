import { getOwner } from 'ember-utils';
import {
  moduleFor,
  ApplicationTest,
  RenderingTest
} from '../utils/test-case';
import { compile, Component } from '../utils/helpers';
import { Controller } from 'ember-runtime';
import { set } from 'ember-metal';
import { Engine, getEngineParent } from 'ember-application';
import { EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER, EMBER_ENGINES_MOUNT_PARAMS } from 'ember/features';

if (EMBER_ENGINES_MOUNT_PARAMS) {
  moduleFor('{{mount}} single param assertion', class extends RenderingTest {
    ['@test it asserts that only a single param is passed']() {
      expectAssertion(() => {
        this.render('{{mount "chat" "foo"}}');
      }, /You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}./i);
    }
  });
} else {
  moduleFor('{{mount}} single param assertion', class extends RenderingTest {
    ['@test it asserts that only a single param is passed']() {
      expectAssertion(() => {
        this.render('{{mount "chat" "foo"}}');
      }, /You can only pass a single argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}./i);
    }
  });
}

moduleFor('{{mount}} assertions', class extends RenderingTest {
  ['@test it asserts when an invalid engine name is provided']() {
    expectAssertion(() => {
      this.render('{{mount engineName}}', { engineName: {} });
    }, /Invalid engine name '\[object Object\]' specified, engine name must be either a string, null or undefined./i);
  }

  ['@test it asserts that the specified engine is registered']() {
    expectAssertion(() => {
      this.render('{{mount "chat"}}');
    }, /You used `{{mount 'chat'}}`, but the engine 'chat' can not be found./i);
  }
});

moduleFor('{{mount}} test', class extends ApplicationTest {
  constructor() {
    super();

    let engineRegistrations = this.engineRegistrations = {};

    this.add('engine:chat', Engine.extend({
      router: null,

      init() {
        this._super(...arguments);

        Object.keys(engineRegistrations).forEach(fullName => {
          this.register(fullName, engineRegistrations[fullName]);
        });
      }
    }));

    this.addTemplate('index', '{{mount "chat"}}');
  }

  ['@test it boots an engine, instantiates its application controller, and renders its application template'](assert) {
    this.engineRegistrations['template:application'] = compile('<h2>Chat here, {{username}}</h2>', { moduleName: 'application' });

    let controller;

    this.engineRegistrations['controller:application'] = Controller.extend({
      username: 'dgeb',

      init() {
        this._super();
        controller = this;
      }
    });

    return this.visit('/').then(() => {
      assert.ok(controller, 'engine\'s application controller has been instantiated');

      let engineInstance = getOwner(controller);
      assert.strictEqual(getEngineParent(engineInstance), this.applicationInstance, 'engine instance has the application instance as its parent');

      this.assertComponentElement(this.firstChild, { content: '<h2>Chat here, dgeb</h2>' });

      this.runTask(() => set(controller, 'username', 'chancancode'));

      this.assertComponentElement(this.firstChild, { content: '<h2>Chat here, chancancode</h2>' });

      this.runTask(() => set(controller, 'username', 'dgeb'));

      this.assertComponentElement(this.firstChild, { content: '<h2>Chat here, dgeb</h2>' });
    });
  }

  ['@test it emits a useful backtracking re-render assertion message'](assert) {
    this.router.map(function() {
      this.route('route-with-mount');
    });

    this.addTemplate('index', '');
    this.addTemplate('route-with-mount', '{{mount "chat"}}');

    this.engineRegistrations['template:application'] = compile('hi {{person.name}} [{{component-with-backtracking-set person=person}}]', { moduleName: 'application' });
    this.engineRegistrations['controller:application'] = Controller.extend({
      person: { name: 'Alex' }
    });

    this.engineRegistrations['template:components/component-with-backtracking-set'] = compile('[component {{person.name}}]', { moduleName: 'components/component-with-backtracking-set' });
    this.engineRegistrations['component:component-with-backtracking-set'] = Component.extend({
      init() {
        this._super(...arguments);
        this.set('person.name', 'Ben');
      }
    });

    let expectedBacktrackingMessage = /modified "person\.name" twice on \[object Object\] in a single render\. It was rendered in "template:route-with-mount" \(in "engine:chat"\) and modified in "component:component-with-backtracking-set" \(in "engine:chat"\)/;

    if (EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
      expectDeprecation(expectedBacktrackingMessage);
      return this.visit('/route-with-mount');
    } else {
      return this.visit('/').then(() => {
        expectAssertion(() => {
          this.visit('/route-with-mount');
        }, expectedBacktrackingMessage);
      });
    }
  }

  ['@test it renders with a bound engine name']() {
    this.router.map(function() {
      this.route('bound-engine-name');
    });
    let controller;
    this.add('controller:bound-engine-name', Controller.extend({
      engineName: null,
      init() {
        this._super();
        controller = this;
      }
    }));
    this.addTemplate('bound-engine-name', '{{mount engineName}}');

    this.add('engine:foo', Engine.extend({
      router: null,
      init() {
        this._super(...arguments);
        this.register('template:application', compile('<h2>Foo Engine</h2>', { moduleName: 'application' }));
      }
    }));
    this.add('engine:bar', Engine.extend({
      router: null,
      init() {
        this._super(...arguments);
        this.register('template:application', compile('<h2>Bar Engine</h2>', { moduleName: 'application' }));
      }
    }));

    return this.visit('/bound-engine-name').then(() => {
      this.assertComponentElement(this.firstChild, { content: '<!---->' });

      this.runTask(() => set(controller, 'engineName', 'foo'));

      this.assertComponentElement(this.firstChild, { content: '<h2>Foo Engine</h2>' });

      this.runTask(() => set(controller, 'engineName', undefined));

      this.assertComponentElement(this.firstChild, { content: '<!---->' });

      this.runTask(() => set(controller, 'engineName', 'foo'));

      this.assertComponentElement(this.firstChild, { content: '<h2>Foo Engine</h2>' });

      this.runTask(() => set(controller, 'engineName', 'bar'));

      this.assertComponentElement(this.firstChild, { content: '<h2>Bar Engine</h2>' });

      this.runTask(() => set(controller, 'engineName', 'foo'));

      this.assertComponentElement(this.firstChild, { content: '<h2>Foo Engine</h2>' });

      this.runTask(() => set(controller, 'engineName', null));

      this.assertComponentElement(this.firstChild, { content: '<!---->' });
    });
  }

});

if (EMBER_ENGINES_MOUNT_PARAMS) {
  moduleFor('{{mount}} params tests', class extends ApplicationTest {
    constructor() {
      super();

      this.add('engine:paramEngine', Engine.extend({
        router: null,
        init() {
          this._super(...arguments);
          this.register('template:application', compile('<h2>Param Engine: {{model.foo}}</h2>', { moduleName: 'application' }));
        }
      }));
    }

    ['@test it renders with static parameters'](assert) {
      this.router.map(function() {
        this.route('engine-params-static');
      });
      this.addTemplate('engine-params-static', '{{mount "paramEngine" foo="bar"}}');

      return this.visit('/engine-params-static').then(() => {
        this.assertComponentElement(this.firstChild, { content: '<h2>Param Engine: bar</h2>' });
      });
    }

    ['@test it renders with bound parameters'](assert) {
      this.router.map(function() {
        this.route('engine-params-bound');
      });
      let controller;
      this.add('controller:engine-params-bound', Controller.extend({
        boundParamValue: null,
        init() {
          this._super();
          controller = this;
        }
      }));
      this.addTemplate('engine-params-bound', '{{mount "paramEngine" foo=boundParamValue}}');

      return this.visit('/engine-params-bound').then(() => {
        this.assertComponentElement(this.firstChild, { content: '<h2>Param Engine: </h2>' });

        this.runTask(() => set(controller, 'boundParamValue', 'bar'));

        this.assertComponentElement(this.firstChild, { content: '<h2>Param Engine: bar</h2>' });

        this.runTask(() => set(controller, 'boundParamValue', undefined));

        this.assertComponentElement(this.firstChild, { content: '<h2>Param Engine: </h2>' });

        this.runTask(() => set(controller, 'boundParamValue', 'bar'));

        this.assertComponentElement(this.firstChild, { content: '<h2>Param Engine: bar</h2>' });

        this.runTask(() => set(controller, 'boundParamValue', 'baz'));

        this.assertComponentElement(this.firstChild, { content: '<h2>Param Engine: baz</h2>' });

        this.runTask(() => set(controller, 'boundParamValue', 'bar'));

        this.assertComponentElement(this.firstChild, { content: '<h2>Param Engine: bar</h2>' });

        this.runTask(() => set(controller, 'boundParamValue', null));

        this.assertComponentElement(this.firstChild, { content: '<h2>Param Engine: </h2>' });
      });
    }

    ['@test it renders contextual components passed as parameter values'](assert) {
      this.router.map(function() {
        this.route('engine-params-contextual-component');
      });

      this.addComponent("foo-component", {
        template: `foo-component rendered! - {{app-bar-component}}`
      });
      this.addComponent('app-bar-component', {
        ComponentClass: Component.extend({ tagName: "" }),
        template: 'rendered app-bar-component from the app'
      });
      this.add('engine:componentParamEngine', Engine.extend({
        router: null,
        init() {
          this._super(...arguments);
          this.register('template:application', compile('{{model.foo}}', { moduleName: 'application' }));
        }
      }));
      this.addTemplate('engine-params-contextual-component', '{{mount "componentParamEngine" foo=(component "foo-component")}}');

      return this.visit('/engine-params-contextual-component').then(() => {
        this.assertComponentElement(this.firstChild.firstChild, { content: 'foo-component rendered! - rendered app-bar-component from the app' });
      });
    }
  });
}
