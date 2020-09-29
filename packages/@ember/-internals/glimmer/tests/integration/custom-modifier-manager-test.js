import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { Object as EmberObject } from '@ember/-internals/runtime';
import { setModifierManager, modifierCapabilities } from '@ember/-internals/glimmer';
import { set, tracked } from '@ember/-internals/metal';
import { backtrackingMessageFor } from '../utils/backtracking-rerender';

class CustomModifierManager {
  constructor(owner) {
    this.owner = owner;
  }

  createModifier(factory, args) {
    return factory.create(args);
  }

  installModifier(instance, element, args) {
    instance.element = element;
    let { positional, named } = args;
    instance.didInsertElement(positional, named);
  }

  updateModifier(instance, args) {
    let { positional, named } = args;
    instance.didUpdate(positional, named);
  }

  destroyModifier(instance) {
    instance.willDestroyElement();
  }
}
class ModifierManagerTest extends RenderingTestCase {
  '@test throws a useful error when missing capabilities'() {
    this.registerModifier(
      'foo-bar',
      setModifierManager(() => {
        return {
          createModifier() {},
          installModifier() {},
          updateModifier() {},
          destroyModifier() {},
        };
      }, {})
    );

    expectAssertion(() => {
      this.render('<h1 {{foo-bar}}>hello world</h1>');
    }, /Custom modifier managers must define their capabilities/);
  }

  '@test can register a custom element modifier and render it'(assert) {
    let ModifierClass = setModifierManager(
      (owner) => {
        return new this.CustomModifierManager(owner);
      },
      EmberObject.extend({
        didInsertElement() {},
        didUpdate() {},
        willDestroyElement() {},
      })
    );

    this.registerModifier(
      'foo-bar',
      ModifierClass.extend({
        didInsertElement() {
          assert.ok(true, 'Called didInsertElement');
        },
      })
    );

    this.render('<h1 {{foo-bar}}>hello world</h1>');
    this.assertHTML(`<h1>hello world</h1>`);
  }

  '@test custom lifecycle hooks'(assert) {
    assert.expect(9);
    let ModifierClass = setModifierManager(
      (owner) => {
        return new this.CustomModifierManager(owner);
      },
      EmberObject.extend({
        didInsertElement() {},
        didUpdate() {},
        willDestroyElement() {},
      })
    );

    this.registerModifier(
      'foo-bar',
      ModifierClass.extend({
        didUpdate([truthy]) {
          assert.ok(true, 'Called didUpdate');
          assert.equal(truthy, 'true', 'gets updated args');
        },
        didInsertElement([truthy]) {
          assert.ok(true, 'Called didInsertElement');
          assert.equal(truthy, true, 'gets initial args');
        },
        willDestroyElement() {
          assert.ok(true, 'Called willDestroyElement');
        },
      })
    );

    this.render('{{#if truthy}}<h1 {{foo-bar truthy}}>hello world</h1>{{/if}}', {
      truthy: true,
    });
    this.assertHTML(`<h1>hello world</h1>`);

    runTask(() => set(this.context, 'truthy', 'true'));

    runTask(() => set(this.context, 'truthy', false));

    runTask(() => set(this.context, 'truthy', true));
  }

  '@test associates manager even through an inheritance structure'(assert) {
    assert.expect(5);
    let ModifierClass = setModifierManager(
      (owner) => {
        return new this.CustomModifierManager(owner);
      },
      EmberObject.extend({
        didInsertElement() {},
        didUpdate() {},
        willDestroyElement() {},
      })
    );

    ModifierClass = ModifierClass.extend({
      didInsertElement([truthy]) {
        this._super(...arguments);
        assert.ok(true, 'Called didInsertElement');
        assert.equal(truthy, true, 'gets initial args');
      },
    });

    this.registerModifier(
      'foo-bar',
      ModifierClass.extend({
        didInsertElement([truthy]) {
          this._super(...arguments);
          assert.ok(true, 'Called didInsertElement');
          assert.equal(truthy, true, 'gets initial args');
        },
      })
    );

    this.render('<h1 {{foo-bar truthy}}>hello world</h1>', {
      truthy: true,
    });
    this.assertHTML(`<h1>hello world</h1>`);
  }

  '@test can give consistent access to underlying DOM element'(assert) {
    assert.expect(4);
    let ModifierClass = setModifierManager(
      (owner) => {
        return new this.CustomModifierManager(owner);
      },
      EmberObject.extend({
        didInsertElement() {},
        didUpdate() {},
        willDestroyElement() {},
      })
    );

    this.registerModifier(
      'foo-bar',
      ModifierClass.extend({
        savedElement: undefined,
        didInsertElement(positional) {
          // consume first positional argument (ensures updates run)
          positional[0];

          assert.equal(this.element.tagName, 'H1');
          this.set('savedElement', this.element);
        },
        didUpdate() {
          assert.equal(this.element, this.savedElement);
        },
        willDestroyElement() {
          assert.equal(this.element, this.savedElement);
        },
      })
    );

    this.render('<h1 {{foo-bar truthy}}>hello world</h1>', {
      truthy: true,
    });
    this.assertHTML(`<h1>hello world</h1>`);

    runTask(() => set(this.context, 'truthy', 'true'));
  }

  '@test lifecycle hooks are autotracked by default'(assert) {
    let TrackedClass = EmberObject.extend({
      count: tracked({ value: 0 }),
    });

    let trackedOne = TrackedClass.create();
    let trackedTwo = TrackedClass.create();

    let insertCount = 0;
    let updateCount = 0;

    let ModifierClass = setModifierManager(
      (owner) => {
        return new this.CustomModifierManager(owner);
      },
      EmberObject.extend({
        didInsertElement() {},
        didUpdate() {},
        willDestroyElement() {},
      })
    );

    this.registerModifier(
      'foo-bar',
      ModifierClass.extend({
        didInsertElement() {
          // track the count of the first item
          trackedOne.count;
          insertCount++;
        },

        didUpdate() {
          // track the count of the second item
          trackedTwo.count;
          updateCount++;
        },
      })
    );

    this.render('<h1 {{foo-bar truthy}}>hello world</h1>');
    this.assertHTML(`<h1>hello world</h1>`);

    assert.equal(insertCount, 1);
    assert.equal(updateCount, 0);

    runTask(() => trackedTwo.count++);
    assert.equal(updateCount, 0);

    runTask(() => trackedOne.count++);
    assert.equal(updateCount, 1);

    runTask(() => trackedOne.count++);
    assert.equal(updateCount, 1);

    runTask(() => trackedTwo.count++);
    assert.equal(updateCount, 2);
  }

  '@test provides a helpful assertion when mutating a value that was consumed already'() {
    class Person {
      @tracked name = 'bob';
    }

    let ModifierClass = setModifierManager(
      (owner) => {
        return new this.CustomModifierManager(owner);
      },
      class {
        static create() {
          return new this();
        }

        didInsertElement() {}
        didUpdate() {}
        willDestroyElement() {}
      }
    );

    this.registerModifier(
      'foo-bar',
      class MyModifier extends ModifierClass {
        didInsertElement([person]) {
          person.name;
          person.name = 'sam';
        }
      }
    );

    let expectedMessage = backtrackingMessageFor('name', 'Person', {
      renderTree: ['\\(instance of a `foo-bar` modifier\\)'],
    });

    expectAssertion(() => {
      this.render('<h1 {{foo-bar this.person}}>hello world</h1>', { person: new Person() });
    }, expectedMessage);
  }
}

moduleFor(
  'Basic Custom Modifier Manager: 3.13',
  class extends ModifierManagerTest {
    CustomModifierManager = class extends CustomModifierManager {
      capabilities = modifierCapabilities('3.13');
    };

    '@test modifers consume all arguments'(assert) {
      let insertCount = 0;
      let updateCount = 0;

      let ModifierClass = setModifierManager(
        (owner) => {
          return new this.CustomModifierManager(owner);
        },
        EmberObject.extend({
          didInsertElement() {},
          didUpdate() {},
          willDestroyElement() {},
        })
      );

      this.registerModifier(
        'foo-bar',
        ModifierClass.extend({
          didInsertElement(_positional, named) {
            insertCount++;

            // consume qux
            named.qux;
          },

          didUpdate(_positiona, named) {
            updateCount++;

            // consume qux
            named.qux;
          },
        })
      );

      this.render('<h1 {{foo-bar bar=this.bar qux=this.qux}}>hello world</h1>', {
        bar: 'bar',
        qux: 'quz',
      });

      this.assertHTML(`<h1>hello world</h1>`);

      assert.equal(insertCount, 1);
      assert.equal(updateCount, 0);

      runTask(() => set(this.context, 'bar', 'other bar'));
      assert.equal(updateCount, 1);

      runTask(() => set(this.context, 'qux', 'quuuuxxxxxx'));
      assert.equal(updateCount, 2);
    }
  }
);

moduleFor(
  'Basic Custom Modifier Manager: 3.22',
  class extends ModifierManagerTest {
    CustomModifierManager = class extends CustomModifierManager {
      capabilities = modifierCapabilities('3.22');
    };

    '@test modifers only track positional arguments they consume'(assert) {
      let insertCount = 0;
      let updateCount = 0;

      let ModifierClass = setModifierManager(
        (owner) => {
          return new this.CustomModifierManager(owner);
        },
        EmberObject.extend({
          didInsertElement() {},
          didUpdate() {},
          willDestroyElement() {},
        })
      );

      this.registerModifier(
        'foo-bar',
        ModifierClass.extend({
          didInsertElement(positional) {
            insertCount++;

            // consume the second positional
            positional[1];
          },

          didUpdate(positional) {
            updateCount++;

            // consume the second positional
            positional[1];
          },
        })
      );

      this.render(
        '<h1 {{foo-bar this.positionOne this.positionTwo bar=this.bar qux=this.qux}}>hello world</h1>',
        {
          positionOne: 'first!!!',
          positionTwo: 'second :(',
          bar: 'bar',
          qux: 'quz',
        }
      );

      this.assertHTML(`<h1>hello world</h1>`);

      assert.equal(insertCount, 1);
      assert.equal(updateCount, 0);

      runTask(() => set(this.context, 'positionOne', 'no first?'));
      assert.equal(updateCount, 0);

      runTask(() => set(this.context, 'positionTwo', 'YASSSSSSS!!!'));
      assert.equal(updateCount, 1);
    }

    '@test modifers only track named arguments they consume'(assert) {
      let insertCount = 0;
      let updateCount = 0;

      let ModifierClass = setModifierManager(
        (owner) => {
          return new this.CustomModifierManager(owner);
        },
        EmberObject.extend({
          didInsertElement() {},
          didUpdate() {},
          willDestroyElement() {},
        })
      );

      this.registerModifier(
        'foo-bar',
        ModifierClass.extend({
          didInsertElement(_positional, named) {
            insertCount++;

            // consume qux
            named.qux;
          },

          didUpdate(_positiona, named) {
            updateCount++;

            // consume qux
            named.qux;
          },
        })
      );

      this.render('<h1 {{foo-bar bar=this.bar qux=this.qux}}>hello world</h1>', {
        bar: 'bar',
        qux: 'quz',
      });

      this.assertHTML(`<h1>hello world</h1>`);

      assert.equal(insertCount, 1);
      assert.equal(updateCount, 0);

      runTask(() => set(this.context, 'bar', 'other bar'));
      assert.equal(updateCount, 0);

      runTask(() => set(this.context, 'qux', 'quuuuxxxxxx'));
      assert.equal(updateCount, 1);
    }
  }
);

moduleFor(
  'Rendering test: non-interactive custom modifiers',
  class extends RenderingTestCase {
    getBootOptions() {
      return { isInteractive: false };
    }

    [`@test doesn't trigger lifecycle hooks when non-interactive`](assert) {
      let ModifierClass = setModifierManager(
        (owner) => {
          return new CustomModifierManager(owner);
        },
        EmberObject.extend({
          didInsertElement() {
            assert.ok(false);
          },
          didUpdate() {
            assert.ok(false);
          },
          willDestroyElement() {
            assert.ok(false);
          },
        })
      );

      this.registerModifier('foo-bar', ModifierClass);

      this.render('<h1 {{foo-bar baz}}>hello world</h1>');
      runTask(() => this.context.set('baz', 'Hello'));

      this.assertHTML('<h1>hello world</h1>');
    }
  }
);
