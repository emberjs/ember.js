import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import Application from 'ember-application/system/application';
import jQuery from 'ember-views/system/jquery';
import isEnabled from 'ember-metal/features';

var app;

QUnit.module('Ember.Application initializers', {
  setup() {
  },

  teardown() {
    if (app) {
      run(function() { app.destroy(); });
    }
  }
});

QUnit.test('initializers require proper \'name\' and \'initialize\' properties', function() {
  var MyApplication = Application.extend();

  expectAssertion(function() {
    run(function() {
      MyApplication.initializer({ name: 'initializer' });
    });
  });

  expectAssertion(function() {
    run(function() {
      MyApplication.initializer({ initialize: Ember.K });
    });
  });
});

if (isEnabled('ember-application-visit')) {
  QUnit.test('initializers that thorws causes the boot promise to reject with the error', function() {
    QUnit.expect(2);
    QUnit.stop();

    var MyApplication = Application.extend();

    MyApplication.initializer({
      name: 'initializer',
      initialize() { throw new Error('boot failure'); }
    });

    var app = MyApplication.create({
      autoboot: false
    });

    try {
      app.boot().then(
        (app) => {
          QUnit.start();
          ok(false, 'The boot promise should not resolve when there is a boot error');
        },
        (err) => {
          QUnit.start();
          ok(err instanceof Error, 'The boot promise should reject with an error');
          equal(err.message, 'boot failure');
        }
      );
    } catch(e) {
      QUnit.start();
      ok(false, 'The boot method should not throw');
      throw e;
    }
  });
}

QUnit.test('initializers are passed an App', function() {
  var MyApplication = Application.extend();

  MyApplication.initializer({
    name: 'initializer',
    initialize(App) {
      ok(App instanceof Application, 'initialize is passed an Application');
    }
  });

  run(function() {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });
});

QUnit.test('initializers can be registered in a specified order', function() {
  var order = [];
  var MyApplication = Application.extend();
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

  run(function() {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
});

QUnit.test('initializers can be registered in a specified order as an array', function() {
  var order = [];
  var MyApplication = Application.extend();


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

  run(function() {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
});

QUnit.test('initializers can have multiple dependencies', function () {
  var order = [];
  var a = {
    name: 'a',
    before: 'b',
    initialize(registry) {
      order.push('a');
    }
  };
  var b = {
    name: 'b',
    initialize(registry) {
      order.push('b');
    }
  };
  var c = {
    name: 'c',
    after: 'b',
    initialize(registry) {
      order.push('c');
    }
  };
  var afterB = {
    name: 'after b',
    after: 'b',
    initialize(registry) {
      order.push('after b');
    }
  };
  var afterC = {
    name: 'after c',
    after: 'c',
    initialize(registry) {
      order.push('after c');
    }
  };

  Application.initializer(b);
  Application.initializer(a);
  Application.initializer(afterC);
  Application.initializer(afterB);
  Application.initializer(c);

  run(function() {
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
  var firstInitializerRunCount = 0;
  var secondInitializerRunCount = 0;
  var FirstApp = Application.extend();
  var firstApp, secondApp;
  FirstApp.initializer({
    name: 'first',
    initialize(registry) {
      firstInitializerRunCount++;
    }
  });
  var SecondApp = Application.extend();
  SecondApp.initializer({
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
  equal(firstInitializerRunCount, 1, 'first initializer only was run');
  equal(secondInitializerRunCount, 0, 'first initializer only was run');
  run(function() {
    secondApp = SecondApp.create({
      router: false,
      rootElement: '#qunit-fixture #second'
    });
  });
  equal(firstInitializerRunCount, 1, 'second initializer only was run');
  equal(secondInitializerRunCount, 1, 'second initializer only was run');
  run(function() {
    firstApp.destroy();
    secondApp.destroy();
  });
});

QUnit.test('initializers are concatenated', function() {
  var firstInitializerRunCount = 0;
  var secondInitializerRunCount = 0;
  var FirstApp = Application.extend();
  var firstApp, secondApp;
  FirstApp.initializer({
    name: 'first',
    initialize(registry) {
      firstInitializerRunCount++;
    }
  });

  var SecondApp = FirstApp.extend();
  SecondApp.initializer({
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
  expect(0);
  var FirstApp = Application.extend();
  FirstApp.initializer({
    name: 'shouldNotCollide',
    initialize(application) {}
  });

  var SecondApp = Application.extend();
  SecondApp.initializer({
    name: 'shouldNotCollide',
    initialize(application) {}
  });
});

QUnit.test('initializers should be executed in their own context', function() {
  expect(1);
  var MyApplication = Application.extend();

  MyApplication.initializer({
    name: 'coolInitializer',
    myProperty: 'cool',
    initialize(application) {
      equal(this.myProperty, 'cool', 'should have access to its own context');
    }
  });

  run(function() {
    app = MyApplication.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });
});

QUnit.test('initializers should throw a deprecation warning when receiving a second argument', function() {
  expect(1);

  var MyApplication = Application.extend();

  MyApplication.initializer({
    name: 'deprecated',
    initialize(registry, application) {
    }
  });

  expectDeprecation(function() {
    run(function() {
      app = MyApplication.create({
        router: false,
        rootElement: '#qunit-fixture'
      });
    });
  }, /The `initialize` method for Application initializer 'deprecated' should take only one argument - `App`, an instance of an `Application`./);
});
