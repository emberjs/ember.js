import { moduleFor, ApplicationTest, RenderingTest } from '../utils/test-case';
import { compile } from '../utils/helpers';
import Controller from 'ember-runtime/controllers/controller';
import { set } from 'ember-metal/property_set';
import Engine from 'ember-application/system/engine';
import { getEngineParent } from 'ember-application/system/engine-parent';
import { getOwner } from 'container';

moduleFor('{{mount}} assertions', class extends RenderingTest {
  ['@test it asserts that only a single param is passed']() {
    expectAssertion(() => {
      this.render('{{mount "chat" "foo"}}');
    }, /You can only pass a single argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}./i);
  }

  ['@test it asserts that the engine name argument is quoted']() {
    expectAssertion(() => {
      this.render('{{mount chat}}');
    }, /The first argument of {{mount}} must be quoted, e.g. {{mount "chat-engine"}}./i);
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

    this.registerEngine('chat', Engine.extend({
      router: null,

      init() {
        this._super(...arguments);

        Object.keys(engineRegistrations).forEach(fullName => {
          this.register(fullName, engineRegistrations[fullName]);
        });
      }
    }));

    this.registerTemplate('index', '{{mount "chat"}}');
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
});
