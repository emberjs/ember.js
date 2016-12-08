import { run } from 'ember-metal';
import Application from '../../system/application';
import ApplicationInstance from '../../system/application-instance';
import { jQuery } from 'ember-views';

let app;

QUnit.module('Ember.Application instance initializers', {
  teardown() {
    if (app) {
      run(() => app.destroy());
    }
  }
});

QUnit.test('initializers require proper \'name\' and \'initialize\' properties', function() {
  let MyApplication = Application.extend();

  expectAssertion(() => {
    run(() => {
      MyApplication.instanceInitializer({ name: 'initializer' });
    });
  });

  expectAssertion(() => {
    run(() => {
      MyApplication.instanceInitializer({ initialize() {} });
    });
  });
});

QUnit.test('initializers are passed an app instance', function() {
  let MyApplication = Application.extend();

  MyApplication.instanceInitializer({
    name: 'initializer',
    initialize(instance) {
      ok(instance instanceof ApplicationInstance, 'initialize is passed an application instance');
    }
  });

  run(() => {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });
});

QUnit.test('initializers can be registered in a specified order', function() {
  let order = [];
  let MyApplication = Application.extend();
  MyApplication.instanceInitializer({
    name: 'fourth',
    after: 'third',
    initialize(registry) {
      order.push('fourth');
    }
  });

  MyApplication.instanceInitializer({
    name: 'second',
    after: 'first',
    before: 'third',
    initialize(registry) {
      order.push('second');
    }
  });

  MyApplication.instanceInitializer({
    name: 'fifth',
    after: 'fourth',
    before: 'sixth',
    initialize(registry) {
      order.push('fifth');
    }
  });

  MyApplication.instanceInitializer({
    name: 'first',
    before: 'second',
    initialize(registry) {
      order.push('first');
    }
  });

  MyApplication.instanceInitializer({
    name: 'third',
    initialize(registry) {
      order.push('third');
    }
  });

  MyApplication.instanceInitializer({
    name: 'sixth',
    initialize(registry) {
      order.push('sixth');
    }
  });

  run(() => {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
});

QUnit.test('initializers can be registered in a specified order as an array', function() {
  let order = [];
  let MyApplication = Application.extend();

  MyApplication.instanceInitializer({
    name: 'third',
    initialize(registry) {
      order.push('third');
    }
  });

  MyApplication.instanceInitializer({
    name: 'second',
    after: 'first',
    before: ['third', 'fourth'],
    initialize(registry) {
      order.push('second');
    }
  });

  MyApplication.instanceInitializer({
    name: 'fourth',
    after: ['second', 'third'],
    initialize(registry) {
      order.push('fourth');
    }
  });

  MyApplication.instanceInitializer({
    name: 'fifth',
    after: 'fourth',
    before: 'sixth',
    initialize(registry) {
      order.push('fifth');
    }
  });

  MyApplication.instanceInitializer({
    name: 'first',
    before: ['second'],
    initialize(registry) {
      order.push('first');
    }
  });

  MyApplication.instanceInitializer({
    name: 'sixth',
    initialize(registry) {
      order.push('sixth');
    }
  });

  run(() => {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
});

QUnit.test('initializers can have multiple dependencies', function () {
  let order = [];
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

  Application.instanceInitializer(b);
  Application.instanceInitializer(a);
  Application.instanceInitializer(afterC);
  Application.instanceInitializer(afterB);
  Application.instanceInitializer(c);

  run(() => {
    app = Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  ok(order.indexOf(a.name) < order.indexOf(b.name), 'a < b');
  ok(order.indexOf(b.name) < order.indexOf(c.name), 'b < c');
  ok(order.indexOf(b.name) < order.indexOf(afterB.name), 'b < afterB');
  ok(order.indexOf(c.name) < order.indexOf(afterC.name), 'c < afterC');
});

QUnit.test('initializers set on Application subclasses should not be shared between apps', function() {
  let firstInitializerRunCount = 0;
  let secondInitializerRunCount = 0;
  let FirstApp = Application.extend();
  let firstApp, secondApp;

  FirstApp.instanceInitializer({
    name: 'first',
    initialize(registry) {
      firstInitializerRunCount++;
    }
  });
  let SecondApp = Application.extend();
  SecondApp.instanceInitializer({
    name: 'second',
    initialize(registry) {
      secondInitializerRunCount++;
    }
  });
  jQuery('#qunit-fixture').html('<div id="first"></div><div id="second"></div>');
  run(() => {
    firstApp = FirstApp.create({
      router: false,
      rootElement: '#qunit-fixture #first'
    });
  });
  equal(firstInitializerRunCount, 1, 'first initializer only was run');
  equal(secondInitializerRunCount, 0, 'first initializer only was run');
  run(() => {
    secondApp = SecondApp.create({
      router: false,
      rootElement: '#qunit-fixture #second'
    });
  });
  equal(firstInitializerRunCount, 1, 'second initializer only was run');
  equal(secondInitializerRunCount, 1, 'second initializer only was run');
  run(() => {
    firstApp.destroy();
    secondApp.destroy();
  });
});

QUnit.test('initializers are concatenated', function() {
  let firstInitializerRunCount = 0;
  let secondInitializerRunCount = 0;
  let FirstApp = Application.extend();
  let firstApp, secondApp;

  FirstApp.instanceInitializer({
    name: 'first',
    initialize(registry) {
      firstInitializerRunCount++;
    }
  });

  let SecondApp = FirstApp.extend();
  SecondApp.instanceInitializer({
    name: 'second',
    initialize(registry) {
      secondInitializerRunCount++;
    }
  });

  jQuery('#qunit-fixture').html('<div id="first"></div><div id="second"></div>');
  run(function() {
    firstApp = FirstApp.create({
      router: false,
      rootElement: '#qunit-fixture #first'
    });
  });
  equal(firstInitializerRunCount, 1, 'first initializer only was run when base class created');
  equal(secondInitializerRunCount, 0, 'first initializer only was run when base class created');
  firstInitializerRunCount = 0;
  run(function() {
    secondApp = SecondApp.create({
      router: false,
      rootElement: '#qunit-fixture #second'
    });
  });
  equal(firstInitializerRunCount, 1, 'first initializer was run when subclass created');
  equal(secondInitializerRunCount, 1, 'second initializers was run when subclass created');
  run(function() {
    firstApp.destroy();
    secondApp.destroy();
  });
});

QUnit.test('initializers are per-app', function() {
  expect(2);

  let FirstApp = Application.extend();

  FirstApp.instanceInitializer({
    name: 'abc',
    initialize(app) {}
  });

  expectAssertion(function() {
    FirstApp.instanceInitializer({
      name: 'abc',
      initialize(app) {}
    });
  });

  let SecondApp = Application.extend();
  SecondApp.instanceInitializer({
    name: 'abc',
    initialize(app) {}
  });

  ok(true, 'Two apps can have initializers named the same.');
});

QUnit.test('initializers are run before ready hook', function() {
  expect(2);

  let readyWasCalled = false;

  let MyApplication = Application.extend({
    ready() {
      ok(true, 'ready is called');
      readyWasCalled = true;
    }
  });

  MyApplication.instanceInitializer({
    name: 'initializer',
    initialize() {
      ok(!readyWasCalled, 'ready is not yet called');
    }
  });

  run(function() {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });
});

QUnit.test('initializers are executed in their own context', function() {
  expect(1);

  let MyApplication = Application.extend();

  MyApplication.instanceInitializer({
    name: 'coolInitializer',
    myProperty: 'cool',
    initialize(registry, application) {
      equal(this.myProperty, 'cool', 'should have access to its own context');
    }
  });

  run(() => {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });
});

QUnit.test('initializers get an instance on app reset', function() {
  expect(2);

  let MyApplication = Application.extend();

  MyApplication.instanceInitializer({
    name: 'giveMeAnInstance',
    initialize(instance) {
      ok(!!instance, 'Initializer got an instance');
    }
  });

  run(() => {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  run(app, 'reset');
});
