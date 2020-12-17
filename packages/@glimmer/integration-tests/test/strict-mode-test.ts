import {
  RenderTest,
  test,
  jitSuite,
  GlimmerishComponent,
  trackedObj,
  defineComponent,
  defineSimpleHelper,
  defineSimpleModifier,
  syntaxErrorFor,
} from '..';

class GeneralStrictModeTest extends RenderTest {
  static suiteName = 'strict mode: general properties';

  @test
  'Can call helper in append position as subexpression (without args)'() {
    const plusOne = defineSimpleHelper((value = 0) => value + 1);
    const Bar = defineComponent({ plusOne }, '{{(plusOne)}}');

    this.renderComponent(Bar);
    this.assertHTML('1');
    this.assertStableRerender();
  }

  @test
  'Can call helper in argument position as subexpression (without args)'() {
    const plusOne = defineSimpleHelper((value = 0) => value + 1);
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({ plusOne, Foo }, '<Foo @value={{(plusOne)}}/>');

    this.renderComponent(Bar);
    this.assertHTML('1');
    this.assertStableRerender();
  }

  @test
  'Can call helper in argument position as subexpression in non-strict template (cross-compat test)'() {
    this.registerHelper('plusOne', () => 'Hello, world!');
    this.registerComponent('TemplateOnly', 'Foo', '{{@value}}');
    this.registerComponent('TemplateOnly', 'Bar', '<Foo @value={{(plusOne)}}/>');

    this.render('<Bar/>');
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can call helper in argument position as subexpression (with args)'() {
    const plusOne = defineSimpleHelper((value = 0) => value + 1);
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({ plusOne, Foo }, '<Foo @value={{(plusOne 1)}}/>');

    this.renderComponent(Bar);
    this.assertHTML('2');
    this.assertStableRerender();
  }

  @test
  'Can call helper in argument position directly (with args)'() {
    const plusOne = defineSimpleHelper((value = 0) => value + 1);
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({ plusOne, Foo }, '<Foo @value={{plusOne 1}}/>');

    this.renderComponent(Bar);
    this.assertHTML('2');
    this.assertStableRerender();
  }

  @test
  'Cannot use partials in strict mode'() {
    this.assert.throws(() => {
      defineComponent({}, '{{partial bar}}');
    }, /{{partial}} is not allowed in strict mode templates/);
  }

  @test
  'Implicit this lookup does not work'() {
    const Foo = defineComponent(
      {},
      '{{bar}}',
      class extends GlimmerishComponent {
        bar = 'Hello, world!';
      }
    );

    this.assert.throws(() => {
      this.renderComponent(Foo);
    }, /Attempted to resolve a value in a strict mode template, but that value was not in scope: bar/);
  }

  @test
  '{{component}} throws an error if a string is used in strict (append position)'() {
    this.assert.throws(() => {
      defineComponent({}, '{{component "bar"}}');
    }, /{{component}} cannot resolve string values in strict mode templates/);
  }

  @test
  '{{component}} throws an error if a string is used indirectly in strict (append position)'() {
    const Foo = defineComponent(
      {},
      '{{component this.bar}}',
      class extends GlimmerishComponent {
        bar = 'bar';
      }
    );

    this.assert.throws(() => {
      this.renderComponent(Foo);
    }, /Error: Attempted to resolve a dynamic component with a string definition, `bar` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly./);
  }

  @test
  '{{component}} throws an error if a string is used indirectly in strict after first render (append position)'() {
    const Bar = defineComponent({}, 'Hello, world!');

    const Foo = defineComponent({}, '{{component @Bar}}');

    let args = trackedObj({ Bar });

    this.renderComponent(Foo, args);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();

    args.Bar = 'bar';

    this.assert.throws(() => {
      this.rerender();
    }, /Error: Attempted to resolve a dynamic component with a string definition, `bar` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly./);
  }

  @test
  '{{component}} throws an error if a string is used in strict (block position)'() {
    this.assert.throws(() => {
      defineComponent({}, '{{#component "bar"}}{{/component}}');
    }, /{{#component}} cannot resolve string values in strict mode templates/);
  }

  @test
  '{{component}} throws an error if a string is used indirectly in strict (block position)'() {
    const Foo = defineComponent(
      {},
      '{{#component this.bar}}{{/component}}',
      class extends GlimmerishComponent {
        bar = 'bar';
      }
    );

    this.assert.throws(() => {
      this.renderComponent(Foo);
    }, /Error: Attempted to resolve a dynamic component with a string definition, `bar` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly./);
  }

  @test
  '{{component}} throws an error if a string is used indirectly in strict after first render (block position)'() {
    const Bar = defineComponent({}, 'Hello, world!');

    const Foo = defineComponent({}, '{{#component @Bar}}{{/component}}');

    let args = trackedObj({ Bar });

    this.renderComponent(Foo, args);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();

    args.Bar = 'bar';

    this.assert.throws(() => {
      this.rerender();
    }, /Error: Attempted to resolve a dynamic component with a string definition, `bar` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly./);
  }

  @test
  '{{component}} throws an error if a string is used in strict (expression position)'() {
    this.assert.throws(() => {
      defineComponent({}, '{{#let (component "bar") as |bar|}}{{/let}}');
    }, /\(component\) cannot resolve string values in strict mode templates/);
  }

  @test
  '{{component}} throws an error if a string is used indirectly in strict (expression position)'() {
    const Bar = defineComponent(
      {},
      '{{#let (component this.bar) as |bar|}}<bar/>{{/let}}',
      class extends GlimmerishComponent {
        bar = 'bar';
      }
    );

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Error: Attempted to resolve a dynamic component with a string definition, `bar` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly./);
  }

  @test
  '{{component}} throws an error if a string is used indirectly in strict after first render (expression position)'() {
    const Bar = defineComponent({}, 'Hello, world!');

    const Foo = defineComponent({}, '{{#let (component @Bar) as |bar|}}<bar/>{{/let}}');

    let args = trackedObj({ Bar });

    this.renderComponent(Foo, args);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();

    args.Bar = 'bar';

    this.assert.throws(() => {
      this.rerender();
    }, /Error: Attempted to resolve a dynamic component with a string definition, `bar` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly./);
  }

  @test
  'works with a curried string component defined in a resolution mode component'() {
    this.registerComponent('TemplateOnly', 'Hello', 'Hello, world!');

    const Foo = defineComponent(null, '{{component "Hello"}}');
    const Bar = defineComponent({ Foo }, '<Foo/>');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }
}

class StaticStrictModeTest extends RenderTest {
  static suiteName = 'strict mode: static template values';

  @test
  'Can use a component in scope'() {
    const Foo = defineComponent({}, 'Hello, world!');
    const Bar = defineComponent({ Foo }, '<Foo/>');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a custom helper in scope (in append position)'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const Bar = defineComponent({ foo }, '{{foo}}');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a custom helper in scope (in append position 1with args)'() {
    const foo = defineSimpleHelper((value: string) => value);
    const Bar = defineComponent({ foo }, '{{foo "Hello, world!"}}');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a custom helper in scope (as subexpression)'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const bar = defineSimpleHelper((value: string) => value);
    const Baz = defineComponent({ foo, bar }, '{{bar (foo)}}');

    this.renderComponent(Baz);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a custom modifier in scope'() {
    const foo = defineSimpleModifier((element: Element) => (element.innerHTML = 'Hello, world!'));
    const Bar = defineComponent({ foo }, '<div {{foo}}></div>');

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can shadow keywords'() {
    const ifComponent = defineComponent({}, 'Hello, world!');
    const Bar = defineComponent({ if: ifComponent }, '{{#if}}{{/if}}');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use template local in nested blocks with locals'() {
    const place = defineSimpleHelper(() => 'world');
    const Foo = defineComponent({}, '{{yield "Hello"}}');
    const Bar = defineComponent({ Foo, place }, '<Foo as |hi|>{{hi}}, {{place}}!</Foo>');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use component in ambiguous helper/component position (without args)'() {
    const foo = defineComponent({}, 'Hello, world!');
    const bar = defineComponent({ foo }, '{{foo}}');

    this.renderComponent(bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use component in ambiguous helper/component position (with args)'() {
    const foo = defineComponent({}, '{{@value}}');
    const bar = defineComponent({ foo }, '{{foo value="Hello, world!"}}');

    this.renderComponent(bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use constant values in ambiguous helper/component position'() {
    const value = 'Hello, world!';

    const Foo = defineComponent({ value }, '{{value}}');

    this.renderComponent(Foo);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use constant values as arguments to helpers'() {
    const value = 'Hello, world!';

    const foo = defineSimpleHelper((value: unknown) => value);
    const Bar = defineComponent({ foo, value }, '{{foo value}}');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use constant values as arguments to components'() {
    const value = 'Hello, world!';

    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({ Foo, value }, '<Foo @value={{value}}/>');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  '{{component}} works with static components'() {
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({ Foo }, '{{component Foo value="Hello, world!"}}');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  '{{component}} works with static components when passed to another component'() {
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({}, '<@Baz/>');
    const Baz = defineComponent(
      { Foo, Bar },
      '<Bar @Baz={{component Foo value="Hello, world!"}}/>'
    );

    this.renderComponent(Baz);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Throws an error if component is not in scope'() {
    this.assert.throws(() => {
      defineComponent({}, '<Foo/>');
    }, syntaxErrorFor('Attempted to invoke a component that was not in scope in a strict mode template, `<Foo>`. If you wanted to create an element with that name, convert it to lowercase - `<foo>`', '<Foo/>', 'an unknown module', 1, 0));
  }

  @test
  'Throws an error if value in append position is not in scope'() {
    const Bar = defineComponent({}, '{{foo}}');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a value in a strict mode template, but that value was not in scope: foo/);
  }

  @test
  'Throws an error if component or helper in append position is not in scope'() {
    const Bar = defineComponent({}, '{{foo "bar"}}');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a component or helper in a strict mode template, but that value was not in scope: foo/);
  }

  @test
  'Throws an error if a value in argument position is not in scope'() {
    const Foo = defineComponent({}, '{{@foo}}');
    const Bar = defineComponent({ Foo }, '<Foo @foo={{bar}}/>');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a value in a strict mode template, but that value was not in scope: bar/);
  }

  @test
  'Throws an error if helper in argument position (with args) is not in scope'() {
    const Foo = defineComponent({}, '{{@foo}}');
    const Bar = defineComponent({ Foo }, '<Foo @foo={{bar "aoeu"}}/>');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a helper in a strict mode template, but that value was not in scope: bar/);
  }

  @test
  'Throws an error if helper in subexpression position is not in scope'() {
    const foo = defineSimpleHelper((value: string) => value);
    const Bar = defineComponent({ foo }, '{{foo (bar)}}');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a helper in a strict mode template, but that value was not in scope: bar/);
  }

  @test
  'Throws an error if value in append position is not in scope, and component is registered'() {
    this.registerComponent('TemplateOnly', 'foo', 'Hello, world!');
    const Bar = defineComponent({}, '{{foo}}');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a value in a strict mode template, but that value was not in scope: foo/);
  }

  @test
  'Throws an error if value in append position is not in scope, and helper is registered'() {
    this.registerHelper('foo', () => 'Hello, world!');
    const Bar = defineComponent({}, '{{foo}}');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a value in a strict mode template, but that value was not in scope: foo/);
  }

  @test
  'Throws an error if component or helper in append position is not in scope, and helper is registered'() {
    this.registerHelper('foo', () => 'Hello, world!');
    const Bar = defineComponent({}, '{{foo "bar"}}');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a component or helper in a strict mode template, but that value was not in scope: foo/);
  }

  @test
  'Throws an error if a value in argument position is not in scope, and helper is registered'() {
    this.registerHelper('bar', () => 'Hello, world!');
    const Foo = defineComponent({}, '{{@foo}}');
    const Bar = defineComponent({ Foo }, '<Foo @foo={{bar}}/>');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a value in a strict mode template, but that value was not in scope: bar/);
  }

  @test
  'Throws an error if helper in argument position (with args) is not in scope, and helper is registered'() {
    this.registerHelper('bar', () => 'Hello, world!');
    const Foo = defineComponent({}, '{{@foo}}');
    const Bar = defineComponent({ Foo }, '<Foo @foo={{bar "aoeu"}}/>');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a helper in a strict mode template, but that value was not in scope: bar/);
  }

  @test
  'Throws an error if helper in subexpression position is not in scope, and helper is registered'() {
    this.registerHelper('bar', () => 'Hello, world!');
    const foo = defineSimpleHelper((value: string) => value);
    const Bar = defineComponent({ foo }, '{{foo (bar)}}');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a helper in a strict mode template, but that value was not in scope: bar/);
  }

  @test
  'Throws an error if modifier is not in scope'() {
    const Bar = defineComponent({}, '<div {{foo}}></div>');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a modifier in a strict mode template, but it was not in scope: foo/);
  }

  @test
  'Throws an error if modifier is not in scope, and modifier is registred'() {
    this.registerModifier('name', class {});
    const Bar = defineComponent({}, '<div {{foo}}></div>');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to resolve a modifier in a strict mode template, but it was not in scope: foo/);
  }

  @test
  'Throws an error if a non-component is used as a component'() {
    const Foo = defineSimpleHelper(() => 'Hello, world!');
    const Bar = defineComponent({ Foo }, '<Foo/>');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to load a component, but there wasn't a component manager associated with the definition. The definition was:/);
  }

  @test
  'Throws an error if a non-helper is used as a helper'() {
    const foo = defineComponent({}, 'Hello, world!');
    const Bar = defineComponent({ foo }, '{{#if (foo)}}{{/if}}');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to load a helper, but there wasn't a helper manager associated with the definition. The definition was:/);
  }

  @test
  'Throws an error if a non-modifier is used as a modifier'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const Bar = defineComponent({ foo }, '<div {{foo}}></div>');

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Attempted to load a modifier, but there wasn't a modifier manager associated with the definition. The definition was:/);
  }
}

class DynamicStrictModeTest extends RenderTest {
  static suiteName = 'strict mode: dynamic template values';

  @test
  'Can use a dynamic component'() {
    const Foo = defineComponent({}, 'Hello, world!');
    const Bar = defineComponent(
      {},
      '<this.Foo/>',
      class extends GlimmerishComponent {
        Foo = Foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic component in ambiguous append position'() {
    const Foo = defineComponent({}, 'Hello, world!');
    const Bar = defineComponent(
      {},
      '{{this.Foo}}',
      class extends GlimmerishComponent {
        Foo = Foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic component in append position (with args)'() {
    const Foo = defineComponent({}, 'Hello, {{@value}}');
    const Bar = defineComponent(
      {},
      '{{this.Foo value="world!"}}',
      class extends GlimmerishComponent {
        Foo = Foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic component in block position'() {
    const Foo = defineComponent({}, 'Hello, {{yield}}');
    const Bar = defineComponent(
      {},
      '{{#this.Foo}}world!{{/this.Foo}}',
      class extends GlimmerishComponent {
        Foo = Foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic helper'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const Bar = defineComponent(
      {},
      '{{this.foo}}',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic helper (with args)'() {
    const foo = defineSimpleHelper((value: string) => value);
    const Bar = defineComponent(
      {},
      '{{this.foo "Hello, world!"}}',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic helper as a subexpression'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const Bar = defineComponent(
      {},
      '{{(this.foo)}}',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic helper as a subexpression (with args)'() {
    const foo = defineSimpleHelper((value: string) => value);
    const Bar = defineComponent(
      {},
      '{{(this.foo "Hello, world!")}}',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic helper as an argument'() {
    const foo = defineSimpleHelper((value: string) => value);
    const bar = defineSimpleHelper((value: string) => value);
    const Bar = defineComponent(
      { bar },
      '{{bar (this.foo "Hello, world!")}}',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic helper as an argument (with args)'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const bar = defineSimpleHelper((value: string) => value);
    const Bar = defineComponent(
      { bar },
      '{{bar (this.foo)}}',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Calling a dynamic helper without a value returns undefined'() {
    const Bar = defineComponent({}, '{{this.foo 123}}', class extends GlimmerishComponent {});

    this.renderComponent(Bar);
    this.assertHTML('');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic modifier'() {
    const foo = defineSimpleModifier((element: Element) => (element.innerHTML = 'Hello, world!'));
    const Bar = defineComponent(
      {},
      '<div {{this.foo}}></div>',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass modifier as argument and invoke dynamically'() {
    const foo = defineSimpleModifier((element: Element) => (element.innerHTML = 'Hello, world!'));
    const Foo = defineComponent({}, '<div {{@value}}></div>');
    const Bar = defineComponent({ foo, Foo }, '<Foo @value={{foo}}/>');

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass modifier as argument and invoke dynamically (with args)'() {
    const foo = defineSimpleModifier(
      (element: Element, [value]: string[]) => (element.innerHTML = value)
    );
    const Foo = defineComponent({}, '<div {{@value "Hello, world!"}}></div>');
    const Bar = defineComponent({ foo, Foo }, '<Foo @value={{foo}}/>');

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass modifier as argument and invoke dynamically (with named args)'() {
    const foo = defineSimpleModifier(
      (element: Element, _: unknown, { greeting }: { greeting: string }) =>
        (element.innerHTML = greeting)
    );
    const Foo = defineComponent({}, '<div {{@value greeting="Hello, world!"}}></div>');
    const Bar = defineComponent({ foo, Foo }, '<Foo @value={{foo}}/>');

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically'() {
    const foo = defineSimpleModifier(
      (element: Element, [value]: string[]) => (element.innerHTML = value)
    );
    const Foo = defineComponent({}, '<div {{@value}}></div>');
    const Bar = defineComponent({ foo, Foo }, '<Foo @value={{modifier foo "Hello, world!"}}/>');

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically (with args)'() {
    const foo = defineSimpleModifier(
      (element: Element, [first, second]: string[]) => (element.innerHTML = `${first} ${second}`)
    );
    const Foo = defineComponent({}, '<div {{@value "world!"}}></div>');
    const Bar = defineComponent({ foo, Foo }, '<Foo @value={{modifier foo "Hello,"}}/>');

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically (with args, multi-layer)'() {
    const foo = defineSimpleModifier(
      (element: Element, values: string[]) => (element.innerHTML = values.join(' '))
    );
    const Foo = defineComponent({}, '<div {{@value "three"}}></div>');
    const Bar = defineComponent({ Foo }, '<Foo @value={{modifier @value "two"}}/>');
    const Baz = defineComponent({ foo, Bar }, '<Bar @value={{modifier foo "one"}}/>');

    this.renderComponent(Baz);
    this.assertHTML('<div>one two three</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically (with named args)'() {
    const foo = defineSimpleModifier(
      (element: Element, _: unknown, { greeting }: { greeting: string }) =>
        (element.innerHTML = greeting)
    );
    const Foo = defineComponent({}, '<div {{@value greeting="Hello, Nebula!"}}></div>');
    const Bar = defineComponent(
      { foo, Foo },
      '<Foo @value={{modifier foo greeting="Hello, world!"}}/>'
    );

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, Nebula!</div>');
    this.assertStableRerender();
  }

  @test
  'Can pass curried modifier as argument and invoke dynamically (with named args, multi-layer)'() {
    const foo = defineSimpleModifier(
      (element: Element, _: unknown, { greeting, name }: { greeting: string; name: string }) =>
        (element.innerHTML = `${greeting} ${name}`)
    );

    const Foo = defineComponent({}, '<div {{@value name="Nebula!"}}></div>');
    const Bar = defineComponent(
      { Foo },
      '<Foo @value={{modifier @value greeting="Hello," name="world!"}}/>'
    );
    const Baz = defineComponent({ foo, Bar }, '<Bar @value={{modifier foo greeting="Hola,"}}/>');

    this.renderComponent(Baz);
    this.assertHTML('<div>Hello, Nebula!</div>');
    this.assertStableRerender();
  }

  @test
  'Can use a nested argument as a modifier'() {
    const foo = defineSimpleModifier((element: Element) => (element.innerHTML = 'Hello, world!'));
    const x = { foo };
    const Foo = defineComponent({}, '<div {{@x.foo}}></div>');
    const Bar = defineComponent({ Foo, x }, '<Foo @x={{x}}/>');

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Calling a dynamic modifier without a value is a no-op'() {
    const Bar = defineComponent(
      {},
      '<div {{this.foo 123}}></div>',
      class extends GlimmerishComponent {}
    );

    this.renderComponent(Bar);
    this.assertHTML('<div></div>');
    this.assertStableRerender();
  }

  @test
  'Throws an error if a non-modifier is used as a modifier'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const Bar = defineComponent(
      {},
      '<div {{this.foo}}></div>',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Expected a dynamic modifier definition, but received an object or function that did not have a modifier manager associated with it. The dynamic invocation was `{{this.foo}}`, and the incorrect definition is the value at the path `this.foo`, which was:/);
  }

  @test
  'Can use a nested in scope value as dynamic component'() {
    const Foo = defineComponent({}, 'Hello, world!');
    const x = { Foo };
    const Bar = defineComponent({ x }, '<x.Foo/>');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a nested in scope value as dynamic helper'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    const x = { foo };
    const Bar = defineComponent({ x }, '{{x.foo}}');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a nested in scope value as dynamic modifier'() {
    const foo = defineSimpleModifier((element: Element) => (element.innerHTML = 'Hello, world!'));
    const x = { foo };
    const Bar = defineComponent({ x }, '<div {{x.foo}}></div>');

    this.renderComponent(Bar);
    this.assertHTML('<div>Hello, world!</div>');
    this.assertStableRerender();
  }

  @test
  'Can use a nested in scope value as dynamic value in argument position'() {
    const x = { value: 'Hello, world!' };
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({ Foo, x }, '<Foo @value={{x.value}}/>');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a nested in scope value as dynamic value in ambigious append position'() {
    const x = { value: 'Hello, world!' };
    const Bar = defineComponent({ x }, '{{x.value}}');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  '{{component}} works with static components'() {
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent(
      {},
      '{{component this.Foo value="Hello, world!"}}',
      class extends GlimmerishComponent {
        Foo = Foo;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  '{{component}} works with static components when passed to another component'() {
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({}, '<@Baz/>');
    const Baz = defineComponent(
      { Bar },
      '<Bar @Baz={{component this.Foo value="Hello, world!"}}/>',
      class extends GlimmerishComponent {
        Foo = Foo;
      }
    );

    this.renderComponent(Baz);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Throws an error if a non-component is used as a component'() {
    const Foo = defineSimpleHelper(() => 'Hello, world!');
    const Bar = defineComponent(
      {},
      '<this.Foo/>',
      class extends GlimmerishComponent {
        Foo = Foo;
      }
    );

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Expected a dynamic component definition, but received an object or function that did not have a component manager associated with it. The dynamic invocation was `<this.Foo>` or `{{this.Foo}}`, and the incorrect definition is the value at the path `this.Foo`, which was:/);
  }

  @test
  'Can pass helper as argument and invoke dynamically'() {
    const plusOne = defineSimpleHelper(() => 'Hello, world!');
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({ plusOne, Foo }, '<Foo @value={{plusOne}}/>');

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can pass helper as argument and invoke dynamically (with args)'() {
    const plusOne = defineSimpleHelper((value = 0) => value + 1);
    const Foo = defineComponent({}, '{{@value 123}}');
    const Bar = defineComponent({ plusOne, Foo }, '<Foo @value={{plusOne}}/>');

    this.renderComponent(Bar);
    this.assertHTML('124');
    this.assertStableRerender();
  }

  @test
  'Can pass curried helper as argument and invoke dynamically'() {
    const plusOne = defineSimpleHelper((value = 0) => value + 1);
    const Foo = defineComponent({}, '{{@value}}');
    const Bar = defineComponent({ plusOne, Foo }, '<Foo @value={{helper plusOne 123}}/>');

    this.renderComponent(Bar);
    this.assertHTML('124');
    this.assertStableRerender();
  }

  @test
  'Can pass curried helper as argument and invoke dynamically (with args)'() {
    const add = defineSimpleHelper((a: number, b: number) => a + b);
    const Foo = defineComponent({}, '{{@value 2}}');
    const Bar = defineComponent({ add, Foo }, '<Foo @value={{helper add 1}}/>');

    this.renderComponent(Bar);
    this.assertHTML('3');
    this.assertStableRerender();
  }

  @test
  'Passing a curried helper without a value is a no-op'() {
    const Foo = defineComponent({}, '{{@value 2}}');
    const Bar = defineComponent({ Foo }, '<Foo @value={{helper @foo 1}}/>');

    this.renderComponent(Bar);
    this.assertHTML('');
    this.assertStableRerender();
  }

  @test
  'Throws an error if a non-helper is used as a helper'() {
    const foo = defineComponent({}, 'Hello, world!');
    const Bar = defineComponent(
      {},
      '{{#if (this.foo)}}{{/if}}',
      class extends GlimmerishComponent {
        foo = foo;
      }
    );

    this.assert.throws(() => {
      this.renderComponent(Bar);
    }, /Expected a dynamic helper definition, but received an object or function that did not have a helper manager associated with it. The dynamic invocation was `{{this.foo}}` or `\(this.foo\)`, and the incorrect definition is the value at the path `this.foo`, which was:/);
  }
}

jitSuite(GeneralStrictModeTest);
jitSuite(StaticStrictModeTest);
jitSuite(DynamicStrictModeTest);
