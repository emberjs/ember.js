import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';
import EmberObject from 'ember-runtime/system/object';
import TextField from 'ember-views/views/text_field';
import Component from 'ember-views/components/component';

moduleFor('Helpers test: {{get}}', class extends RenderingTest {
  ['@test should be able to get an object value with a static key']() {
    this.render(`[{{get colors 'apple'}}] [{{if true (get colors 'apple')}}]`, {
      colors: { apple: 'red', banana: 'yellow' }
    });

    this.assertText('[red] [red]');

    this.runTask(() => this.rerender());

    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'colors', {
      apple: 'green', banana: 'purple'
    }));

    this.assertText('[green] [green]');
  }

  ['@test should be able to get an object value with nested static key']() {
    this.render(`[{{get colors "apple.gala"}}] [{{if true (get colors "apple.gala")}}]`, {
      colors: { apple: { gala: 'red and yellow' }, banana: 'yellow' }
    });

    this.assertText('[red and yellow] [red and yellow]');

    this.runTask(() => this.rerender());

    this.assertText('[red and yellow] [red and yellow]');

    this.runTask(() => set(this.context, 'colors', {
      apple: { gala: 'yellow and red striped' }, banana: 'purple'
    }));

    this.assertText('[yellow and red striped] [yellow and red striped]');

    this.runTask(() => set(this.context, 'colors.apple.gala', 'yellow-redish'));

    this.assertText('[yellow-redish] [yellow-redish]');
  }

  ['@test should be able to get an object value with a bound/dynamic key']() {
    this.render(`[{{get colors key}}] [{{if true (get colors key)}}]`, {
      colors: { apple: 'red', banana: 'yellow' },
      key: 'apple'
    });
    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'key', 'banana'));
    this.assertText('[yellow] [yellow]');

    this.runTask(() => set(this.context, 'colors', {
      apple: 'green',
      banana: 'purple'
    }));
    this.assertText('[purple] [purple]');

    this.runTask(() => set(this.context, 'key', 'apple'));
    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'colors.apple', 'red'));
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

    this.runTask(() => set(this.context, 'key', 'apple.mcintosh'));
    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'key', 'banana'));
    this.assertText('[yellow] [yellow]');
  }

  ['@test should be able to get an object value with subexpression returning nested key']() {
    this.render(`[{{get colors (concat 'apple' '.' 'gala')}}] [{{if true (get colors (concat 'apple' '.' 'gala'))}}]`, {
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

    this.runTask(() => set(this.context, 'colors', { apple: { gala: 'yellow and red striped' }, banana: 'purple' }));
    this.assertText('[yellow and red striped] [yellow and red striped]');

    this.runTask(() => set(this.context, 'colors.apple.gala', 'yellow-redish'));
    this.assertText('[yellow-redish] [yellow-redish]');
  }

  ['@test should be able to get an object value with a GetStream key']() {
    this.render(`[{{get colors (get possibleKeys key)}}] [{{if true (get colors (get possibleKeys key))}}]`, {
      colors: { apple: 'red', banana: 'yellow' },
      key: 'key1',
      possibleKeys: { key1: 'apple', key2: 'banana' }
    });
    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'key', 'key2'));
    this.assertText('[yellow] [yellow]');

    this.runTask(() => set(this.context, 'colors', { apple: 'green', banana: 'purple' }));
    this.assertText('[purple] [purple]');

    this.runTask(() => set(this.context, 'key', 'key1'));
    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'colors.apple', 'red'));
    this.assertText('[red] [red]');
  }

  ['@test should be able to get an object value with a GetStream value and bound/dynamic key']() {
    this.render(`[{{get (get possibleValues objectKey) key}}] [{{if true (get (get possibleValues objectKey) key)}}]`, {
      possibleValues: {
        colors1: { apple: 'red', banana: 'yellow' },
        colors2: { apple: 'green', banana: 'purple' }
      },
      objectKey: 'colors1',
      key: 'apple'
    });
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
  }

  ['@test should be able to get an object value with a GetStream value and GetStream key']() {
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

    this.runTask(() => set(this.context, 'objectKey', 'colors2'));
    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'objectKey', 'colors1'));
    this.assertText('[red] [red]');

    this.runTask(() => set(this.context, 'key', 'key2'));
    this.assertText('[yellow] [yellow]');

    this.runTask(() => set(this.context, 'objectKey', 'colors2'));
    this.assertText('[purple] [purple]');

    this.runTask(() => set(this.context, 'objectKey', 'colors1'));
    this.assertText('[yellow] [yellow]');
  }

  ['@test should yield `get`']() {
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

  ['@htmlbars should handle object values as nulls']() {
    this.render(`[{{get colors 'apple'}}] [{{if true (get colors 'apple')}}]`, {
      colors: null
    });
    this.assertText('[] []');

    this.runTask(() => set(this.context, 'colors', { apple: 'green', banana: 'purple' }));
    this.assertText('[green] [green]');

    this.runTask(() => set(this.context, 'colors', null));
    this.assertText('[] []');
  }

  ['@htmlbars should handle object values and keys as nulls']() {
    this.render(`[{{get colors 'apple'}}] [{{if true (get colors key)}}]`, {
      colors: null,
      key: null
    });
    this.assertText('[] []');
  }

  ['@htmlbars get helper value should be updatable using {{input}} and (mut) - dynamic key']() {
    this.registerComponent('-text-field', { ComponentClass: TextField });

    this.render(`{{input type='text' value=(mut (get source key)) id='get-input'}}`, {
      source: EmberObject.create({
        banana: 'banana'
      }),
      key: 'banana'
    });

    this.assert.strictEqual(this.$('#get-input').val(), 'banana');

    this.runTask(() => set(this.context, 'source.banana', 'yellow'));
    this.assert.strictEqual(this.$('#get-input').val(), 'yellow');

    this.runTask(() => {
      this.$('#get-input').val('some value');

      // have tried to fire _elementValueDidChange via events but no luck
      // so looks like the only option is to call _elementValueDidChange manually
      // which I suspect doesn't seem to work for glimmer once it's implemented
      //
      // this.$('#get-input').trigger('input');
      // this.$('#get-input').trigger('paste');
      // this.$('#get-input').trigger('change');
      // this.$('#get-input').triggerHandler('input');
      this.component.childViews[0]._elementValueDidChange();
    });

    this.assert.strictEqual(this.$('#get-input').val(), 'some value');
    this.assert.strictEqual(get(this.context, 'source.banana'), 'some value');
  }

  ['@htmlbars get helper value should be updatable using {{input}} and (mut) - dynamic nested key']() {
    this.registerComponent('-text-field', { ComponentClass: TextField });

    this.render(`{{input type='text' value=(mut (get source key)) id='get-input'}}`, {
      source: EmberObject.create({
        apple: {
          mcintosh: 'mcintosh'
        }
      }),
      key: 'apple.mcintosh'
    });


    this.assert.strictEqual(this.$('#get-input').val(), 'mcintosh');

    this.runTask(() => set(this.context, 'source.apple.mcintosh', 'red'));

    this.assert.strictEqual(this.$('#get-input').val(), 'red');

    this.runTask(() => {
      this.$('#get-input').val('some value');
      this.component.childViews[0]._elementValueDidChange();
    });

    this.assert.strictEqual(this.$('#get-input').val(), 'some value');
    this.assert.strictEqual(get(this.context, 'source.apple.mcintosh'), 'some value');
  }

  ['@htmlbars get helper value should be updatable using {{input}} and (mut) - static key']() {
    this.registerComponent('-text-field', { ComponentClass: TextField });

    this.render(`{{input type='text' value=(mut (get source 'banana')) id='get-input'}}`, {
      source: EmberObject.create({
        banana: 'banana'
      }),
      key: 'banana'
    });

    this.assert.strictEqual(this.$('#get-input').val(), 'banana');

    this.runTask(() => set(this.context, 'context.source.banana', 'yellow'));

    this.assert.strictEqual(this.$('#get-input').val(), 'yellow');

    this.runTask(() => {
      this.$('#get-input').val('some value');
      this.component.childViews[0]._elementValueDidChange();
    });

    this.assert.strictEqual(this.$('#get-input').val(), 'some value');
    this.assert.strictEqual(get(this.context, 'source.banana'), 'some value');
  }
});

