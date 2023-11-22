import {
  defineComponent,
  defineSimpleHelper,
  defineSimpleModifier,
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  syntaxErrorFor,
  test,
} from '../..';

class DynamicModifiersResolutionModeTest extends RenderTest {
  static suiteName = 'dynamic modifiers in resolution mode';

  @test
  'Can use a dynamic modifier'() {
    const foo = defineSimpleModifier((element: Element) => (element.innerHTML = 'Hello, world!'));

    this.registerComponent(
      'Glimmer',
      'Bar',
      '<div {{this.foo}}></div>',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.render('<Bar/>');
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can use a nested argument as a modifier'() {
    const foo = defineSimpleModifier((element: Element) => (element.innerHTML = 'Hello, world!'));
    this.registerComponent('TemplateOnly', 'Foo', '<div {{@x.foo}}></div>');

    this.render('<Foo @x={{this.x}}/>', { x: { foo } });
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically'() {
    const foo = defineSimpleModifier((element: Element, [value]: [string]): void => {
      element.innerHTML = value;
    });
    this.registerComponent('TemplateOnly', 'Foo', '<div {{@value}}></div>');

    this.render('<Foo @value={{modifier this.foo "Hello, world!"}}/>', { foo });
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically (with args, multi-layer)'() {
    const foo = defineSimpleModifier(
      (element: Element, values: string[]) => (element.innerHTML = values.join(' '))
    );
    this.registerComponent('TemplateOnly', 'Foo', '<div {{@value "three"}}></div>');
    this.registerComponent('TemplateOnly', 'Bar', '<Foo @value={{modifier @value "two"}}/>');

    this.render('<Bar @value={{modifier this.foo "one"}}/>', { foo });
    this.assertHTML('<div>one two three</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically (with args)'() {
    const foo = defineSimpleModifier(
      (element: Element, [first, second]: string[]) => (element.innerHTML = `${first} ${second}`)
    );
    this.registerComponent('TemplateOnly', 'Foo', '<div {{@value "world!"}}></div>');

    this.render('<Foo @value={{modifier this.foo "Hello,"}}/>', { foo });
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically (with named args)'() {
    const foo = defineSimpleModifier(
      (element: Element, _: unknown, { greeting }: { greeting: string }) =>
        (element.innerHTML = greeting)
    );
    this.registerComponent(
      'TemplateOnly',
      'Foo',
      '<div {{@value greeting="Hello, Nebula!"}}></div>'
    );

    this.render('<Foo @value={{modifier this.foo greeting="Hello, world!"}}/>', { foo });
    this.assertHTML('<div>Hello, Nebula!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically (with named args, multi-layer)'() {
    const foo = defineSimpleModifier(
      (element: Element, _: unknown, { greeting, name }: { greeting: string; name: string }) =>
        (element.innerHTML = `${greeting} ${name}`)
    );

    this.registerComponent('TemplateOnly', 'Foo', '<div {{@value name="Nebula!"}}></div>');
    this.registerComponent(
      'TemplateOnly',
      'Bar',
      '<Foo @value={{modifier @value greeting="Hello," name="world!"}}/>'
    );

    this.render('<Bar @value={{modifier this.foo greeting="Hola,"}}/>', { foo });
    this.assertHTML('<div>Hello, Nebula!</div>');
    this.assertStableRerender();
  }

  @test
  'Can invoke a yielded nested modifier'() {
    const foo = defineSimpleModifier((element: Element) => (element.innerHTML = 'Hello, world!'));
    this.registerComponent(
      'TemplateOnly',
      'Bar',
      '{{#let @x as |x|}}<div {{x.foo}}></div>{{/let}}'
    );

    this.render('<Bar @x={{this.x}} />', { x: { foo } });
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Cannot invoke a modifier definition based on this fallback lookup in resolution mode'() {
    this.assert.throws(
      () => {
        this.registerComponent('TemplateOnly', 'Bar', '<div {{x.foo}}></div>');
      },
      syntaxErrorFor(
        'You attempted to invoke a path (`{{#x.foo}}`) as a modifier, but x was not in scope. Try adding `this` to the beginning of the path',
        '{{x.foo}}',
        'an unknown module',
        1,
        5
      )
    );
  }

  @test
  'Can use a dynamic modifier with a nested helper'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const bar = defineSimpleModifier(
      (element: Element, value: string) => (element.innerHTML = value)
    );
    const Bar = defineComponent({ foo }, '<div {{this.bar (foo)}}></div>', {
      definition: class extends GlimmerishComponent {
        bar = bar;
      },
    });

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic modifier with a nested dynamic helper'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const bar = defineSimpleModifier(
      (element: Element, value: string) => (element.innerHTML = value)
    );
    const Bar = defineComponent({}, '<div {{this.bar (this.foo)}}></div>', {
      definition: class extends GlimmerishComponent {
        foo = foo;
        bar = bar;
      },
    });

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }
}

jitSuite(DynamicModifiersResolutionModeTest);
