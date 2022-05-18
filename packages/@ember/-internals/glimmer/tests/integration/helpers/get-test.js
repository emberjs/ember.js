import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';

import { set, get } from '@ember/object';

import { Component } from '../../utils/helpers';
import GlimmerishComponent from '../../utils/glimmerish-component';

moduleFor(
  'Helpers test: {{get}}',
  class extends RenderingTestCase {
    ['@test should be able to get an object value with a static key']() {
      this.render(`[{{get this.colors 'apple'}}] [{{if true (get this.colors 'apple')}}]`, {
        colors: { apple: 'red' },
      });

      this.assertText('[red] [red]');

      runTask(() => this.rerender());

      this.assertText('[red] [red]');

      runTask(() => set(this.context, 'colors.apple', 'green'));

      this.assertText('[green] [green]');

      runTask(() =>
        set(this.context, 'colors', {
          apple: 'red',
        })
      );

      this.assertText('[red] [red]');
    }

    ['@test should be able to get an object value with nested static key']() {
      this.render(
        `[{{get this.colors "apple.gala"}}] [{{if true (get this.colors "apple.gala")}}]`,
        {
          colors: {
            apple: {
              gala: 'red and yellow',
            },
          },
        }
      );

      this.assertText('[red and yellow] [red and yellow]');

      runTask(() => this.rerender());

      this.assertText('[red and yellow] [red and yellow]');

      runTask(() => set(this.context, 'colors.apple.gala', 'yellow and red striped'));

      this.assertText('[yellow and red striped] [yellow and red striped]');

      runTask(() => set(this.context, 'colors', { apple: { gala: 'red and yellow' } }));

      this.assertText('[red and yellow] [red and yellow]');
    }

    ['@test should be able to get an object value with a number']() {
      this.render(`[{{get this.items 1}}][{{get this.items 2}}][{{get this.items 3}}]`, {
        indexes: [1, 2, 3],
        items: {
          1: 'First',
          2: 'Second',
          3: 'Third',
        },
      });

      this.assertText('[First][Second][Third]');

      runTask(() => this.rerender());

      this.assertText('[First][Second][Third]');

      runTask(() => set(this.context, 'items.1', 'Qux'));

      this.assertText('[Qux][Second][Third]');

      runTask(() => set(this.context, 'items', { 1: 'First', 2: 'Second', 3: 'Third' }));

      this.assertText('[First][Second][Third]');
    }

    ['@test should be able to get an array value with a number']() {
      this.render(`[{{get this.numbers 0}}][{{get this.numbers 1}}][{{get this.numbers 2}}]`, {
        numbers: [1, 2, 3],
      });

      this.assertText('[1][2][3]');

      runTask(() => this.rerender());

      this.assertText('[1][2][3]');

      runTask(() => set(this.context, 'numbers', [3, 2, 1]));

      this.assertText('[3][2][1]');

      runTask(() => set(this.context, 'numbers', [1, 2, 3]));

      this.assertText('[1][2][3]');
    }

    ['@test should be able to get an object value with a path evaluating to a number']() {
      this.render(`{{#each this.indexes as |index|}}[{{get this.items index}}]{{/each}}`, {
        indexes: [1, 2, 3],
        items: {
          1: 'First',
          2: 'Second',
          3: 'Third',
        },
      });

      this.assertText('[First][Second][Third]');

      runTask(() => this.rerender());

      this.assertText('[First][Second][Third]');

      runTask(() => set(this.context, 'items.1', 'Qux'));

      this.assertText('[Qux][Second][Third]');

      runTask(() => set(this.context, 'items', { 1: 'First', 2: 'Second', 3: 'Third' }));

      this.assertText('[First][Second][Third]');
    }

    ['@test should be able to get an array value with a path evaluating to a number']() {
      this.render(`{{#each this.numbers as |num index|}}[{{get this.numbers index}}]{{/each}}`, {
        numbers: [1, 2, 3],
      });

      this.assertText('[1][2][3]');

      runTask(() => this.rerender());

      this.assertText('[1][2][3]');

      runTask(() => set(this.context, 'numbers', [3, 2, 1]));

      this.assertText('[3][2][1]');
    }

    ['@test should be able to get an object value with a bound/dynamic key']() {
      this.render(`[{{get this.colors this.key}}] [{{if true (get this.colors this.key)}}]`, {
        colors: { apple: 'red', banana: 'yellow' },
        key: 'apple',
      });

      this.assertText('[red] [red]');

      runTask(() => this.rerender());

      this.assertText('[red] [red]');

      runTask(() => set(this.context, 'key', 'banana'));

      this.assertText('[yellow] [yellow]');

      runTask(() => {
        set(this.context, 'colors.apple', 'green');
        set(this.context, 'colors.banana', 'purple');
      });

      this.assertText('[purple] [purple]');

      runTask(() => set(this.context, 'key', 'apple'));

      this.assertText('[green] [green]');

      runTask(() => set(this.context, 'colors', { apple: 'red' }));

      this.assertText('[red] [red]');
    }

    ['@test should be able to get an object value with nested dynamic key']() {
      this.render(`[{{get this.colors this.key}}] [{{if true (get this.colors this.key)}}]`, {
        colors: {
          apple: {
            gala: 'red and yellow',
            mcintosh: 'red',
          },
          banana: 'yellow',
        },
        key: 'apple.gala',
      });

      this.assertText('[red and yellow] [red and yellow]');

      runTask(() => this.rerender());

      this.assertText('[red and yellow] [red and yellow]');

      runTask(() => set(this.context, 'key', 'apple.mcintosh'));

      this.assertText('[red] [red]');

      runTask(() => set(this.context, 'key', 'banana'));

      this.assertText('[yellow] [yellow]');

      runTask(() => set(this.context, 'key', 'apple.gala'));

      this.assertText('[red and yellow] [red and yellow]');
    }

    ['@test should be able to get an object value with subexpression returning nested key']() {
      this.render(
        `[{{get this.colors (concat 'apple' '.' 'gala')}}] [{{if true (get this.colors (concat 'apple' '.' 'gala'))}}]`,
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

      this.assertText('[red and yellow] [red and yellow]');

      runTask(() => this.rerender());

      this.assertText('[red and yellow] [red and yellow]');

      runTask(() => set(this.context, 'colors.apple.gala', 'yellow and red striped'));

      this.assertText('[yellow and red striped] [yellow and red striped]');

      runTask(() => set(this.context, 'colors.apple.gala', 'yellow-redish'));

      this.assertText('[yellow-redish] [yellow-redish]');

      runTask(() =>
        set(this.context, 'colors', {
          apple: {
            gala: 'red and yellow',
            mcintosh: 'red',
          },
        })
      );

      this.assertText('[red and yellow] [red and yellow]');
    }

    ['@test should be able to get an object value with a get helper as the key']() {
      this.render(
        `[{{get this.colors (get this.possibleKeys this.key)}}] [{{if true (get this.colors (get this.possibleKeys this.key))}}]`,
        {
          colors: { apple: 'red', banana: 'yellow' },
          key: 'key1',
          possibleKeys: { key1: 'apple', key2: 'banana' },
        }
      );

      this.assertText('[red] [red]');

      runTask(() => this.rerender());

      this.assertText('[red] [red]');

      runTask(() => set(this.context, 'key', 'key2'));

      this.assertText('[yellow] [yellow]');

      runTask(() => {
        set(this.context, 'colors.apple', 'green');
        set(this.context, 'colors.banana', 'purple');
      });

      this.assertText('[purple] [purple]');

      runTask(() => set(this.context, 'key', 'key1'));

      this.assertText('[green] [green]');

      runTask(() => set(this.context, 'colors', { apple: 'red', banana: 'yellow' }));

      this.assertText('[red] [red]');
    }

    ['@test should be able to get an object value with a get helper value as a bound/dynamic key']() {
      this.render(
        `[{{get (get this.possibleValues this.objectKey) this.key}}] [{{if true (get (get this.possibleValues this.objectKey) this.key)}}]`,
        {
          possibleValues: {
            colors1: { apple: 'red', banana: 'yellow' },
            colors2: { apple: 'green', banana: 'purple' },
          },
          objectKey: 'colors1',
          key: 'apple',
        }
      );

      this.assertText('[red] [red]');

      runTask(() => this.rerender());

      this.assertText('[red] [red]');

      runTask(() => set(this.context, 'objectKey', 'colors2'));

      this.assertText('[green] [green]');

      runTask(() => set(this.context, 'objectKey', 'colors1'));

      this.assertText('[red] [red]');

      runTask(() => set(this.context, 'key', 'banana'));

      this.assertText('[yellow] [yellow]');

      runTask(() => set(this.context, 'objectKey', 'colors2'));

      this.assertText('[purple] [purple]');

      runTask(() => set(this.context, 'objectKey', 'colors1'));

      this.assertText('[yellow] [yellow]');

      runTask(() => set(this.context, 'key', 'apple'));
    }

    ['@test should be able to get an object value with a get helper as the value and a get helper as the key']() {
      this.render(
        `[{{get (get this.possibleValues this.objectKey) (get this.possibleKeys this.key)}}] [{{if true (get (get this.possibleValues this.objectKey) (get this.possibleKeys this.key))}}]`,
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

      this.assertText('[red] [red]');

      runTask(() => this.rerender());

      this.assertText('[red] [red]');

      runTask(() => set(this.context, 'objectKey', 'colors2'));

      this.assertText('[green] [green]');

      runTask(() => set(this.context, 'objectKey', 'colors1'));

      this.assertText('[red] [red]');

      runTask(() => set(this.context, 'key', 'key2'));

      this.assertText('[yellow] [yellow]');

      runTask(() => set(this.context, 'objectKey', 'colors2'));

      this.assertText('[purple] [purple]');

      runTask(() => {
        set(this.context, 'objectKey', 'colors1');
        set(this.context, 'key', 'key1');
      });

      this.assertText('[red] [red]');
    }

    ['@test the result of a get helper can be yielded']() {
      let fooBarInstance;
      let FooBarComponent = Component.extend({
        init() {
          this._super();
          fooBarInstance = this;
          this.mcintosh = 'red';
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: `{{yield (get this.colors this.mcintosh)}}`,
      });

      this.render(`{{#foo-bar colors=this.colors as |value|}}{{value}}{{/foo-bar}}`, {
        colors: {
          red: 'banana',
        },
      });

      this.assertText('banana');

      runTask(() => this.rerender());

      this.assertText('banana');

      runTask(() => {
        set(fooBarInstance, 'mcintosh', 'yellow');
        set(this.context, 'colors', { yellow: 'bus' });
      });

      this.assertText('bus');

      runTask(() => {
        set(fooBarInstance, 'mcintosh', 'red');
        set(this.context, 'colors', { red: 'banana' });
      });

      this.assertText('banana');
    }

    ['@test should handle object values as nulls']() {
      this.render(`[{{get this.colors 'apple'}}] [{{if true (get this.colors 'apple')}}]`, {
        colors: null,
      });

      this.assertText('[] []');

      runTask(() => this.rerender());

      this.assertText('[] []');

      runTask(() => set(this.context, 'colors', { apple: 'green', banana: 'purple' }));

      this.assertText('[green] [green]');

      runTask(() => set(this.context, 'colors', null));

      this.assertText('[] []');
    }

    ['@test should handle object keys as nulls']() {
      this.render(`[{{get this.colors this.key}}] [{{if true (get this.colors this.key)}}]`, {
        colors: {
          apple: 'red',
          banana: 'yellow',
        },
        key: null,
      });

      this.assertText('[] []');

      runTask(() => this.rerender());

      this.assertText('[] []');

      runTask(() => set(this.context, 'key', 'banana'));

      this.assertText('[yellow] [yellow]');

      runTask(() => set(this.context, 'key', null));

      this.assertText('[] []');
    }

    ['@test should handle object values and keys as nulls']() {
      this.render(`[{{get this.colors 'apple'}}] [{{if true (get this.colors this.key)}}]`, {
        colors: null,
        key: null,
      });

      this.assertText('[] []');
    }

    ['@test get helper value should be updatable using <Input> and (mut) - static key'](assert) {
      this.render(
        `<Input @type='text' @value={{mut (get this.source 'banana')}} id='get-input'/>`,
        {
          source: {
            banana: 'banana',
          },
        }
      );

      assert.strictEqual(this.$('#get-input').val(), 'banana');

      runTask(() => this.rerender());

      assert.strictEqual(this.$('#get-input').val(), 'banana');

      runTask(() => set(this.context, 'source.banana', 'yellow'));

      assert.strictEqual(this.$('#get-input').val(), 'yellow');

      runTask(() => this.$('#get-input').val('some value').trigger('change'));

      assert.strictEqual(this.$('#get-input').val(), 'some value');
      assert.strictEqual(get(this.context, 'source.banana'), 'some value');

      runTask(() => set(this.context, 'source', { banana: 'banana' }));

      assert.strictEqual(this.$('#get-input').val(), 'banana');
    }

    ['@test get helper value should be updatable using <Input> and (mut) - dynamic key'](assert) {
      this.render(
        `<Input @type='text' @value={{mut (get this.source this.key)}} id='get-input'/>`,
        {
          source: {
            apple: 'apple',
            banana: 'banana',
          },
          key: 'banana',
        }
      );

      assert.strictEqual(this.$('#get-input').val(), 'banana');

      runTask(() => this.rerender());

      assert.strictEqual(this.$('#get-input').val(), 'banana');

      runTask(() => set(this.context, 'source.banana', 'yellow'));

      assert.strictEqual(this.$('#get-input').val(), 'yellow');

      runTask(() => this.$('#get-input').val('some value').trigger('change'));

      assert.strictEqual(this.$('#get-input').val(), 'some value');
      assert.strictEqual(get(this.context, 'source.banana'), 'some value');

      runTask(() => set(this.context, 'key', 'apple'));

      assert.strictEqual(this.$('#get-input').val(), 'apple');

      runTask(() => this.$('#get-input').val('some other value').trigger('change'));

      assert.strictEqual(this.$('#get-input').val(), 'some other value');
      assert.strictEqual(get(this.context, 'source.apple'), 'some other value');

      runTask(() => {
        set(this.context, 'key', 'banana');
        set(this.context, 'source', { banana: 'banana' });
      });

      assert.strictEqual(this.$('#get-input').val(), 'banana');
    }

    ['@test get helper value should be updatable using <Input> and (mut) - dynamic nested key'](
      assert
    ) {
      this.render(
        `<Input @type='text' @value={{mut (get this.source this.key)}} id='get-input'/>`,
        {
          source: {
            apple: {
              gala: 'gala',
              mcintosh: 'mcintosh',
            },
            banana: 'banana',
          },
          key: 'apple.mcintosh',
        }
      );

      assert.strictEqual(this.$('#get-input').val(), 'mcintosh');

      runTask(() => this.rerender());

      assert.strictEqual(this.$('#get-input').val(), 'mcintosh');

      runTask(() => set(this.context, 'source.apple.mcintosh', 'red'));

      assert.strictEqual(this.$('#get-input').val(), 'red');

      runTask(() => this.$('#get-input').val('some value').trigger('change'));

      assert.strictEqual(this.$('#get-input').val(), 'some value');
      assert.strictEqual(get(this.context, 'source.apple.mcintosh'), 'some value');

      runTask(() => set(this.context, 'key', 'apple.gala'));

      assert.strictEqual(this.$('#get-input').val(), 'gala');

      runTask(() => this.$('#get-input').val('some other value').trigger('change'));

      assert.strictEqual(this.$('#get-input').val(), 'some other value');
      assert.strictEqual(get(this.context, 'source.apple.gala'), 'some other value');

      runTask(() => set(this.context, 'key', 'banana'));

      assert.strictEqual(this.$('#get-input').val(), 'banana');

      runTask(() => this.$('#get-input').val('yet another value').trigger('change'));

      assert.strictEqual(this.$('#get-input').val(), 'yet another value');
      assert.strictEqual(get(this.context, 'source.banana'), 'yet another value');

      runTask(() => {
        set(this.context, 'key', 'apple.mcintosh');
        set(this.context, 'source', {
          apple: {
            gala: 'gala',
            mcintosh: 'mcintosh',
          },
          banana: 'banana',
        });
      });

      assert.strictEqual(this.$('#get-input').val(), 'mcintosh');
    }

    '@test should be able to get an object value with a path from this.args in a glimmer component'() {
      class PersonComponent extends GlimmerishComponent {
        options = ['first', 'last', 'age'];
      }

      this.registerComponent('person-wrapper', {
        ComponentClass: PersonComponent,
        template: '{{#each this.options as |option|}}{{get this.args option}}{{/each}}',
      });

      this.render('<PersonWrapper @first={{this.first}} @last={{this.last}} @age={{this.age}}/>', {
        first: 'miguel',
        last: 'andrade',
      });

      this.assertText('miguelandrade');

      runTask(() => this.rerender());

      this.assertText('miguelandrade');

      runTask(() => set(this.context, 'age', 30));

      this.assertText('miguelandrade30');
    }
  }
);
