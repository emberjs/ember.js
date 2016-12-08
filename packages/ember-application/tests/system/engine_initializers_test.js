import { run } from 'ember-metal';
import Engine from '../../system/engine';

let MyEngine, myEngine, myEngineInstance;

QUnit.module('Ember.Engine initializers', {
  setup() {
  },

  teardown() {
    run(() => {
      if (myEngineInstance) {
        myEngineInstance.destroy();
      }

      if (myEngine) {
        myEngine.destroy();
      }
    });
  }
});

QUnit.test('initializers require proper \'name\' and \'initialize\' properties', function() {
  MyEngine = Engine.extend();

  expectAssertion(() => {
    run(() => {
      MyEngine.initializer({ name: 'initializer' });
    });
  });

  expectAssertion(() => {
    run(() => {
      MyEngine.initializer({ initialize() {} });
    });
  });
});

QUnit.test('initializers are passed an Engine', function() {
  MyEngine = Engine.extend();

  MyEngine.initializer({
    name: 'initializer',
    initialize(engine) {
      ok(engine instanceof Engine, 'initialize is passed an Engine');
    }
  });

  myEngine = MyEngine.create();
  myEngineInstance = myEngine.buildInstance();
});

QUnit.test('initializers can be registered in a specified order', function() {
  let order = [];

  MyEngine = Engine.extend();
  MyEngine.initializer({
    name: 'fourth',
    after: 'third',
    initialize(engine) {
      order.push('fourth');
    }
  });

  MyEngine.initializer({
    name: 'second',
    after: 'first',
    before: 'third',
    initialize(engine) {
      order.push('second');
    }
  });

  MyEngine.initializer({
    name: 'fifth',
    after: 'fourth',
    before: 'sixth',
    initialize(engine) {
      order.push('fifth');
    }
  });

  MyEngine.initializer({
    name: 'first',
    before: 'second',
    initialize(engine) {
      order.push('first');
    }
  });

  MyEngine.initializer({
    name: 'third',
    initialize(engine) {
      order.push('third');
    }
  });

  MyEngine.initializer({
    name: 'sixth',
    initialize(engine) {
      order.push('sixth');
    }
  });

  myEngine = MyEngine.create();
  myEngineInstance = myEngine.buildInstance();

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
});

QUnit.test('initializers can be registered in a specified order as an array', function() {
  let order = [];

  MyEngine = Engine.extend();

  MyEngine.initializer({
    name: 'third',
    initialize(engine) {
      order.push('third');
    }
  });

  MyEngine.initializer({
    name: 'second',
    after: 'first',
    before: ['third', 'fourth'],
    initialize(engine) {
      order.push('second');
    }
  });

  MyEngine.initializer({
    name: 'fourth',
    after: ['second', 'third'],
    initialize(engine) {
      order.push('fourth');
    }
  });

  MyEngine.initializer({
    name: 'fifth',
    after: 'fourth',
    before: 'sixth',
    initialize(engine) {
      order.push('fifth');
    }
  });

  MyEngine.initializer({
    name: 'first',
    before: ['second'],
    initialize(engine) {
      order.push('first');
    }
  });

  MyEngine.initializer({
    name: 'sixth',
    initialize(engine) {
      order.push('sixth');
    }
  });

  myEngine = MyEngine.create();
  myEngineInstance = myEngine.buildInstance();

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
});

QUnit.test('initializers can have multiple dependencies', function () {
  let order = [];

  MyEngine = Engine.extend();

  let a = {
    name: 'a',
    before: 'b',
    initialize(engine) {
      order.push('a');
    }
  };
  let b = {
    name: 'b',
    initialize(engine) {
      order.push('b');
    }
  };
  let c = {
    name: 'c',
    after: 'b',
    initialize(engine) {
      order.push('c');
    }
  };
  let afterB = {
    name: 'after b',
    after: 'b',
    initialize(engine) {
      order.push('after b');
    }
  };
  let afterC = {
    name: 'after c',
    after: 'c',
    initialize(engine) {
      order.push('after c');
    }
  };

  MyEngine.initializer(b);
  MyEngine.initializer(a);
  MyEngine.initializer(afterC);
  MyEngine.initializer(afterB);
  MyEngine.initializer(c);

  myEngine = MyEngine.create();
  myEngineInstance = myEngine.buildInstance();

  ok(order.indexOf(a.name) < order.indexOf(b.name), 'a < b');
  ok(order.indexOf(b.name) < order.indexOf(c.name), 'b < c');
  ok(order.indexOf(b.name) < order.indexOf(afterB.name), 'b < afterB');
  ok(order.indexOf(c.name) < order.indexOf(afterC.name), 'c < afterC');
});

QUnit.test('initializers set on Engine subclasses are not shared between engines', function() {
  let firstInitializerRunCount = 0;
  let secondInitializerRunCount = 0;
  let FirstEngine = Engine.extend();

  FirstEngine.initializer({
    name: 'first',
    initialize(engine) {
      firstInitializerRunCount++;
    }
  });

  let SecondEngine = Engine.extend();

  SecondEngine.initializer({
    name: 'second',
    initialize(engine) {
      secondInitializerRunCount++;
    }
  });

  let firstEngine = FirstEngine.create();
  let firstEngineInstance = firstEngine.buildInstance();

  equal(firstInitializerRunCount, 1, 'first initializer only was run');
  equal(secondInitializerRunCount, 0, 'first initializer only was run');

  let secondEngine = SecondEngine.create();
  let secondEngineInstance = secondEngine.buildInstance();

  equal(firstInitializerRunCount, 1, 'second initializer only was run');
  equal(secondInitializerRunCount, 1, 'second initializer only was run');

  run(function() {
    firstEngineInstance.destroy();
    secondEngineInstance.destroy();

    firstEngine.destroy();
    secondEngine.destroy();
  });
});

QUnit.test('initializers are concatenated', function() {
  let firstInitializerRunCount = 0;
  let secondInitializerRunCount = 0;
  let FirstEngine = Engine.extend();

  FirstEngine.initializer({
    name: 'first',
    initialize(engine) {
      firstInitializerRunCount++;
    }
  });

  let SecondEngine = FirstEngine.extend();

  SecondEngine.initializer({
    name: 'second',
    initialize(engine) {
      secondInitializerRunCount++;
    }
  });

  let firstEngine = FirstEngine.create();
  let firstEngineInstance = firstEngine.buildInstance();

  equal(firstInitializerRunCount, 1, 'first initializer only was run when base class created');
  equal(secondInitializerRunCount, 0, 'second initializer was not run when first base class created');
  firstInitializerRunCount = 0;

  let secondEngine = SecondEngine.create();
  let secondEngineInstance = secondEngine.buildInstance();

  equal(firstInitializerRunCount, 1, 'first initializer was run when subclass created');
  equal(secondInitializerRunCount, 1, 'second initializers was run when subclass created');

  run(function() {
    firstEngineInstance.destroy();
    secondEngineInstance.destroy();

    firstEngine.destroy();
    secondEngine.destroy();
  });
});

QUnit.test('initializers are per-engine', function() {
  expect(2);

  let FirstEngine = Engine.extend();

  FirstEngine.initializer({
    name: 'abc',
    initialize(engine) {}
  });

  expectAssertion(function() {
    FirstEngine.initializer({
      name: 'abc',
      initialize(engine) {}
    });
  });

  let SecondEngine = Engine.extend();
  SecondEngine.instanceInitializer({
    name: 'abc',
    initialize(engine) {}
  });

  ok(true, 'Two engines can have initializers named the same.');
});

QUnit.test('initializers are executed in their own context', function() {
  expect(1);

  MyEngine = Engine.extend();

  MyEngine.initializer({
    name: 'coolInitializer',
    myProperty: 'cool',
    initialize(engine) {
      equal(this.myProperty, 'cool', 'should have access to its own context');
    }
  });

  myEngine = MyEngine.create();
  myEngineInstance = myEngine.buildInstance();
});
