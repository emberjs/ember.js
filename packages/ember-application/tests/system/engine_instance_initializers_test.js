import { run } from 'ember-metal';
import Engine from '../../system/engine';
import EngineInstance from '../../system/engine-instance';
import { setEngineParent } from '../../system/engine-parent';

let MyEngine, myEngine, myEngineInstance;

function buildEngineInstance(EngineClass) {
  let engineInstance = EngineClass.buildInstance();
  setEngineParent(engineInstance, {
    lookup() { return {}; },
    resolveRegistration() { return {}; }
  });
  return engineInstance;
}

QUnit.module('Ember.Engine instance initializers', {
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
      MyEngine.instanceInitializer({ name: 'initializer' });
    });
  });

  expectAssertion(() => {
    run(() => {
      MyEngine.instanceInitializer({ initialize() {} });
    });
  });
});

QUnit.test('initializers are passed an engine instance', function() {
  MyEngine = Engine.extend();

  MyEngine.instanceInitializer({
    name: 'initializer',
    initialize(instance) {
      ok(instance instanceof EngineInstance, 'initialize is passed an engine instance');
    }
  });

  myEngine = MyEngine.create();
  myEngineInstance = buildEngineInstance(myEngine);
  return myEngineInstance.boot();
});

QUnit.test('initializers can be registered in a specified order', function() {
  let order = [];

  MyEngine = Engine.extend();

  MyEngine.instanceInitializer({
    name: 'fourth',
    after: 'third',
    initialize(engine) {
      order.push('fourth');
    }
  });

  MyEngine.instanceInitializer({
    name: 'second',
    after: 'first',
    before: 'third',
    initialize(engine) {
      order.push('second');
    }
  });

  MyEngine.instanceInitializer({
    name: 'fifth',
    after: 'fourth',
    before: 'sixth',
    initialize(engine) {
      order.push('fifth');
    }
  });

  MyEngine.instanceInitializer({
    name: 'first',
    before: 'second',
    initialize(engine) {
      order.push('first');
    }
  });

  MyEngine.instanceInitializer({
    name: 'third',
    initialize(engine) {
      order.push('third');
    }
  });

  MyEngine.instanceInitializer({
    name: 'sixth',
    initialize(engine) {
      order.push('sixth');
    }
  });

  myEngine = MyEngine.create();
  myEngineInstance = buildEngineInstance(myEngine);

  return myEngineInstance.boot().then(() => {
    deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
  });
});

QUnit.test('initializers can be registered in a specified order as an array', function() {
  let order = [];
  MyEngine = Engine.extend();

  MyEngine.instanceInitializer({
    name: 'third',
    initialize(engine) {
      order.push('third');
    }
  });

  MyEngine.instanceInitializer({
    name: 'second',
    after: 'first',
    before: ['third', 'fourth'],
    initialize(engine) {
      order.push('second');
    }
  });

  MyEngine.instanceInitializer({
    name: 'fourth',
    after: ['second', 'third'],
    initialize(engine) {
      order.push('fourth');
    }
  });

  MyEngine.instanceInitializer({
    name: 'fifth',
    after: 'fourth',
    before: 'sixth',
    initialize(engine) {
      order.push('fifth');
    }
  });

  MyEngine.instanceInitializer({
    name: 'first',
    before: ['second'],
    initialize(engine) {
      order.push('first');
    }
  });

  MyEngine.instanceInitializer({
    name: 'sixth',
    initialize(engine) {
      order.push('sixth');
    }
  });

  myEngine = MyEngine.create();
  myEngineInstance = buildEngineInstance(myEngine);

  return myEngineInstance.boot().then(() => {
    deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
  });
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

  MyEngine.instanceInitializer(b);
  MyEngine.instanceInitializer(a);
  MyEngine.instanceInitializer(afterC);
  MyEngine.instanceInitializer(afterB);
  MyEngine.instanceInitializer(c);

  myEngine = MyEngine.create();
  myEngineInstance = buildEngineInstance(myEngine);

  return myEngineInstance.boot().then(() => {
    ok(order.indexOf(a.name) < order.indexOf(b.name), 'a < b');
    ok(order.indexOf(b.name) < order.indexOf(c.name), 'b < c');
    ok(order.indexOf(b.name) < order.indexOf(afterB.name), 'b < afterB');
    ok(order.indexOf(c.name) < order.indexOf(afterC.name), 'c < afterC');
  });
});

QUnit.test('initializers set on Engine subclasses should not be shared between engines', function() {
  let firstInitializerRunCount = 0;
  let secondInitializerRunCount = 0;
  let FirstEngine = Engine.extend();
  let firstEngine, firstEngineInstance;

  FirstEngine.instanceInitializer({
    name: 'first',
    initialize(engine) {
      firstInitializerRunCount++;
    }
  });

  let SecondEngine = Engine.extend();
  let secondEngine, secondEngineInstance;

  SecondEngine.instanceInitializer({
    name: 'second',
    initialize(engine) {
      secondInitializerRunCount++;
    }
  });

  firstEngine = FirstEngine.create();
  firstEngineInstance = buildEngineInstance(firstEngine);

  return firstEngineInstance.boot()
    .then(() => {
      equal(firstInitializerRunCount, 1, 'first initializer only was run');
      equal(secondInitializerRunCount, 0, 'first initializer only was run');

      secondEngine = SecondEngine.create();
      secondEngineInstance = buildEngineInstance(secondEngine);
      return secondEngineInstance.boot();
    })
    .then(() => {
      equal(firstInitializerRunCount, 1, 'second initializer only was run');
      equal(secondInitializerRunCount, 1, 'second initializer only was run');

      run(() => {
        firstEngineInstance.destroy();
        secondEngineInstance.destroy();

        firstEngine.destroy();
        secondEngine.destroy();
      });
    });
});

QUnit.test('initializers are concatenated', function() {
  let firstInitializerRunCount = 0;
  let secondInitializerRunCount = 0;
  let FirstEngine = Engine.extend();

  FirstEngine.instanceInitializer({
    name: 'first',
    initialize(engine) {
      firstInitializerRunCount++;
    }
  });

  let SecondEngine = FirstEngine.extend();

  SecondEngine.instanceInitializer({
    name: 'second',
    initialize(engine) {
      secondInitializerRunCount++;
    }
  });

  let firstEngine = FirstEngine.create();
  let firstEngineInstance = buildEngineInstance(firstEngine);

  let secondEngine, secondEngineInstance;

  return firstEngineInstance.boot()
    .then(() => {
      equal(firstInitializerRunCount, 1, 'first initializer only was run when base class created');
      equal(secondInitializerRunCount, 0, 'second initializer was not run when first base class created');
      firstInitializerRunCount = 0;

      secondEngine = SecondEngine.create();
      secondEngineInstance = buildEngineInstance(secondEngine);
      return secondEngineInstance.boot();
    })
    .then(() => {
      equal(firstInitializerRunCount, 1, 'first initializer was run when subclass created');
      equal(secondInitializerRunCount, 1, 'second initializers was run when subclass created');

      run(() => {
        firstEngineInstance.destroy();
        secondEngineInstance.destroy();

        firstEngine.destroy();
        secondEngine.destroy();
      });
    });
});

QUnit.test('initializers are per-engine', function() {
  expect(2);

  let FirstEngine = Engine.extend();

  FirstEngine.instanceInitializer({
    name: 'abc',
    initialize(engine) {}
  });

  expectAssertion(() => {
    FirstEngine.instanceInitializer({
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

  let MyEngine = Engine.extend();

  MyEngine.instanceInitializer({
    name: 'coolInitializer',
    myProperty: 'cool',
    initialize(engine) {
      equal(this.myProperty, 'cool', 'should have access to its own context');
    }
  });

  myEngine = MyEngine.create();
  myEngineInstance = buildEngineInstance(myEngine);

  return myEngineInstance.boot();
});
