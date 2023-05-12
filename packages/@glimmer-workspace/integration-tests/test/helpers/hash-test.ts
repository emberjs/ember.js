import { GlimmerishComponent, jitSuite, RenderTest, test, tracked } from '../..';

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

    const assignInstance = (instance: FooBar) => (fooBarInstance = instance);

    class FooBar extends GlimmerishComponent {
      @tracked firstName = 'Chad';

      constructor(owner: object, args: Record<string, unknown>) {
        super(owner, args);
        assignInstance(this);
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

    const assignInstance = (instance: FooBar) => (fooBarInstance = instance);

    class FooBar extends GlimmerishComponent {
      @tracked firstName = 'Chad';

      constructor(owner: object, args: Record<string, unknown>) {
        super(owner, args);
        assignInstance(this);
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

  @test
  'individual hash values are accessed lazily'(assert: Assert) {
    class FooBar extends GlimmerishComponent {
      firstName = 'Godfrey';

      get lastName() {
        assert.ok(false, 'lastName was accessed');

        return;
      }
    }

    this.registerComponent(
      'Glimmer',
      'FooBar',
      `{{yield (hash firstName=@firstName lastName=this.lastName)}}`,
      FooBar
    );

    this.render(`<FooBar @firstName="Godfrey" as |values|>{{values.firstName}}</FooBar>`);

    this.assertHTML('Godfrey');
    this.assertStableRerender();
  }

  @test
  'defined hash keys can be updated'(assert: Assert) {
    class FooBar extends GlimmerishComponent {
      constructor(owner: object, args: { hash: Record<string, unknown> }) {
        super(owner, args);
        args.hash['firstName'] = 'Chad';

        assert.strictEqual(args.hash['firstName'], 'Chad', 'Name updated in JS');
      }
    }

    this.registerComponent('Glimmer', 'FooBar', `{{yield @hash}}`, FooBar);

    this.render(
      `<FooBar @hash={{hash firstName="Godfrey" lastName="Hietala"}} as |values|>{{values.firstName}} {{values.lastName}}</FooBar>`
    );

    // Name will not be updated in templates because templates access the child
    // reference on hashes directly
    this.assertHTML('Godfrey Hietala');
    this.assertStableRerender();

    assert.validateDeprecations(
      /You set the 'firstName' property on a \{\{hash\}\} object. Setting properties on objects generated by \{\{hash\}\} is deprecated. Please update to use an object created with a tracked property or getter, or with a custom helper./u
    );
  }

  @test
  'defined hash keys are reset whenever the upstream changes'(assert: Assert) {
    class FooBar extends GlimmerishComponent {
      constructor(owner: object, args: { hash: Record<string, unknown> }) {
        super(owner, args);
        args.hash['name'] = 'Chad';
      }

      get alias() {
        return (this.args['hash'] as Record<string, unknown>)['name'];
      }
    }

    this.registerComponent('Glimmer', 'FooBar', `{{yield @hash this.alias}}`, FooBar);

    this.render(
      `<FooBar @hash={{hash name=this.name}} as |values alias|>{{values.name}} {{alias}}</FooBar>`,
      {
        name: 'Godfrey',
      }
    );

    // JS alias will be updated, version accessed lazily in templates will not
    this.assertHTML('Godfrey Chad');
    this.assertStableRerender();

    this.rerender({ name: 'Tom' });

    // Both will be updated to match the new value
    this.assertHTML('Tom Tom');
    this.assertStableRerender();

    assert.validateDeprecations(
      /You set the 'name' property on a \{\{hash\}\} object. Setting properties on objects generated by \{\{hash\}\} is deprecated. Please update to use an object created with a tracked property or getter, or with a custom helper./u
    );
  }

  @test
  'undefined hash keys can be updated'(assert: Assert) {
    class FooBar extends GlimmerishComponent {
      constructor(owner: object, args: { hash: Record<string, unknown> }) {
        super(owner, args);
        args.hash['lastName'] = 'Chan';
      }
    }

    this.registerComponent('Glimmer', 'FooBar', `{{yield @hash}}`, FooBar);

    this.render(
      `<FooBar @hash={{hash firstName="Godfrey"}} as |values|>{{values.firstName}} {{values.lastName}}</FooBar>`
    );

    this.assertHTML('Godfrey Chan');
    this.assertStableRerender();

    assert.validateDeprecations(
      /You set the 'lastName' property on a \{\{hash\}\} object. Setting properties on objects generated by \{\{hash\}\} is deprecated. Please update to use an object created with a tracked property or getter, or with a custom helper./u
    );
  }
}

jitSuite(HashTest);
