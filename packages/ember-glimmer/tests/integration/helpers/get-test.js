import { RenderingTest, moduleFor } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import { set, get } from 'ember-metal';

moduleFor('Helpers test: {{get}}', class extends RenderingTest {

  ['@test should be able to get an object value with a static key']() {
    this.render(`[{{get colors 'apple'}}] [{{if true (get colors 'apple')}}]`, {
      colors: { apple: 'red' }
    });

    this.assertText('[red] [red]');

    this.runTask(() => this.rerender());

    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'colors.apple', 'green'));

    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'colors', {
      apple: 'red'
    }));

    this.assertText('[red] [red]');
  }

  ['@test should be able to get an object value with nested static key']() {
    this.render(`[{{get colors "apple.gala"}}] [{{if true (get colors "apple.gala")}}]`, {
      colors: {
        apple: {
          gala: 'red and yellow'
        }
      }
    });

    this.assertText('[red and yellow] [red and yellow]');

    this.runTask(() => this.rerender());

    this.assertText('[red and yellow] [red and yellow]');

    this.runTask(() => set(this.context, 'colors.apple.gala', 'yellow and red striped'));

    this.assertText('[yellow and red striped] [yellow and red striped]');

    this.runTask(() => set(this.context, 'colors', { apple: { gala: 'red and yellow' } }));

    this.assertText('[red and yellow] [red and yellow]');
  }

  ['@test should be able to get an object value with numeric keys']() {
    this.render(`{{#each indexes as |index|}}[{{get items index}}]{{/each}}`, {
      indexes: [1, 2, 3],
      items: {
        1: 'First',
        2: 'Second',
        3: 'Third'
      }
    });

    this.assertText('[First][Second][Third]');

    this.runTask(() => this.rerender());

    this.assertText('[First][Second][Third]');

    this.runTask(() => set(this.context, 'items.1', 'Qux'));

    this.assertText('[Qux][Second][Third]');

    this.runTask(() => set(this.context, 'items', { 1: 'First', 2: 'Second', 3: 'Third' }));

    this.assertText('[First][Second][Third]');
  }

  ['@test should be able to get an object value with a bound/dynamic key']() {
    this.render(`[{{get colors key}}] [{{if true (get colors key)}}]`, {
      colors: { apple: 'red', banana: 'yellow' },
      key: 'apple'
    });

    this.assertText('[red] [red]');

    this.runTask(() => this.rerender());

    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'key', 'banana'));

    this.assertText('[yellow] [yellow]');

    this.runTask(() => {
      set(this.context, 'colors.apple', 'green');
      set(this.context, 'colors.banana', 'purple');
    });

    this.assertText('[purple] [purple]');

    this.runTask(() => set(this.context, 'key', 'apple'));

    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'colors', { apple: 'red' }));

    this.assertText('[red] [red]');
  }

  ['@test should be able to get an object value with nested dynamic key']() {
    this.render(`[{{get colors key}}] [{{if true (get colors key)}}]`, {
      colors: {
        apple: {
          gala: 'red and yellow',
          mcintosh: 'red'
        },
        banana: 'yellow'
      },
      key: 'apple.gala'
    });

    this.assertText('[red and yellow] [red and yellow]');

    this.runTask(() => this.rerender());

    this.assertText('[red and yellow] [red and yellow]');

    this.runTask(() => set(this.context, 'key', 'apple.mcintosh'));

    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'key', 'banana'));

    this.assertText('[yellow] [yellow]');

    this.runTask(() => set(this.context, 'key', 'apple.gala'));

    this.assertText('[red and yellow] [red and yellow]');
  }

  ['@test should be able to get an object value with subexpression returning nested key']() {
    this.render(`[{{get colors (concat 'apple' '.' 'gala')}}] [{{if true (get colors (concat 'apple' '.' 'gala'))}}]`, {
      colors: {
        apple: {
          gala: 'red and yellow',
          mcintosh: 'red'
        }
      },
      key: 'apple.gala'
    });

    this.assertText('[red and yellow] [red and yellow]');

    this.runTask(() => this.rerender());

    this.assertText('[red and yellow] [red and yellow]');

    this.runTask(() => set(this.context, 'colors.apple.gala', 'yellow and red striped'));

    this.assertText('[yellow and red striped] [yellow and red striped]');

    this.runTask(() => set(this.context, 'colors.apple.gala', 'yellow-redish'));

    this.assertText('[yellow-redish] [yellow-redish]');

    this.runTask(() => set(this.context, 'colors', {
      apple: {
        gala: 'red and yellow',
        mcintosh: 'red'
      }
    }));

    this.assertText('[red and yellow] [red and yellow]');
  }

  ['@test should be able to get an object value with a get helper as the key']() {
    this.render(`[{{get colors (get possibleKeys key)}}] [{{if true (get colors (get possibleKeys key))}}]`, {
      colors: { apple: 'red', banana: 'yellow' },
      key: 'key1',
      possibleKeys: { key1: 'apple', key2: 'banana' }
    });

    this.assertText('[red] [red]');

    this.runTask(() => this.rerender());

    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'key', 'key2'));

    this.assertText('[yellow] [yellow]');

    this.runTask(() => {
      set(this.context, 'colors.apple', 'green');
      set(this.context, 'colors.banana', 'purple');
    });

    this.assertText('[purple] [purple]');

    this.runTask(() => set(this.context, 'key', 'key1'));

    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'colors', { apple: 'red', banana: 'yellow' }));

    this.assertText('[red] [red]');
  }

  ['@test should be able to get an object value with a get helper value as a bound/dynamic key']() {
    this.render(`[{{get (get possibleValues objectKey) key}}] [{{if true (get (get possibleValues objectKey) key)}}]`, {
      possibleValues: {
        colors1: { apple: 'red', banana: 'yellow' },
        colors2: { apple: 'green', banana: 'purple' }
      },
      objectKey: 'colors1',
      key: 'apple'
    });

    this.assertText('[red] [red]');

    this.runTask(() => this.rerender());

    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'objectKey', 'colors2'));

    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'objectKey', 'colors1'));

    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'key', 'banana'));

    this.assertText('[yellow] [yellow]');

    this.runTask(() => set(this.context, 'objectKey', 'colors2'));

    this.assertText('[purple] [purple]');

    this.runTask(() => set(this.context, 'objectKey', 'colors1'));

    this.assertText('[yellow] [yellow]');

    this.runTask(() => set(this.context, 'key', 'apple'));
  }

  ['@test should be able to get an object value with a get helper as the value and a get helper as the key']() {
    this.render(`[{{get (get possibleValues objectKey) (get possibleKeys key)}}] [{{if true (get (get possibleValues objectKey) (get possibleKeys key))}}]`, {
      possibleValues: {
        colors1: { apple: 'red', banana: 'yellow' },
        colors2: { apple: 'green', banana: 'purple' }
      },
      objectKey: 'colors1',
      possibleKeys: {
        key1: 'apple',
        key2: 'banana'
      },
      key: 'key1'
    });

    this.assertText('[red] [red]');

    this.runTask(() => this.rerender());

    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'objectKey', 'colors2'));

    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'objectKey', 'colors1'));

    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'key', 'key2'));

    this.assertText('[yellow] [yellow]');

    this.runTask(() => set(this.context, 'objectKey', 'colors2'));

    this.assertText('[purple] [purple]');

    this.runTask(() => {
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
      }
    });

    this.registerComponent('foo-bar', {
      ComponentClass: FooBarComponent,
      template: `{{yield (get colors mcintosh)}}`
    });

    this.render(`{{#foo-bar colors=colors as |value|}}{{value}}{{/foo-bar}}`, {
      colors: {
        red: 'banana'
      }
    });

    this.assertText('banana');

    this.runTask(() => this.rerender());

    this.assertText('banana');

    this.runTask(() => {
      set(fooBarInstance, 'mcintosh', 'yellow');
      set(this.context, 'colors', { yellow: 'bus' });
    });

    this.assertText('bus');

    this.runTask(() => {
      set(fooBarInstance, 'mcintosh', 'red');
      set(this.context, 'colors', { red: 'banana' });
    });

    this.assertText('banana');
  }

  ['@test should handle object values as nulls']() {
    this.render(`[{{get colors 'apple'}}] [{{if true (get colors 'apple')}}]`, {
      colors: null
    });

    this.assertText('[] []');

    this.runTask(() => this.rerender());

    this.assertText('[] []');

    this.runTask(() => set(this.context, 'colors', { apple: 'green', banana: 'purple' }));

    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'colors', null));

    this.assertText('[] []');
  }

  ['@test should handle object keys as nulls']() {
    this.render(`[{{get colors key}}] [{{if true (get colors key)}}]`, {
      colors: {
        apple: 'red',
        banana: 'yellow'
      },
      key: null
    });

    this.assertText('[] []');

    this.runTask(() => this.rerender());

    this.assertText('[] []');

    this.runTask(() => set(this.context, 'key', 'banana'));

    this.assertText('[yellow] [yellow]');

    this.runTask(() => set(this.context, 'key', null));

    this.assertText('[] []');
  }

  ['@test should handle object values and keys as nulls']() {
    this.render(`[{{get colors 'apple'}}] [{{if true (get colors key)}}]`, {
      colors: null,
      key: null
    });

    this.assertText('[] []');
  }

  ['@test get helper value should be updatable using {{input}} and (mut) - static key'](assert) {
    this.render(`{{input type='text' value=(mut (get source 'banana')) id='get-input'}}`, {
      source: {
        banana: 'banana'
      }
    });

    assert.strictEqual(this.$('#get-input').val(), 'banana');

    this.runTask(() => this.rerender());

    assert.strictEqual(this.$('#get-input').val(), 'banana');

    this.runTask(() => set(this.context, 'source.banana', 'yellow'));

    assert.strictEqual(this.$('#get-input').val(), 'yellow');

    this.runTask(() => this.$('#get-input').val('some value').trigger('change'));

    assert.strictEqual(this.$('#get-input').val(), 'some value');
    assert.strictEqual(get(this.context, 'source.banana'), 'some value');

    this.runTask(() => set(this.context, 'source', { banana: 'banana' }));

    assert.strictEqual(this.$('#get-input').val(), 'banana');
  }

  ['@test get helper value should be updatable using {{input}} and (mut) - dynamic key'](assert) {
    this.render(`{{input type='text' value=(mut (get source key)) id='get-input'}}`, {
      source: {
        apple: 'apple',
        banana: 'banana'
      },
      key: 'banana'
    });

    assert.strictEqual(this.$('#get-input').val(), 'banana');

    this.runTask(() => this.rerender());

    assert.strictEqual(this.$('#get-input').val(), 'banana');

    this.runTask(() => set(this.context, 'source.banana', 'yellow'));

    assert.strictEqual(this.$('#get-input').val(), 'yellow');

    this.runTask(() => this.$('#get-input').val('some value').trigger('change'));

    assert.strictEqual(this.$('#get-input').val(), 'some value');
    assert.strictEqual(get(this.context, 'source.banana'), 'some value');

    this.runTask(() => set(this.context, 'key', 'apple'));

    assert.strictEqual(this.$('#get-input').val(), 'apple');

    this.runTask(() => this.$('#get-input').val('some other value').trigger('change'));

    assert.strictEqual(this.$('#get-input').val(), 'some other value');
    assert.strictEqual(get(this.context, 'source.apple'), 'some other value');

    this.runTask(() => {
      set(this.context, 'key', 'banana');
      set(this.context, 'source', { banana: 'banana' });
    });

    assert.strictEqual(this.$('#get-input').val(), 'banana');
  }

  ['@test get helper value should be updatable using {{input}} and (mut) - dynamic nested key'](assert) {
    this.render(`{{input type='text' value=(mut (get source key)) id='get-input'}}`, {
      source: {
        apple: {
          gala: 'gala',
          mcintosh: 'mcintosh'
        },
        banana: 'banana'
      },
      key: 'apple.mcintosh'
    });

    assert.strictEqual(this.$('#get-input').val(), 'mcintosh');

    this.runTask(() => this.rerender());

    assert.strictEqual(this.$('#get-input').val(), 'mcintosh');

    this.runTask(() => set(this.context, 'source.apple.mcintosh', 'red'));

    assert.strictEqual(this.$('#get-input').val(), 'red');

    this.runTask(() => this.$('#get-input').val('some value').trigger('change'));

    assert.strictEqual(this.$('#get-input').val(), 'some value');
    assert.strictEqual(get(this.context, 'source.apple.mcintosh'), 'some value');

    this.runTask(() => set(this.context, 'key', 'apple.gala'));

    assert.strictEqual(this.$('#get-input').val(), 'gala');

    this.runTask(() => this.$('#get-input').val('some other value').trigger('change'));

    assert.strictEqual(this.$('#get-input').val(), 'some other value');
    assert.strictEqual(get(this.context, 'source.apple.gala'), 'some other value');

    this.runTask(() => set(this.context, 'key', 'banana'));

    assert.strictEqual(this.$('#get-input').val(), 'banana');

    this.runTask(() => this.$('#get-input').val('yet another value').trigger('change'));

    assert.strictEqual(this.$('#get-input').val(), 'yet another value');
    assert.strictEqual(get(this.context, 'source.banana'), 'yet another value');

    this.runTask(() => {
      set(this.context, 'key', 'apple.mcintosh');
      set(this.context, 'source', {
        apple: {
          gala: 'gala',
          mcintosh: 'mcintosh'
        },
        banana: 'banana'
      });
    });

    assert.strictEqual(this.$('#get-input').val(), 'mcintosh');
  }
});
