import { Arguments, ModifierManager, Owner } from '@glimmer/interfaces';
import { RenderTest, test, jitSuite, tracked, defineComponent, trackedObj } from '../..';

import { setModifierManager, modifierCapabilities } from '@glimmer/manager';
import { getOwner, setOwner } from '@glimmer/owner';

class CustomModifier {
  static create(args: Arguments) {
    return new this(getOwner(args)!, args);
  }

  constructor(owner: Owner, public args: Arguments) {
    setOwner(this, owner);
  }

  element!: Element;

  didInsertElement(): void {}
  didUpdate(): void {}
  willDestroyElement(): void {}
}

abstract class ModifierManagerTest extends RenderTest {
  abstract CustomModifierManager: { new (owner: Owner): ModifierManager<CustomModifier> };

  defineModifier<T extends object>(Klass: T): T {
    return setModifierManager((owner) => {
      return new this.CustomModifierManager(owner);
    }, Klass);
  }

  @test 'can register a custom element modifier and render it'() {
    let foo = this.defineModifier(
      class extends CustomModifier {
        didInsertElement() {}
        didUpdate() {}
        willDestroyElement() {}
      }
    );

    const Main = defineComponent({ foo }, '<h1 {{foo}}>hello world</h1>');

    this.renderComponent(Main);

    this.assertHTML(`<h1>hello world</h1>`);
  }

  @test 'custom lifecycle hooks'(assert: Assert) {
    let foo = this.defineModifier(
      class extends CustomModifier {
        didInsertElement() {
          assert.step('Called didInsertElement');
          assert.equal(this.args.positional[0], true, 'gets initial args');
        }
        didUpdate() {
          assert.step('Called didUpdate');
          assert.equal(this.args.positional[0], 'true', 'gets updated args');
        }
        willDestroyElement() {
          assert.step('Called willDestroyElement');
        }
      }
    );

    const Main = defineComponent(
      { foo },
      '{{#if @truthy}}<h1 {{foo @truthy}}>hello world</h1>{{/if}}'
    );
    let args = trackedObj({ truthy: true });

    this.renderComponent(Main, args);

    this.assertHTML(`<h1>hello world</h1>`);
    assert.verifySteps(['Called didInsertElement']);

    args.truthy = 'true';
    this.rerender();
    assert.verifySteps(['Called didUpdate']);

    args.truthy = false;
    this.rerender();
    assert.verifySteps(['Called willDestroyElement']);

    args.truthy = true;
    this.rerender();
    assert.verifySteps(['Called didInsertElement']);
  }

  @test 'associates manager even through an inheritance structure'(assert: Assert) {
    let Foo = this.defineModifier(
      class extends CustomModifier {
        didInsertElement() {
          assert.step('Foo didInsertElement');
          assert.equal(this.args.positional[0], true, 'gets initial args');
        }
      }
    );

    class Bar extends Foo {
      didInsertElement() {
        super.didInsertElement();
        assert.step('Bar didInsertElement');
        assert.equal(this.args.positional[0], true, 'gets initial args');
      }
    }

    const Main = defineComponent({ bar: Bar }, '<h1 {{bar @truthy}}>hello world</h1>');

    this.renderComponent(Main, { truthy: true });
    this.assertHTML(`<h1>hello world</h1>`);
    assert.verifySteps(['Foo didInsertElement', 'Bar didInsertElement']);
  }

  @test 'can give consistent access to underlying DOM element'(assert: Assert) {
    assert.expect(6);

    let foo = this.defineModifier(
      class extends CustomModifier {
        savedElement?: Element;

        didInsertElement() {
          // consume first positional argument (ensures updates run)
          // eslint-disable-next-line no-unused-expressions
          this.args.positional[0];

          assert.equal(this.element.tagName, 'H1');
          this.savedElement = this.element;
        }

        didUpdate() {
          assert.equal(this.element, this.savedElement);
        }

        willDestroyElement() {
          assert.equal(this.element, this.savedElement);
        }
      }
    );

    const Main = defineComponent({ foo }, '<h1 {{foo @truthy}}>hello world</h1>');
    let args = trackedObj({ truthy: true });

    this.renderComponent(Main, args);
    this.assertHTML(`<h1>hello world</h1>`);

    args.truthy = 'true';
    this.rerender();
  }

  @test 'lifecycle hooks are autotracked by default'(assert: Assert) {
    class TrackedClass {
      @tracked count = 0;
    }

    let trackedOne = new TrackedClass();
    let trackedTwo = new TrackedClass();

    let insertCount = 0;
    let updateCount = 0;

    let foo = this.defineModifier(
      class extends CustomModifier {
        didInsertElement() {
          // track the count of the first item
          // eslint-disable-next-line no-unused-expressions
          trackedOne.count;
          insertCount++;
        }

        didUpdate() {
          // track the count of the second item
          // eslint-disable-next-line no-unused-expressions
          trackedTwo.count;
          updateCount++;
        }
      }
    );

    let Main = defineComponent({ foo }, '<h1 {{foo}}>hello world</h1>');

    this.renderComponent(Main);
    this.assertHTML(`<h1>hello world</h1>`);

    assert.equal(insertCount, 1);
    assert.equal(updateCount, 0);

    trackedTwo.count++;
    this.rerender();
    assert.equal(updateCount, 0);

    trackedOne.count++;
    this.rerender();
    assert.equal(updateCount, 1);

    trackedOne.count++;
    this.rerender();
    assert.equal(updateCount, 1);

    trackedTwo.count++;
    this.rerender();
    assert.equal(updateCount, 2);
  }

  @test
  'provides a helpful deprecation when mutating a tracked value that was consumed already within constructor'(
    assert: Assert
  ) {
    class Foo extends CustomModifier {
      @tracked foo = 123;

      constructor(owner: Owner, args: Arguments) {
        super(owner, args);

        // first read the tracked property
        // eslint-disable-next-line no-unused-expressions
        this.foo;

        // then attempt to update the tracked property
        this.foo = 456;
      }

      didInsertElement() {}
      didUpdate() {}
      willDestroyElement() {}
    }

    let foo = this.defineModifier(Foo);

    let Main = defineComponent({ foo }, '<h1 {{foo}}>hello world</h1>');

    this.renderComponent(Main);

    assert.validateDeprecations(
      /You attempted to update `foo` on `.*`, but it had already been used previously in the same computation/
    );
  }

  @test
  'does not eagerly access arguments during destruction'(assert: Assert) {
    class Foo extends CustomModifier {}

    let foo = this.defineModifier(Foo);

    let Main = defineComponent(
      { foo },
      '{{#if @state.show}}<h1 {{foo @state.bar baz=@state.baz}}>hello world</h1>{{/if}}'
    );

    let barCount = 0;
    let bazCount = 0;

    class State {
      @tracked show = true;

      get bar() {
        if (this.show === false) {
          barCount++;
        }

        return;
      }

      get baz() {
        if (this.show === false) {
          bazCount++;
        }

        return;
      }
    }

    let state = new State();

    this.renderComponent(Main, { state });

    state.show = false;

    this.rerender();

    assert.equal(barCount, 0, 'bar was not accessed during detruction');
    assert.equal(bazCount, 0, 'baz was not accessed during detruction');
  }
}

class ModifierManagerTest313 extends ModifierManagerTest {
  static suiteName = 'Basic Custom Modifier Manager: 3.13';

  CustomModifierManager = class CustomModifierManager implements ModifierManager<CustomModifier> {
    capabilities = modifierCapabilities('3.13');

    constructor(public owner: Owner) {}

    createModifier(
      Modifier: { create(owner: Owner, args: Arguments): CustomModifier },
      args: Arguments
    ) {
      return Modifier.create(this.owner, args);
    }

    installModifier(instance: CustomModifier, element: Element, args: Arguments) {
      instance.element = element;
      instance.args = args;
      instance.didInsertElement();
    }

    updateModifier(instance: CustomModifier, args: Arguments) {
      instance.args = args;
      instance.didUpdate();
    }

    destroyModifier(instance: CustomModifier) {
      instance.willDestroyElement();
    }
  };

  @test 'modifers consume all arguments'(assert: Assert) {
    let insertCount = 0;
    let updateCount = 0;

    let foo = this.defineModifier(
      class extends CustomModifier {
        didInsertElement() {
          insertCount++;

          // consume qux
          // eslint-disable-next-line no-unused-expressions
          this.args.named.qux;
        }

        didUpdate() {
          updateCount++;

          // consume qux
          // eslint-disable-next-line no-unused-expressions
          this.args.named.qux;
        }
      }
    );

    let Main = defineComponent({ foo }, '<h1 {{foo bar=@bar qux=@qux}}>hello world</h1>');
    let args = trackedObj({ bar: 'bar', qux: 'qux' });

    this.renderComponent(Main, args);

    this.assertHTML(`<h1>hello world</h1>`);

    assert.equal(insertCount, 1);
    assert.equal(updateCount, 0);

    args.bar = 'other bar';
    this.rerender();
    assert.equal(updateCount, 1);

    args.qux = 'quuuuxxxxxx';
    this.rerender();
    assert.equal(updateCount, 2);
  }
}

class ModifierManagerTest322 extends ModifierManagerTest {
  static suiteName = 'Basic Custom Modifier Manager: 3.22';

  CustomModifierManager = class CustomModifierManager implements ModifierManager<CustomModifier> {
    capabilities = modifierCapabilities('3.22');

    constructor(public owner: Owner) {}

    createModifier(
      Modifier: { new (owner: Owner, args: Arguments): CustomModifier },
      args: Arguments
    ) {
      return new Modifier(this.owner, args);
    }

    installModifier(instance: CustomModifier, element: Element, args: Arguments) {
      instance.element = element;
      instance.args = args;
      instance.didInsertElement();
    }

    updateModifier(instance: CustomModifier, args: Arguments) {
      instance.args = args;
      instance.didUpdate();
    }

    destroyModifier(instance: CustomModifier) {
      instance.willDestroyElement();
    }
  };

  @test 'modifers only track positional arguments they consume'(assert: Assert) {
    let insertCount = 0;
    let updateCount = 0;

    let foo = this.defineModifier(
      class extends CustomModifier {
        didInsertElement() {
          insertCount++;

          // consume the second positional
          // eslint-disable-next-line no-unused-expressions
          this.args.positional[1];
        }

        didUpdate() {
          updateCount++;

          // consume the second positional
          // eslint-disable-next-line no-unused-expressions
          this.args.positional[1];
        }
      }
    );

    let Main = defineComponent(
      { foo },
      '<h1 {{foo @positionOne @positionTwo bar=@bar qux=@qux}}>hello world</h1>'
    );

    let args = trackedObj({
      positionOne: 'first!!!',
      positionTwo: 'second :(',
      bar: 'bar',
      qux: 'quz',
    });

    this.renderComponent(Main, args);

    this.assertHTML(`<h1>hello world</h1>`);

    assert.equal(insertCount, 1);
    assert.equal(updateCount, 0);

    args.positionOne = 'no first?';
    this.rerender();
    assert.equal(updateCount, 0);

    args.positionTwo = 'YASSSSSSS!!!';
    this.rerender();
    assert.equal(updateCount, 1);
  }

  @test 'modifers only track named arguments they consume'(assert: Assert) {
    let insertCount = 0;
    let updateCount = 0;

    let foo = this.defineModifier(
      class extends CustomModifier {
        didInsertElement() {
          insertCount++;

          // consume the second positional
          // eslint-disable-next-line no-unused-expressions
          this.args.named.qux;
        }

        didUpdate() {
          updateCount++;
        }
      }
    );

    let Main = defineComponent(
      { foo },
      '<h1 {{foo @positionOne @positionTwo bar=@bar qux=@qux}}>hello world</h1>'
    );

    let args = trackedObj({
      bar: 'bar',
      qux: 'quz',
    });

    this.renderComponent(Main, args);

    this.assertHTML(`<h1>hello world</h1>`);

    assert.equal(insertCount, 1);
    assert.equal(updateCount, 0);

    args.bar = 'other bar';
    this.rerender();
    assert.equal(updateCount, 0);

    args.qux = 'quuuuxxxxxx';
    this.rerender();
    assert.equal(updateCount, 1);
  }
}

jitSuite(ModifierManagerTest322);
jitSuite(ModifierManagerTest313);
