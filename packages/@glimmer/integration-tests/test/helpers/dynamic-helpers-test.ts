import {
  RenderTest,
  test,
  jitSuite,
  GlimmerishComponent,
  defineSimpleHelper,
  defineComponent,
} from '../..';

class DynamicHelpersResolutionModeTest extends RenderTest {
  static suiteName = 'dynamic helpers in resolution mode';

  @test
  'Can invoke a yielded nested helper in resolution mode'() {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    this.registerComponent('TemplateOnly', 'Bar', '{{#let @x as |x|}}{{x.foo}}{{/let}}');

    this.render('<Bar @x={{this.x}} />', { x: { foo } });
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can invoke a helper definition based on this fallback lookup in resolution mode'(
    assert: Assert
  ) {
    const foo = defineSimpleHelper(() => 'Hello, world!');
    this.registerComponent(
      'Glimmer',
      'Bar',
      '{{x.foo}}',
      class extends GlimmerishComponent {
        x = { foo };
      }
    );

    this.render('<Bar/>');
    this.assertHTML('Hello, world!');
    this.assertStableRerender();

    assert.validateDeprecations(
      /The `x\.foo` property path was used in a template for the `.*` component without using `this`/
    );
  }

  @test
  'Can use a dynamic helper with nested helpers'() {
    const foo = defineSimpleHelper(() => 'world!');
    const bar = defineSimpleHelper((value: string) => 'Hello, ' + value);
    const Bar = defineComponent(
      { foo },
      '{{this.bar (foo)}}',
      class extends GlimmerishComponent {
        bar = bar;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }

  @test
  'Can use a dynamic helper with nested dynamic helpers'() {
    const foo = defineSimpleHelper(() => 'world!');
    const bar = defineSimpleHelper((value: string) => 'Hello, ' + value);
    const Bar = defineComponent(
      {},
      '{{this.bar (this.foo)}}',
      class extends GlimmerishComponent {
        foo = foo;
        bar = bar;
      }
    );

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }
}

jitSuite(DynamicHelpersResolutionModeTest);
