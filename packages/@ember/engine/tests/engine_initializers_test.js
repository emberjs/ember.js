import { run } from '@ember/runloop';
import Engine from '@ember/engine';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

let MyEngine, myEngine, myEngineInstance;

moduleFor(
  'Engine initializers',
  class extends TestCase {
    teardown() {
      run(() => {
        if (myEngineInstance) {
          myEngineInstance.destroy();
          myEngineInstance = null;
        }

        if (myEngine) {
          myEngine.destroy();
          myEngine = null;
        }
      });
    }

    ["@test initializers require proper 'name' and 'initialize' properties"]() {
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
    }

    ['@test initializers are passed an Engine'](assert) {
      MyEngine = Engine.extend();

      MyEngine.initializer({
        name: 'initializer',
        initialize(engine) {
          assert.ok(engine instanceof Engine, 'initialize is passed an Engine');
        },
      });

      myEngine = MyEngine.create();
      myEngineInstance = myEngine.buildInstance();
    }

    ['@test initializers can be registered in a specified order'](assert) {
      let order = [];

      MyEngine = Engine.extend();
      MyEngine.initializer({
        name: 'fourth',
        after: 'third',
        initialize() {
          order.push('fourth');
        },
      });

      MyEngine.initializer({
        name: 'second',
        after: 'first',
        before: 'third',
        initialize() {
          order.push('second');
        },
      });

      MyEngine.initializer({
        name: 'fifth',
        after: 'fourth',
        before: 'sixth',
        initialize() {
          order.push('fifth');
        },
      });

      MyEngine.initializer({
        name: 'first',
        before: 'second',
        initialize() {
          order.push('first');
        },
      });

      MyEngine.initializer({
        name: 'third',
        initialize() {
          order.push('third');
        },
      });

      MyEngine.initializer({
        name: 'sixth',
        initialize() {
          order.push('sixth');
        },
      });

      myEngine = MyEngine.create();
      myEngineInstance = myEngine.buildInstance();

      assert.deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
    }

    ['@test initializers can be registered in a specified order as an array'](assert) {
      let order = [];

      MyEngine = Engine.extend();

      MyEngine.initializer({
        name: 'third',
        initialize() {
          order.push('third');
        },
      });

      MyEngine.initializer({
        name: 'second',
        after: 'first',
        before: ['third', 'fourth'],
        initialize() {
          order.push('second');
        },
      });

      MyEngine.initializer({
        name: 'fourth',
        after: ['second', 'third'],
        initialize() {
          order.push('fourth');
        },
      });

      MyEngine.initializer({
        name: 'fifth',
        after: 'fourth',
        before: 'sixth',
        initialize() {
          order.push('fifth');
        },
      });

      MyEngine.initializer({
        name: 'first',
        before: ['second'],
        initialize() {
          order.push('first');
        },
      });

      MyEngine.initializer({
        name: 'sixth',
        initialize() {
          order.push('sixth');
        },
      });

      myEngine = MyEngine.create();
      myEngineInstance = myEngine.buildInstance();

      assert.deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
    }

    ['@test initializers can have multiple dependencies'](assert) {
      let order = [];

      MyEngine = Engine.extend();

      let a = {
        name: 'a',
        before: 'b',
        initialize() {
          order.push('a');
        },
      };
      let b = {
        name: 'b',
        initialize() {
          order.push('b');
        },
      };
      let c = {
        name: 'c',
        after: 'b',
        initialize() {
          order.push('c');
        },
      };
      let afterB = {
        name: 'after b',
        after: 'b',
        initialize() {
          order.push('after b');
        },
      };
      let afterC = {
        name: 'after c',
        after: 'c',
        initialize() {
          order.push('after c');
        },
      };

      MyEngine.initializer(b);
      MyEngine.initializer(a);
      MyEngine.initializer(afterC);
      MyEngine.initializer(afterB);
      MyEngine.initializer(c);

      myEngine = MyEngine.create();
      myEngineInstance = myEngine.buildInstance();

      assert.ok(order.indexOf(a.name) < order.indexOf(b.name), 'a < b');
      assert.ok(order.indexOf(b.name) < order.indexOf(c.name), 'b < c');
      assert.ok(order.indexOf(b.name) < order.indexOf(afterB.name), 'b < afterB');
      assert.ok(order.indexOf(c.name) < order.indexOf(afterC.name), 'c < afterC');
    }

    ['@test initializers set on Engine subclasses are not shared between engines'](assert) {
      let firstInitializerRunCount = 0;
      let secondInitializerRunCount = 0;
      let FirstEngine = Engine.extend();

      FirstEngine.initializer({
        name: 'first',
        initialize() {
          firstInitializerRunCount++;
        },
      });

      let SecondEngine = Engine.extend();

      SecondEngine.initializer({
        name: 'second',
        initialize() {
          secondInitializerRunCount++;
        },
      });

      let firstEngine = FirstEngine.create();
      let firstEngineInstance = firstEngine.buildInstance();

      assert.equal(firstInitializerRunCount, 1, 'first initializer only was run');
      assert.equal(secondInitializerRunCount, 0, 'first initializer only was run');

      let secondEngine = SecondEngine.create();
      let secondEngineInstance = secondEngine.buildInstance();

      assert.equal(firstInitializerRunCount, 1, 'second initializer only was run');
      assert.equal(secondInitializerRunCount, 1, 'second initializer only was run');

      run(function() {
        firstEngineInstance.destroy();
        secondEngineInstance.destroy();

        firstEngine.destroy();
        secondEngine.destroy();
      });
    }

    ['@test initializers are concatenated'](assert) {
      let firstInitializerRunCount = 0;
      let secondInitializerRunCount = 0;
      let FirstEngine = Engine.extend();

      FirstEngine.initializer({
        name: 'first',
        initialize() {
          firstInitializerRunCount++;
        },
      });

      let SecondEngine = FirstEngine.extend();

      SecondEngine.initializer({
        name: 'second',
        initialize() {
          secondInitializerRunCount++;
        },
      });

      let firstEngine = FirstEngine.create();
      let firstEngineInstance = firstEngine.buildInstance();

      assert.equal(
        firstInitializerRunCount,
        1,
        'first initializer only was run when base class created'
      );
      assert.equal(
        secondInitializerRunCount,
        0,
        'second initializer was not run when first base class created'
      );
      firstInitializerRunCount = 0;

      let secondEngine = SecondEngine.create();
      let secondEngineInstance = secondEngine.buildInstance();

      assert.equal(firstInitializerRunCount, 1, 'first initializer was run when subclass created');
      assert.equal(
        secondInitializerRunCount,
        1,
        'second initializers was run when subclass created'
      );

      run(function() {
        firstEngineInstance.destroy();
        secondEngineInstance.destroy();

        firstEngine.destroy();
        secondEngine.destroy();
      });
    }

    ['@test initializers are per-engine'](assert) {
      assert.expect(2);

      let FirstEngine = Engine.extend();

      FirstEngine.initializer({
        name: 'abc',
        initialize() {},
      });

      expectAssertion(function() {
        FirstEngine.initializer({
          name: 'abc',
          initialize() {},
        });
      });

      let SecondEngine = Engine.extend();
      SecondEngine.instanceInitializer({
        name: 'abc',
        initialize() {},
      });

      assert.ok(true, 'Two engines can have initializers named the same.');
    }

    ['@test initializers are executed in their own context'](assert) {
      assert.expect(1);

      MyEngine = Engine.extend();

      MyEngine.initializer({
        name: 'coolInitializer',
        myProperty: 'cool',
        initialize() {
          assert.equal(this.myProperty, 'cool', 'should have access to its own context');
        },
      });

      myEngine = MyEngine.create();
      myEngineInstance = myEngine.buildInstance();
    }
  }
);
