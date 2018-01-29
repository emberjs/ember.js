import { assign } from 'ember-utils';
import { moduleFor, AutobootApplicationTestCase } from 'internal-test-helpers';
import { Application, ApplicationInstance } from 'ember-application';

moduleFor('Application instance initializers', class extends AutobootApplicationTestCase {
  get fixture() {
    return `<div id="one">ONE</div>
      <div id="two">TWO</div>
    `;
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
      MyApplication.instanceInitializer({ name: 'initializer' });
    });

    expectAssertion(() => {
      MyApplication.instanceInitializer({ initialize() {} });
    });

    this.runTask(() => this.createApplication({}, MyApplication));
  }

  [`@test initializers are passed an app instance`](assert) {
    let MyApplication = Application.extend();

    MyApplication.instanceInitializer({
      name: 'initializer',
      initialize(instance) {
        assert.ok(instance instanceof ApplicationInstance, 'initialize is passed an application instance');
      }
    });

    this.runTask(() => this.createApplication({}, MyApplication));
  }

  [`@test initializers can be registered in a specified order`](assert) {
    let order = [];
    let MyApplication = Application.extend();

    MyApplication.instanceInitializer({
      name: 'fourth',
      after: 'third',
      initialize() {
        order.push('fourth');
      }
    });

    MyApplication.instanceInitializer({
      name: 'second',
      after: 'first',
      before: 'third',
      initialize() {
        order.push('second');
      }
    });

    MyApplication.instanceInitializer({
      name: 'fifth',
      after: 'fourth',
      before: 'sixth',
      initialize() {
        order.push('fifth');
      }
    });

    MyApplication.instanceInitializer({
      name: 'first',
      before: 'second',
      initialize() {
        order.push('first');
      }
    });

    MyApplication.instanceInitializer({
      name: 'third',
      initialize() {
        order.push('third');
      }
    });

    MyApplication.instanceInitializer({
      name: 'sixth',
      initialize() {
        order.push('sixth');
      }
    });

    this.runTask(() => this.createApplication({}, MyApplication));

    assert.deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
  }

  [`@test initializers can be registered in a specified order as an array`](assert) {
    let order = [];
    let MyApplication = Application.extend();

    MyApplication.instanceInitializer({
      name: 'third',
      initialize() {
        order.push('third');
      }
    });

    MyApplication.instanceInitializer({
      name: 'second',
      after: 'first',
      before: ['third', 'fourth'],
      initialize() {
        order.push('second');
      }
    });

    MyApplication.instanceInitializer({
      name: 'fourth',
      after: ['second', 'third'],
      initialize() {
        order.push('fourth');
      }
    });

    MyApplication.instanceInitializer({
      name: 'fifth',
      after: 'fourth',
      before: 'sixth',
      initialize() {
        order.push('fifth');
      }
    });

    MyApplication.instanceInitializer({
      name: 'first',
      before: ['second'],
      initialize() {
        order.push('first');
      }
    });

    MyApplication.instanceInitializer({
      name: 'sixth',
      initialize() {
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
      initialize() {
        order.push('a');
      }
    };
    let b = {
      name: 'b',
      initialize() {
        order.push('b');
      }
    };
    let c = {
      name: 'c',
      after: 'b',
      initialize() {
        order.push('c');
      }
    };
    let afterB = {
      name: 'after b',
      after: 'b',
      initialize() {
        order.push('after b');
      }
    };
    let afterC = {
      name: 'after c',
      after: 'c',
      initialize() {
        order.push('after c');
      }
    };

    MyApplication.instanceInitializer(b);
    MyApplication.instanceInitializer(a);
    MyApplication.instanceInitializer(afterC);
    MyApplication.instanceInitializer(afterB);
    MyApplication.instanceInitializer(c);

    this.runTask(() => this.createApplication({}, MyApplication));

    assert.ok(order.indexOf(a.name) < order.indexOf(b.name), 'a < b');
    assert.ok(order.indexOf(b.name) < order.indexOf(c.name), 'b < c');
    assert.ok(order.indexOf(b.name) < order.indexOf(afterB.name), 'b < afterB');
    assert.ok(order.indexOf(c.name) < order.indexOf(afterC.name), 'c < afterC');
  }

  [`@test initializers set on Application subclasses should not be shared between apps`](assert) {
    let firstInitializerRunCount = 0;
    let secondInitializerRunCount = 0;
    let FirstApp = Application.extend();

    FirstApp.instanceInitializer({
      name: 'first',
      initialize() {
        firstInitializerRunCount++;
      }
    });

    let SecondApp = Application.extend();
    SecondApp.instanceInitializer({
      name: 'second',
      initialize() {
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

    FirstApp.instanceInitializer({
      name: 'first',
      initialize() {
        firstInitializerRunCount++;
      }
    });

    let SecondApp = FirstApp.extend();
    SecondApp.instanceInitializer({
      name: 'second',
      initialize() {
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
    FirstApp.instanceInitializer({
      name: 'abc',
      initialize() {}
    });

    expectAssertion(function() {
      FirstApp.instanceInitializer({
        name: 'abc',
        initialize() {}
      });
    });

    this.runTask(() => this.createApplication({}, FirstApp));

    let SecondApp = Application.extend();
    SecondApp.instanceInitializer({
      name: 'abc',
      initialize() {}
    });

    this.runTask(() => this.createSecondApplication({}, SecondApp));

    assert.ok(true, 'Two apps can have initializers named the same.');
  }

  [`@test initializers are run before ready hook`](assert) {
    assert.expect(2);

    let MyApplication = Application.extend({
      ready() {
        assert.ok(true, 'ready is called');
        readyWasCalled = false;
      }
    });
    let readyWasCalled = false;

    MyApplication.instanceInitializer({
      name: 'initializer',
      initialize() {
        assert.ok(!readyWasCalled, 'ready is not yet called');
      }
    });

    this.runTask(() => this.createApplication({}, MyApplication));
  }

  [`@test initializers are executed in their own context`](assert) {
    assert.expect(1);

    let MyApplication = Application.extend();

    MyApplication.instanceInitializer({
      name: 'coolInitializer',
      myProperty: 'cool',
      initialize() {
        assert.equal(this.myProperty, 'cool', 'should have access to its own context');
      }
    });

    this.runTask(() => this.createApplication({}, MyApplication));
  }

  [`@test initializers get an instance on app reset`](assert) {
    assert.expect(2);

    let MyApplication = Application.extend();

    MyApplication.instanceInitializer({
      name: 'giveMeAnInstance',
      initialize(instance) {
        assert.ok(!!instance, 'Initializer got an instance');
      }
    });

    this.runTask(() => this.createApplication({}, MyApplication));

    this.runTask(() => this.application.reset());
  }
});
