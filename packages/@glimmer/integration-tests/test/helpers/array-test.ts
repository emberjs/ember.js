import { GlimmerishComponent, jitSuite, RenderTest, strip, test, tracked } from '../..';

class ArrayTest extends RenderTest {
  static suiteName = 'Helpers test: {{array}}';

  @test
  'returns an array'() {
    this.render(strip`
    {{#with (array "Sergio") as |people|}}
      {{#each people as |personName|}}
        {{personName}}
      {{/each}}
    {{/with}}`);

    this.assertHTML('Sergio');

    this.assertStableRerender();
  }

  @test
  'can have more than one value'() {
    this.render(strip`
    {{#with (array "Sergio" "Robert") as |people|}}
      {{#each people as |personName|}}
        {{personName}},
      {{/each}}
    {{/with}}`);

    this.assertHTML('Sergio,Robert,');

    this.assertStableRerender();
  }

  @test
  'binds values when variables are used'() {
    this.render(
      strip`{{#with (array this.personOne) as |people|}}
            {{#each people as |personName|}}
              {{personName}}
            {{/each}}
          {{/with}}`,
      {
        personOne: 'Tom',
      }
    );

    this.assertHTML('Tom');

    this.assertStableRerender();

    this.rerender({ personOne: 'Yehuda' });
    this.assertHTML('Yehuda');

    this.rerender({ personOne: 'Tom' });
    this.assertHTML('Tom');
  }

  @test
  'binds multiple values when variables are used'() {
    this.render(
      strip`{{#with (array this.personOne this.personTwo) as |people|}}
            {{#each people as |personName|}}
              {{personName}},
            {{/each}}
          {{/with}}`,
      {
        personOne: 'Tom',
        personTwo: 'Yehuda',
      }
    );

    this.assertHTML('Tom,Yehuda,');

    this.assertStableRerender();

    this.rerender({ personOne: 'Sergio' });

    this.assertHTML('Sergio,Yehuda,');

    this.rerender({ personTwo: 'Tom' });

    this.assertHTML('Sergio,Tom,');

    this.rerender({ personOne: 'Tom', personTwo: 'Yehuda' });
    this.assertHTML('Tom,Yehuda,');
  }

  @test
  'array helpers can be nested'() {
    this.render(
      strip`
        {{#let (array (array this.personOne this.personTwo)) as |listOfPeople|}}
          {{#each listOfPeople as |people|}}
            List:
            {{#each people as |personName|}}
              {{personName}},
            {{/each}}
          {{/each}}
        {{/let}}
      `,
      {
        personOne: 'Tom',
        personTwo: 'Yehuda',
      }
    );

    this.assertHTML('List:Tom,Yehuda,');

    this.assertStableRerender();

    this.rerender({ personOne: 'Chad' });

    this.assertHTML('List:Chad,Yehuda,');

    this.rerender({ personTwo: 'Balint' });

    this.assertHTML('List:Chad,Balint,');

    this.rerender({ personOne: 'Tom', personTwo: 'Yehuda' });

    this.assertHTML('List:Tom,Yehuda,');
  }

  @test
  'should yield hash of an array of internal properties'() {
    let fooBarInstance: FooBar;

    class FooBar extends GlimmerishComponent {
      @tracked personOne;

      constructor(owner: object, args: Record<string, unknown>) {
        super(owner, args);
        this.personOne = 'Chad';
        fooBarInstance = this;
      }
    }

    this.registerComponent(
      'Glimmer',
      'FooBar',
      '{{yield (hash people=(array this.personOne))}}',
      FooBar
    );

    this.render(
      strip`
        <FooBar as |values|>
          {{#each values.people as |personName|}}
            {{personName}}
          {{/each}}
        </FooBar>
      `
    );

    this.assertHTML('Chad');

    this.assertStableRerender();

    fooBarInstance!.personOne = 'Godfrey';

    this.rerender();
    this.assertHTML('Godfrey');

    fooBarInstance!.personOne = 'Chad';

    this.rerender();
    this.assertHTML('Chad');
  }

  @test
  'should yield hash of an array of internal and external properties'() {
    let fooBarInstance: FooBar;

    class FooBar extends GlimmerishComponent {
      @tracked personOne = 'Chad';

      constructor(owner: object, args: Record<string, unknown>) {
        super(owner, args);
        fooBarInstance = this;
      }
    }

    this.registerComponent(
      'Glimmer',
      'FooBar',
      `{{yield (hash people=(array this.personOne @personTwo))}}`,
      FooBar
    );

    this.render(
      strip`
        <FooBar @personTwo={{this.model.personTwo}} as |values|>
          {{#each values.people as |personName|}}
            {{personName}},
          {{/each}}
        </FooBar>
      `,
      {
        model: { personTwo: 'Tom' },
      }
    );

    this.assertHTML('Chad,Tom,');

    this.assertStableRerender();

    fooBarInstance!.personOne = 'Godfrey';

    this.rerender({ model: { personTwo: 'Yehuda' } });
    this.assertHTML('Godfrey,Yehuda,');

    fooBarInstance!.personOne = 'Chad';

    this.rerender({ model: { personTwo: 'Tom' } });
    this.assertHTML('Chad,Tom,');
  }

  @test
  'should render when passing as argument to a component invocation'() {
    this.registerComponent(
      'TemplateOnly',
      'FooBar',
      strip`
        {{#each @people as |personName|}}
          {{personName}},
        {{/each}}
      `
    );

    this.render(strip`<FooBar @people={{array "Tom" this.personTwo}}/>`, { personTwo: 'Chad' });

    this.assertHTML('Tom,Chad,');

    this.assertStableRerender();

    this.rerender({ personTwo: 'Godfrey' });

    this.assertHTML('Tom,Godfrey,');

    this.rerender({ personTwo: 'Chad' });

    this.assertHTML('Tom,Chad,');
  }

  @test
  'should return an entirely new array when any argument change'() {
    let fooBarInstance: FooBar;

    class FooBar extends GlimmerishComponent {
      @tracked personOne = 'Chad';

      constructor(owner: object, args: Record<string, unknown>) {
        super(owner, args);
        fooBarInstance = this;
      }
    }

    this.registerComponent(
      'Glimmer',
      'FooBar',
      strip`
        {{#each @people as |personName|}}
          {{personName}},
        {{/each}}
      `,
      FooBar
    );

    this.render(strip`<FooBar @people={{array "Tom" this.personTwo}}/>`, { personTwo: 'Chad' });

    let firstArray = fooBarInstance!.args['people'];

    this.rerender({ personTwo: 'Godfrey' });

    this.assert.ok(
      firstArray !== fooBarInstance!.args['people'],
      'should have created an entirely new array'
    );
  }

  @test
  'capture array values in JS to assert deep equal'() {
    let captured;

    this.registerHelper('capture', function ([array]) {
      captured = array;
      return 'captured';
    });

    this.render(`{{capture (array 'Tom' this.personTwo)}}`, { personTwo: 'Godfrey' });

    this.assert.deepEqual(captured, ['Tom', 'Godfrey']);

    this.rerender({ personTwo: 'Robert' });

    this.assert.deepEqual(captured, ['Tom', 'Robert']);

    this.rerender({ personTwo: 'Godfrey' });

    this.assert.deepEqual(captured, ['Tom', 'Godfrey']);
  }

  @test
  'GH18693 properties in hash can be accessed from the array'() {
    this.render(strip`
      {{#each (array (hash some="thing")) as |item|}}
        {{item.some}}
      {{/each}}
    `);

    this.assertHTML('thing');
  }
}

jitSuite(ArrayTest);
