import { assign } from 'ember-utils';
import { moduleFor, AutobootApplicationTestCase } from 'internal-test-helpers';
import { Application } from 'ember-application';
import { jQuery } from 'ember-views';

moduleFor('Ember.Application initializers', class extends AutobootApplicationTestCase {
  constructor() {
    jQuery('#qunit-fixture').html(`
      <div id="one">ONE</div>
      <div id="two">TWO</div>
    `);
    super();
  }

  get applicationOptions() {
    return assign(super.applicationOptions, {
      rootElement: '#one'
    });
  }

  createSecondApplication(options, MyApplication=Application) {
    let myOptions = assign(this.applicationOptions, {
      rootElement: '#two'
    }, options);
    let secondApp = this.secondApp = MyApplication.create(myOptions);
    return secondApp;
  }

  teardown() {
    super.teardown();

    if (this.secondApp) {
      this.runTask(() => this.secondApp.destroy());
    }
  }

  [`@test initializers require proper 'name' and 'initialize' properties`]() {
    let MyApplication = Application.extend();

    expectAssertion(() => {
      MyApplication.initializer({ name: 'initializer' });
    });

    expectAssertion(() => {
      MyApplication.initializer({ initialize() {} });
    });
  }

  [`@test initializers that throw errors cause the boot promise to reject with the error`](assert) {
    assert.expect(2);

    let MyApplication = Application.extend();

    MyApplication.initializer({
      name: 'initializer',
      initialize() { throw new Error('boot failure'); }
    });

    this.runTask(() => {
      this.createApplication({
        autoboot: false
      }, MyApplication);
    });

    let app = this.application;

    try {
      this.runTask(() => {
        app.boot().then(app => {
          assert.ok(false, 'The boot promise should not resolve when there is a boot error');
        }, error => {
          assert.ok(error instanceof Error, 'The boot promise should reject with an error');
          assert.equal(error.message, 'boot failure');
        });
      });
    } catch (error) {
      assert.ok(false, 'The boot method should not throw');
      throw error;
    }
  }

  [`@test initializers are passed an App`](assert) {
    let MyApplication = Application.extend();

    MyApplication.initializer({
      name: 'initializer',
      initialize(App) {
        assert.ok(App instanceof Application, 'initialize is passed an Application');
      }
    });

    this.runTask(() => this.createApplication({}, MyApplication));
  }

  [`@test initializers can be registered in a specified order`](assert) {
    let order = [];
    let MyApplication = Application.extend();

    MyApplication.initializer({
      name: 'fourth',
      after: 'third',
      initialize(registry) {
        order.push('fourth');
      }
    });

    MyApplication.initializer({
      name: 'second',
      after: 'first',
      before: 'third',
      initialize(registry) {
        order.push('second');
      }
    });

    MyApplication.initializer({
      name: 'fifth',
      after: 'fourth',
      before: 'sixth',
      initialize(registry) {
        order.push('fifth');
      }
    });

    MyApplication.initializer({
      name: 'first',
      before: 'second',
      initialize(registry) {
        order.push('first');
      }
    });

    MyApplication.initializer({
      name: 'third',
      initialize(registry) {
        order.push('third');
      }
    });

    MyApplication.initializer({
      name: 'sixth',
      initialize(registry) {
        order.push('sixth');
      }
    });

    this.runTask(() => this.createApplication({}, MyApplication));

    assert.deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
  }

  [`@test initializers can be registered in a specified order as an array`](assert) {
    let order = [];
    let MyApplication = Application.extend();

    MyApplication.initializer({
      name: 'third',
      initialize(registry) {
        order.push('third');
      }
    });

    MyApplication.initializer({
      name: 'second',
      after: 'first',
      before: ['third', 'fourth'],
      initialize(registry) {
        order.push('second');
      }
    });

    MyApplication.initializer({
      name: 'fourth',
      after: ['second', 'third'],
      initialize(registry) {
        order.push('fourth');
      }
    });

    MyApplication.initializer({
      name: 'fifth',
      after: 'fourth',
      before: 'sixth',
      initialize(registry) {
        order.push('fifth');
      }
    });

    MyApplication.initializer({
      name: 'first',
      before: ['second'],
      initialize(registry) {
        order.push('first');
      }
    });

    MyApplication.initializer({
      name: 'sixth',
      initialize(registry) {
        order.push('sixth');
      }
    });

    this.runTask(() => this.createApplication({}, MyApplication));

    assert.deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
  }

  [`@test initializers can have multiple dependencies`](assert) {
    let order = [];
    let MyApplication = Application.extend();
    let a = {
      name: 'a',
      before: 'b',
      initialize(registry) {
        order.push('a');
      }
    };
    let b = {
      name: 'b',
      initialize(registry) {
        order.push('b');
      }
    };
    let c = {
      name: 'c',
      after: 'b',
      initialize(registry) {
        order.push('c');
      }
    };
    let afterB = {
      name: 'after b',
      after: 'b',
      initialize(registry) {
        order.push('after b');
      }
    };
    let afterC = {
      name: 'after c',
      after: 'c',
      initialize(registry) {
        order.push('after c');
      }
    };

    MyApplication.initializer(b);
    MyApplication.initializer(a);
    MyApplication.initializer(afterC);
    MyApplication.initializer(afterB);
    MyApplication.initializer(c);

    this.runTask(() => this.createApplication({}, MyApplication));

    assert.ok(order.indexOf(a.name) < order.indexOf(b.name), 'a < b');
    assert.ok(order.indexOf(b.name) < order.indexOf(c.name), 'b < c');
    assert.ok(order.indexOf(b.name) < order.indexOf(afterB.name), 'b < afterB');
    assert.ok(order.indexOf(c.name) < order.indexOf(afterC.name), 'c < afterC');
  }

  [`@test initializers set on Application subclasses are not shared between apps`](assert) {
    let firstInitializerRunCount = 0;
    let secondInitializerRunCount = 0;
    let FirstApp = Application.extend();

    FirstApp.initializer({
      name: 'first',
      initialize(registry) {
        firstInitializerRunCount++;
      }
    });

    let SecondApp = Application.extend();

    SecondApp.initializer({
      name: 'second',
      initialize(registry) {
        secondInitializerRunCount++;
      }
    });

    this.runTask(() => this.createApplication({}, FirstApp));

    assert.equal(firstInitializerRunCount, 1, 'first initializer only was run');
    assert.equal(secondInitializerRunCount, 0, 'first initializer only was run');

    this.runTask(() => this.createSecondApplication({}, SecondApp));

    assert.equal(firstInitializerRunCount, 1, 'second initializer only was run');
    assert.equal(secondInitializerRunCount, 1, 'second initializer only was run');
  }

  [`@test initializers are concatenated`](assert) {
    let firstInitializerRunCount = 0;
    let secondInitializerRunCount = 0;
    let FirstApp = Application.extend();

    FirstApp.initializer({
      name: 'first',
      initialize(registry) {
        firstInitializerRunCount++;
      }
    });

    let SecondApp = FirstApp.extend();
    SecondApp.initializer({
      name: 'second',
      initialize(registry) {
        secondInitializerRunCount++;
      }
    });

    this.runTask(() => this.createApplication({}, FirstApp));

    assert.equal(firstInitializerRunCount, 1, 'first initializer only was run when base class created');
    assert.equal(secondInitializerRunCount, 0, 'first initializer only was run when base class created');

    firstInitializerRunCount = 0;
    this.runTask(() => this.createSecondApplication({}, SecondApp));

    assert.equal(firstInitializerRunCount, 1, 'first initializer was run when subclass created');
    assert.equal(secondInitializerRunCount, 1, 'second initializers was run when subclass created');
  }

  [`@test initializers are per-app`](assert) {
    assert.expect(2);

    let FirstApp = Application.extend();

    FirstApp.initializer({
      name: 'abc',
      initialize(app) {}
    });

    expectAssertion(() => {
      FirstApp.initializer({
        name: 'abc',
        initialize(app) {}
      });
    });

    let SecondApp = Application.extend();
    SecondApp.instanceInitializer({
      name: 'abc',
      initialize(app) {}
    });

    assert.ok(true, 'Two apps can have initializers named the same.');
  }

  [`@test initializers are executed in their own context`](assert) {
    assert.expect(1);
    let MyApplication = Application.extend();

    MyApplication.initializer({
      name: 'coolInitializer',
      myProperty: 'cool',
      initialize(application) {
        assert.equal(this.myProperty, 'cool', 'should have access to its own context');
      }
    });

    this.runTask(() => this.createApplication({}, MyApplication));
  }

  [`@test initializers throw a deprecation warning when receiving a second argument`](assert) {
    assert.expect(1);

    let MyApplication = Application.extend();

    MyApplication.initializer({
      name: 'deprecated',
      initialize(registry, application) {
      }
    });

    expectDeprecation(() => {
      this.runTask(() => this.createApplication({}, MyApplication));
    }, /The `initialize` method for Application initializer 'deprecated' should take only one argument - `App`, an instance of an `Application`./);
  }
});
