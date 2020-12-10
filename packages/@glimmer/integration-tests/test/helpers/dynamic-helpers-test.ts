import { RenderTest, test, jitSuite, GlimmerishComponent, defineSimpleHelper } from '../..';

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
  'Can invoke a helper definition based on this fallback lookup in resolution mode'() {
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
  }
}

jitSuite(DynamicHelpersResolutionModeTest);
