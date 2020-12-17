import { jitSuite, RenderTest, test, GlimmerishComponent, tracked } from '../..';

class GetTest extends RenderTest {
  static suiteName = 'Helpers test: {{get}}';
  @test
  'should be able to get an object value with a static key'() {
    this.render(`[{{get colors 'apple'}}] [{{if true (get colors 'apple')}}]`, {
      colors: { apple: 'red' },
    });

    this.assertHTML('[red] [red]');
    this.assertStableRerender();

    this.rerender({ colors: { apple: 'green' } });
    this.assertHTML('[green] [green]');

    this.rerender({ colors: { apple: 'red' } });
    this.assertHTML('[red] [red]');
  }

  @test
  'should be able to get an object value with nested static key'() {
    this.render(`[{{get colors "apple.gala"}}] [{{if true (get colors "apple.gala")}}]`, {
      colors: {
        apple: {
          gala: 'red and yellow',
        },
      },
    });

    this.assertHTML('[red and yellow] [red and yellow]');
    this.assertStableRerender();

    this.rerender({
      colors: {
        apple: {
          gala: 'yellow and red striped',
        },
      },
    });
    this.assertHTML('[yellow and red striped] [yellow and red striped]');

    this.rerender({
      colors: {
        apple: {
          gala: 'red and yellow',
        },
      },
    });
    this.assertHTML('[red and yellow] [red and yellow]');
  }

  @test
  'should be able to get an object value with a number'() {
    this.render(`[{{get items 1}}][{{get items 2}}][{{get items 3}}]`, {
      items: {
        1: 'First',
        2: 'Second',
        3: 'Third',
      },
    });

    this.assertHTML('[First][Second][Third]');
    this.assertStableRerender();

    this.rerender({ items: { 1: 'Qux', 2: 'Second', 3: 'Third' } });
    this.assertHTML('[Qux][Second][Third]');

    this.rerender({ items: { 1: 'First', 2: 'Second', 3: 'Third' } });
    this.assertHTML('[First][Second][Third]');
  }

  @test
  'should be able to get an array value with a number'() {
    this.render(`[{{get numbers 0}}][{{get numbers 1}}][{{get numbers 2}}]`, {
      numbers: [1, 2, 3],
    });

    this.assertHTML('[1][2][3]');
    this.assertStableRerender();

    this.rerender({ numbers: [3, 2, 1] });
    this.assertHTML('[3][2][1]');

    this.rerender({ numbers: [1, 2, 3] });
    this.assertHTML('[1][2][3]');
  }

  @test
  'should be able to get an object value with a path evaluating to a number'() {
    this.render(`{{#each indexes as |index|}}[{{get items index}}]{{/each}}`, {
      indexes: [1, 2, 3],
      items: {
        1: 'First',
        2: 'Second',
        3: 'Third',
      },
    });

    this.assertHTML('[First][Second][Third]');
    this.assertStableRerender();

    this.rerender({ items: { 1: 'Qux', 2: 'Second', 3: 'Third' } });
    this.assertHTML('[Qux][Second][Third]');

    this.rerender({ items: { 1: 'First', 2: 'Second', 3: 'Third' } });
    this.assertHTML('[First][Second][Third]');
  }

  @test
  'should be able to get an array value with a path evaluating to a number'() {
    this.render(`{{#each numbers as |num index|}}[{{get numbers index}}]{{/each}}`, {
      numbers: [1, 2, 3],
    });

    this.assertHTML('[1][2][3]');
    this.assertStableRerender();

    this.rerender({ numbers: [3, 2, 1] });
    this.assertHTML('[3][2][1]');
  }

  @test
  'should be able to get an object value with a bound/dynamic key'() {
    this.render(`[{{get colors key}}] [{{if true (get colors key)}}]`, {
      colors: { apple: 'red', banana: 'yellow' },
      key: 'apple',
    });

    this.assertHTML('[red] [red]');
    this.assertStableRerender();

    this.rerender({ key: 'banana' });
    this.assertHTML('[yellow] [yellow]');

    this.rerender({ colors: { apple: 'green', banana: 'purple' } });
    this.assertHTML('[purple] [purple]');

    this.rerender({ key: 'apple' });
    this.assertHTML('[green] [green]');
  }

  @test
  'should be able to get an object value with nested dynamic key'() {
    this.render(`[{{get colors key}}] [{{if true (get colors key)}}]`, {
      colors: {
        apple: {
          gala: 'red and yellow',
          mcintosh: 'red',
        },
        banana: 'yellow',
      },
      key: 'apple.gala',
    });

    this.assertHTML('[red and yellow] [red and yellow]');
    this.assertStableRerender();

    this.rerender({ key: 'apple.mcintosh' });
    this.assertHTML('[red] [red]');

    this.rerender({ key: 'banana' });
    this.assertHTML('[yellow] [yellow]');

    this.rerender({ key: 'apple.gala' });
    this.assertHTML('[red and yellow] [red and yellow]');
  }

  @test
  'should be able to get an object value with subexpression returning nested key'() {
    this.render(
      `[{{get colors (concat 'apple' '.' 'gala')}}] [{{if true (get colors (concat 'apple' '.' 'gala'))}}]`,
      {
        colors: {
          apple: {
            gala: 'red and yellow',
            mcintosh: 'red',
          },
        },
        key: 'apple.gala',
      }
    );

    this.assertHTML('[red and yellow] [red and yellow]');
    this.assertStableRerender();

    this.rerender({
      colors: {
        apple: {
          gala: 'yellow and red striped',
        },
      },
    });
    this.assertHTML('[yellow and red striped] [yellow and red striped]');

    this.rerender({
      colors: {
        apple: {
          gala: 'yellow-redish',
        },
      },
    });
    this.assertHTML('[yellow-redish] [yellow-redish]');
  }

  @test
  'should be able to get an object value with a get helper as the key'() {
    this.render(
      `[{{get colors (get possibleKeys key)}}] [{{if true (get colors (get possibleKeys key))}}]`,
      {
        colors: { apple: 'red', banana: 'yellow' },
        key: 'key1',
        possibleKeys: { key1: 'apple', key2: 'banana' },
      }
    );

    this.assertHTML('[red] [red]');
    this.assertStableRerender();

    this.rerender({ key: 'key2' });
    this.assertHTML('[yellow] [yellow]');

    this.rerender({ colors: { apple: 'green', banana: 'purple' } });
    this.assertHTML('[purple] [purple]');

    this.rerender({ key: 'key1' });
    this.assertHTML('[green] [green]');

    this.rerender({ colors: { apple: 'red', banana: 'yellow' } });
    this.assertHTML('[red] [red]');
  }

  @test
  'should be able to get an object value with a get helper value as a bound/dynamic key'() {
    this.render(
      `[{{get (get possibleValues objectKey) key}}] [{{if true (get (get possibleValues objectKey) key)}}]`,
      {
        possibleValues: {
          colors1: { apple: 'red', banana: 'yellow' },
          colors2: { apple: 'green', banana: 'purple' },
        },
        objectKey: 'colors1',
        key: 'apple',
      }
    );

    this.assertHTML('[red] [red]');
    this.assertStableRerender();

    this.rerender({ objectKey: 'colors2' });
    this.assertHTML('[green] [green]');

    this.rerender({ objectKey: 'colors1' });
    this.assertHTML('[red] [red]');

    this.rerender({ key: 'banana' });
    this.assertHTML('[yellow] [yellow]');

    this.rerender({ objectKey: 'colors2' });
    this.assertHTML('[purple] [purple]');

    this.rerender({ objectKey: 'colors1' });
    this.assertHTML('[yellow] [yellow]');
  }

  @test
  'should be able to get an object value with a get helper as the value and a get helper as the key'() {
    this.render(
      `[{{get (get possibleValues objectKey) (get possibleKeys key)}}] [{{if true (get (get possibleValues objectKey) (get possibleKeys key))}}]`,
      {
        possibleValues: {
          colors1: { apple: 'red', banana: 'yellow' },
          colors2: { apple: 'green', banana: 'purple' },
        },
        objectKey: 'colors1',
        possibleKeys: {
          key1: 'apple',
          key2: 'banana',
        },
        key: 'key1',
      }
    );

    this.assertHTML('[red] [red]');
    this.assertStableRerender();

    this.rerender({ objectKey: 'colors2' });
    this.assertHTML('[green] [green]');

    this.rerender({ objectKey: 'colors1' });
    this.assertHTML('[red] [red]');

    this.rerender({ key: 'key2' });
    this.assertHTML('[yellow] [yellow]');

    this.rerender({ objectKey: 'colors2' });
    this.assertHTML('[purple] [purple]');

    this.rerender({ objectKey: 'colors1', key: 'key1' });
    this.assertHTML('[red] [red]');
  }

  @test
  'the result of a get helper can be yielded'() {
    let fooBarInstance: FooBar;

    class FooBar extends GlimmerishComponent {
      @tracked mcintosh = 'red';

      constructor(owner: object, args: Record<string, unknown>) {
        super(owner, args);
        fooBarInstance = this;
      }
    }

    this.registerComponent('Glimmer', 'FooBar', '{{yield (get @colors this.mcintosh)}}', FooBar);

    this.render(`<FooBar @colors={{this.colors}} as |value|>{{value}}</FooBar>`, {
      colors: {
        red: 'banana',
      },
    });

    this.assertHTML('banana');
    this.assertStableRerender();

    fooBarInstance!.mcintosh = 'yellow';
    this.rerender({ colors: { yellow: 'bus' } });
    this.assertHTML('bus');

    fooBarInstance!.mcintosh = 'red';
    this.rerender({ colors: { red: 'banana' } });
    this.assertHTML('banana');
  }

  @test
  'should handle object values as nulls'() {
    this.render(`[{{get colors 'apple'}}] [{{if true (get colors 'apple')}}]`, {
      colors: null,
    });

    this.assertHTML('[] []');

    this.assertStableRerender();

    this.assertHTML('[] []');

    this.rerender({ colors: { apple: 'green', banana: 'purple' } });
    this.assertHTML('[green] [green]');

    this.rerender({ colors: null });
    this.assertHTML('[] []');
  }

  @test
  'should handle object keys as nulls'() {
    this.render(`[{{get colors key}}] [{{if true (get colors key)}}]`, {
      colors: {
        apple: 'red',
        banana: 'yellow',
      },
      key: null,
    });

    this.assertHTML('[] []');
    this.assertStableRerender();

    this.rerender({ key: 'banana' });
    this.assertHTML('[yellow] [yellow]');

    this.rerender({ key: null });
    this.assertHTML('[] []');
  }

  @test
  'should handle object values and keys as nulls'() {
    this.render(`[{{get colors 'apple'}}] [{{if true (get colors key)}}]`, {
      colors: null,
      key: null,
    });

    this.assertHTML('[] []');
  }

  @test
  'should be able to get an object value with a path from this.args in a glimmer component'() {
    class PersonComponent extends GlimmerishComponent {
      options = ['first', 'last', 'age'];
    }

    this.registerComponent(
      'Glimmer',
      'PersonWrapper',
      '{{#each this.options as |option|}}{{get this.args option}}{{/each}}',
      PersonComponent
    );

    this.render('<PersonWrapper @first={{first}} @last={{last}} @age={{age}}/>', {
      first: 'miguel',
      last: 'andrade',
    });

    this.assertHTML('miguelandrade');
    this.assertStableRerender();

    this.rerender({ age: 30 });
    this.assertHTML('miguelandrade30');
  }
}

jitSuite(GetTest);
