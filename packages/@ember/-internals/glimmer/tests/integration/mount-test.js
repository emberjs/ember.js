import {
  moduleFor,
  ApplicationTestCase,
  ModuleBasedTestResolver,
  RenderingTestCase,
  runTask,
} from 'internal-test-helpers';

import { DEBUG } from '@glimmer/env';
import { set } from '@ember/object';
import { helper } from '@ember/component/helper';
import { getOwner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import Engine, { getEngineParent } from '@ember/engine';
import { precompileTemplate } from '@ember/template-compilation';

import { backtrackingMessageFor } from '../utils/debug-stack';
import Component from '@glimmer/component';
import { setComponentTemplate } from '@glimmer/manager';

moduleFor(
  '{{mount}} single param assertion',
  class extends RenderingTestCase {
    ['@test it asserts that only a single param is passed']() {
      expectAssertion(() => {
        this.render('{{mount "chat" "foo"}}');
      }, /You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}./i);
    }
  }
);

moduleFor(
  '{{mount}} assertions',
  class extends RenderingTestCase {
    ['@test it asserts when an invalid engine name is provided']() {
      expectAssertion(() => {
        this.render('{{mount this.engineName}}', { engineName: {} });
      }, /Invalid engine name '\[object Object\]' specified, engine name must be either a string, null or undefined./i);
    }

    ['@test it asserts that the specified engine is registered']() {
      expectAssertion(() => {
        this.render('{{mount "chat"}}');
      }, /You used `{{mount 'chat'}}`, but the engine 'chat' can not be found./i);
    }
  }
);

moduleFor(
  '{{mount}} test',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      let engineRegistrations = (this.engineRegistrations = {});

      this.add(
        'engine:chat',
        class extends Engine {
          router = null;
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);

            Object.keys(engineRegistrations).forEach((fullName) => {
              this.register(fullName, engineRegistrations[fullName]);
            });
          }
        }
      );

      this.add('template:index', precompileTemplate('{{mount "chat"}}'));
    }

    ['@test it boots an engine, instantiates its application controller, and renders its application template'](
      assert
    ) {
      this.engineRegistrations['template:application'] = precompileTemplate(
        '<h2>Chat here, {{this.username}}</h2>'
      );

      let controller;

      this.engineRegistrations['controller:application'] = class extends Controller {
        username = 'dgeb';

        init() {
          super.init(...arguments);
          controller = this;
        }
      };

      return this.visit('/').then(() => {
        assert.ok(controller, "engine's application controller has been instantiated");

        let engineInstance = getOwner(controller);
        assert.strictEqual(
          getEngineParent(engineInstance),
          this.applicationInstance,
          'engine instance has the application instance as its parent'
        );

        this.assertInnerHTML('<h2>Chat here, dgeb</h2>');

        runTask(() => set(controller, 'username', 'chancancode'));

        this.assertInnerHTML('<h2>Chat here, chancancode</h2>');

        runTask(() => set(controller, 'username', 'dgeb'));

        this.assertInnerHTML('<h2>Chat here, dgeb</h2>');
      });
    }

    async ['@test it emits a useful backtracking re-render assertion message'](assert) {
      if (!DEBUG) {
        assert.ok(true, 'nothing to do in prod builds, assertion is stripped');
        return;
      }

      this.router.map(function () {
        this.route('route-with-mount');
      });

      this.add('template:index', precompileTemplate(''));
      this.add('template:route-with-mount', precompileTemplate('{{mount "chat"}}'));

      this.engineRegistrations['template:application'] = precompileTemplate(
        'hi {{this.person.name}} [{{component-with-backtracking-set person=this.person}}]'
      );
      this.engineRegistrations['controller:application'] = class extends Controller {
        person = {
          name: 'Alex',
          toString() {
            return `Person (${this.name})`;
          },
        };
      };

      let ComponentWithBacktrackingSet = class extends Component {
        constructor(owner, args) {
          super(owner, args);
          set(this.args.person, 'name', 'Ben');
        }
      };

      setComponentTemplate(
        precompileTemplate('[component {{@person.name}}]'),
        ComponentWithBacktrackingSet
      );

      this.engineRegistrations['component:component-with-backtracking-set'] =
        ComponentWithBacktrackingSet;

      let expectedBacktrackingMessage = backtrackingMessageFor('name', 'Person \\(Ben\\)', {
        includeTopLevel: 'outlet',
        renderTree: [
          '{{outlet}} for application',
          '@Component',
          '{{outlet}} for route-with-mount',
          '@Component',
          'chat',
          'this.person.name',
        ],
      });

      await this.visit('/');

      return assert.rejectsAssertion(this.visit('/route-with-mount'), expectedBacktrackingMessage);
    }

    ['@test it renders with a bound engine name']() {
      this.router.map(function () {
        this.route('bound-engine-name');
      });
      let controller;
      this.add(
        'controller:bound-engine-name',
        class extends Controller {
          engineName = null;

          init() {
            super.init(...arguments);
            controller = this;
          }
        }
      );
      this.add('template:bound-engine-name', precompileTemplate('{{mount this.engineName}}'));

      this.add(
        'engine:foo',
        class extends Engine {
          router = null;
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register('template:application', precompileTemplate('<h2>Foo Engine</h2>'));
          }
        }
      );
      this.add(
        'engine:bar',
        class extends Engine {
          router = null;
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register('template:application', precompileTemplate('<h2>Bar Engine</h2>'));
          }
        }
      );

      return this.visit('/bound-engine-name').then(() => {
        this.assertInnerHTML('<!---->');

        runTask(() => set(controller, 'engineName', 'foo'));

        this.assertInnerHTML('<h2>Foo Engine</h2>');

        runTask(() => set(controller, 'engineName', undefined));

        this.assertInnerHTML('<!---->');

        runTask(() => set(controller, 'engineName', 'foo'));

        this.assertInnerHTML('<h2>Foo Engine</h2>');

        runTask(() => set(controller, 'engineName', 'bar'));

        this.assertInnerHTML('<h2>Bar Engine</h2>');

        runTask(() => set(controller, 'engineName', 'foo'));

        this.assertInnerHTML('<h2>Foo Engine</h2>');

        runTask(() => set(controller, 'engineName', null));

        this.assertInnerHTML('<!---->');
      });
    }

    ['@test it declares the event dispatcher as a singleton']() {
      this.router.map(function () {
        this.route('engine-event-dispatcher-singleton');
      });

      let controller;
      let component;

      this.add(
        'controller:engine-event-dispatcher-singleton',
        class extends Controller {
          init() {
            super.init(...arguments);
            controller = this;
          }
        }
      );
      this.add('template:engine-event-dispatcher-singleton', precompileTemplate('{{mount "foo"}}'));

      this.add(
        'engine:foo',
        class extends Engine {
          router = null;
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register(
              'template:application',
              precompileTemplate('<h2>Foo Engine: {{tagless-component}}</h2>')
            );
            this.register(
              'component:tagless-component',
              setComponentTemplate(
                precompileTemplate('Tagless Component'),
                class extends Component {
                  constructor(owner, args) {
                    super(owner, args);
                    component = this;
                  }
                }
              )
            );
          }
        }
      );

      return this.visit('/engine-event-dispatcher-singleton').then(() => {
        this.assertInnerHTML('<h2>Foo Engine: Tagless Component</h2>');

        let controllerOwnerEventDispatcher = getOwner(controller).lookup('event_dispatcher:main');
        let taglessComponentOwnerEventDispatcher =
          getOwner(component).lookup('event_dispatcher:main');

        this.assert.strictEqual(
          controllerOwnerEventDispatcher,
          taglessComponentOwnerEventDispatcher
        );
      });
    }
  }
);

moduleFor(
  '{{mount}} params tests',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      this.add(
        'engine:paramEngine',
        class extends Engine {
          router = null;
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register(
              'template:application',
              precompileTemplate('<h2>Param Engine: {{@model.foo}}</h2>')
            );
          }
        }
      );
    }

    ['@test it renders with static parameters']() {
      this.router.map(function () {
        this.route('engine-params-static');
      });
      this.add(
        'template:engine-params-static',
        precompileTemplate('{{mount "paramEngine" model=(hash foo="bar")}}')
      );

      return this.visit('/engine-params-static').then(() => {
        this.assertInnerHTML('<h2>Param Engine: bar</h2>');
      });
    }

    ['@test it renders with bound parameters']() {
      this.router.map(function () {
        this.route('engine-params-bound');
      });
      let controller;
      this.add(
        'controller:engine-params-bound',
        class extends Controller {
          boundParamValue = null;
          init() {
            super.init(...arguments);
            controller = this;
          }
        }
      );
      this.add(
        'template:engine-params-bound',
        precompileTemplate('{{mount "paramEngine" model=(hash foo=this.boundParamValue)}}')
      );

      return this.visit('/engine-params-bound').then(() => {
        this.assertInnerHTML('<h2>Param Engine: </h2>');

        runTask(() => set(controller, 'boundParamValue', 'bar'));

        this.assertInnerHTML('<h2>Param Engine: bar</h2>');

        runTask(() => set(controller, 'boundParamValue', undefined));

        this.assertInnerHTML('<h2>Param Engine: </h2>');

        runTask(() => set(controller, 'boundParamValue', 'bar'));

        this.assertInnerHTML('<h2>Param Engine: bar</h2>');

        runTask(() => set(controller, 'boundParamValue', 'baz'));

        this.assertInnerHTML('<h2>Param Engine: baz</h2>');

        runTask(() => set(controller, 'boundParamValue', 'bar'));

        this.assertInnerHTML('<h2>Param Engine: bar</h2>');

        runTask(() => set(controller, 'boundParamValue', null));

        this.assertInnerHTML('<h2>Param Engine: </h2>');
      });
    }

    ['@test it renders contextual components passed as parameter values']() {
      this.router.map(function () {
        this.route('engine-params-contextual-component');
      });

      this.add(
        'component:foo-component',
        setComponentTemplate(
          precompileTemplate('foo-component rendered! - {{app-bar-component}}'),
          class extends Component {}
        )
      );
      this.add(
        'component:app-bar-component',
        setComponentTemplate(
          precompileTemplate('rendered app-bar-component from the app'),
          class extends Component {}
        )
      );
      this.add(
        'engine:componentParamEngine',
        class extends Engine {
          router = null;
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register('template:application', precompileTemplate('{{@model.foo}}'));
          }
        }
      );
      this.add(
        'template:engine-params-contextual-component',
        precompileTemplate(
          '{{mount "componentParamEngine" model=(hash foo=(component "foo-component"))}}'
        )
      );

      return this.visit('/engine-params-contextual-component').then(() => {
        this.assertText('foo-component rendered! - rendered app-bar-component from the app');
      });
    }
  }
);

moduleFor(
  '{{mount}} owner tests',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      this.owners = {};
      let owners = this.owners;
      let stash = (this.stash = {});
      let capture = (name) =>
        class extends Component {
          constructor(owner, args) {
            super(owner, args);
            owners[name] = getOwner(this);
          }
        };

      this.router.map(function () {
        this.route('owner-check');
      });

      this.add(
        'component:app-check',
        setComponentTemplate(precompileTemplate('app-check'), capture('appCheck'))
      );

      this.add(
        'engine:owner-engine',
        class extends Engine {
          router = null;
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register(
              'template:application',
              precompileTemplate(
                '<EngineOuter />{{@model.foo}}{{stash-curried (component "engine-check")}}'
              )
            );
            this.register(
              'component:engine-outer',
              setComponentTemplate(precompileTemplate('<EngineInner />'), capture('outer'))
            );
            this.register(
              'component:engine-check',
              setComponentTemplate(precompileTemplate('<EngineProbe />'), capture('engineCheck'))
            );
            this.register(
              'component:engine-probe',
              setComponentTemplate(precompileTemplate('probe'), capture('engineProbe'))
            );
            this.register(
              'helper:stash-curried',
              helper(([curried]) => {
                stash.curried = curried;
              })
            );
            this.register(
              'component:engine-inner',
              setComponentTemplate(precompileTemplate('engine-inner'), capture('inner'))
            );
          }
        }
      );
    }

    ['@test components rendered inside an engine are created with the engine as their owner']() {
      this.add(
        'template:owner-check',
        precompileTemplate('{{mount "owner-engine" model=(hash foo=(component "app-check"))}}')
      );

      return this.visit('/owner-check').then(() => {
        let { outer, inner } = this.owners;

        this.assert.ok(outer !== this.applicationInstance, 'engine owner is not the app');
        this.assert.ok(getEngineParent(outer) === this.applicationInstance, 'engine parent');
        this.assert.ok(inner === outer, 'nested components share the engine owner');
        this.assertText('engine-innerapp-check');
      });
    }

    // Compatibility quirk, spec 06-managers.md section 2.2: a curried component is created with
    // the owner of the scope that invokes it, not the owner captured by currying.
    ['@test a component curried in the application is created with the engine as owner when invoked in an engine']() {
      this.add(
        'template:owner-check',
        precompileTemplate('{{mount "owner-engine" model=(hash foo=(component "app-check"))}}')
      );

      return this.visit('/owner-check').then(() => {
        let { appCheck, outer } = this.owners;

        this.assert.ok(appCheck, 'the curried component was created');
        this.assert.ok(appCheck === outer, 'created with the engine instance as owner');
        this.assert.ok(appCheck !== this.applicationInstance, 'not with the application');
      });
    }

    ['@test a component curried in an engine is created with the host owner when invoked in the host'](
      assert
    ) {
      this.add('controller:owner-check', class extends Controller {});
      this.add(
        'template:owner-check',
        precompileTemplate('{{mount "owner-engine"}}{{#if this.show}}{{this.stash.curried}}{{/if}}')
      );

      return this.visit('/owner-check').then(() => {
        let controller = this.applicationInstance.lookup('controller:owner-check');
        controller.stash = this.stash;
        runTask(() => set(controller, 'show', true));

        let { engineCheck, engineProbe, outer } = this.owners;
        assert.ok(engineCheck, 'the curried component was created');
        assert.ok(
          engineCheck === this.applicationInstance,
          'created with the host (application) owner'
        );
        assert.ok(engineProbe === outer, 'its layout runs with the engine instance');
      });
    }
  }
);
