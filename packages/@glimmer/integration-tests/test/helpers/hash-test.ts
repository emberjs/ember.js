import { jitSuite, RenderTest, test, GlimmerishComponent, tracked } from '../..';

class HashTest extends RenderTest {
  static suiteName = 'Helpers test: {{hash}}';

  @test
  'returns a hash with the right key-value'() {
    this.render(`{{#let (hash name="Sergio") as |person|}}{{person.name}}{{/let}}`);

    this.assertHTML('Sergio');
    this.assertStableRerender();
  }

  @test
  'can have more than one key-value'() {
    this.render(
      `{{#let (hash name="Sergio" lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/let}}`
    );

    this.assertHTML('Sergio Arbeo');
    this.assertStableRerender();
  }

  @test
  'binds values when variables are used'() {
    this.render(
      `{{#let (hash name=this.firstName lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/let}}`,
      {
        firstName: 'Marisa',
      }
    );

    this.assertHTML('Marisa Arbeo');
    this.assertStableRerender();

    this.rerender({ firstName: 'Sergio' });
    this.assertHTML('Sergio Arbeo');

    this.rerender({ firstName: 'Marisa' });
    this.assertHTML('Marisa Arbeo');
  }

  @test
  'binds multiple values when variables are used'() {
    this.render(
      `{{#let (hash name=this.firstName lastName=this.lastName) as |person|}}{{person.name}} {{person.lastName}}{{/let}}`,
      {
        firstName: 'Marisa',
        lastName: 'Arbeo',
      }
    );

    this.assertHTML('Marisa Arbeo');
    this.assertStableRerender();

    this.rerender({ firstName: 'Sergio' });
    this.assertHTML('Sergio Arbeo');

    this.rerender({ lastName: 'Smith' });
    this.assertHTML('Sergio Smith');

    this.rerender({ firstName: 'Marisa', lastName: 'Arbeo' });
    this.assertHTML('Marisa Arbeo');
  }

  @test
  'hash helpers can be nested'() {
    this.render(
      `{{#let (hash person=(hash name=this.firstName)) as |ctx|}}{{ctx.person.name}}{{/let}}`,
      {
        firstName: 'Balint',
      }
    );

    this.assertHTML('Balint');
    this.assertStableRerender();

    this.rerender({ firstName: 'Chad' });
    this.assertHTML('Chad');

    this.rerender({ firstName: 'Balint' });
    this.assertHTML('Balint');
  }

  @test
  'should yield hash of internal properties'() {
    let fooBarInstance: FooBar;

    class FooBar extends GlimmerishComponent {
      @tracked firstName = 'Chad';

      constructor(owner: object, args: Record<string, unknown>) {
        super(owner, args);
        fooBarInstance = this;
      }
    }

    this.registerComponent(
      'Glimmer',
      'FooBar',
      `{{yield (hash firstName=this.firstName)}}`,
      FooBar
    );

    this.render(`<FooBar as |values|>{{values.firstName}}</FooBar>`);

    this.assertHTML('Chad');
    this.assertStableRerender();

    fooBarInstance!.firstName = 'Godfrey';
    this.rerender();
    this.assertHTML('Godfrey');

    fooBarInstance!.firstName = 'Chad';
    this.rerender();
    this.assertHTML('Chad');
  }

  @test
  'should yield hash of internal and external properties'() {
    let fooBarInstance: FooBar;

    class FooBar extends GlimmerishComponent {
      @tracked firstName = 'Chad';

      constructor(owner: object, args: Record<string, unknown>) {
        super(owner, args);
        fooBarInstance = this;
      }
    }

    this.registerComponent(
      'Glimmer',
      'FooBar',
      `{{yield (hash firstName=this.firstName lastName=@lastName)}}`,
      FooBar
    );

    this.render(
      `<FooBar @lastName={{this.lastName}} as |values|>{{values.firstName}} {{values.lastName}}</FooBar>`,
      {
        lastName: 'Hietala',
      }
    );

    this.assertHTML('Chad Hietala');
    this.assertStableRerender();

    fooBarInstance!.firstName = 'Godfrey';
    this.rerender({ lastName: 'Chan' });

    this.assertHTML('Godfrey Chan');

    fooBarInstance!.firstName = 'Chad';
    this.rerender({ lastName: 'Hietala' });

    this.assertHTML('Chad Hietala');
  }
}

jitSuite(HashTest);
