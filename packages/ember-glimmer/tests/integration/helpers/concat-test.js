import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal';

moduleFor('Helpers test: {{concat}}', class extends RenderingTest {

  ['@test it concats static arguments']() {
    this.render(`{{concat "foo" " " "bar" " " "baz"}}`);
    this.assertText('foo bar baz');
  }

  ['@test it updates for bound arguments']() {
    this.render(`{{concat model.first model.second}}`, {
      model: { first: 'one', second: 'two' }
    });

    this.assertText('onetwo');

    this.runTask(() => this.rerender());

    this.assertText('onetwo');

    this.runTask(() => set(this.context, 'model.first', 'three'));

    this.assertText('threetwo');

    this.runTask(() => set(this.context, 'model.second', 'four'));

    this.assertText('threefour');

    this.runTask(() => set(this.context, 'model', { first: 'one', second: 'two' }));

    this.assertText('onetwo');
  }

  ['@test it can be used as a sub-expression']() {
    this.render(`{{concat (concat model.first model.second) (concat model.third model.fourth)}}`, {
      model: {
        first: 'one',
        second: 'two',
        third: 'three',
        fourth: 'four'
      }
    });

    this.assertText('onetwothreefour');

    this.runTask(() => this.rerender());

    this.assertText('onetwothreefour');

    this.runTask(() => set(this.context, 'model.first', 'five'));

    this.assertText('fivetwothreefour');

    this.runTask(() => {
      set(this.context, 'model.second', 'six');
      set(this.context, 'model.third', 'seven');
    });

    this.assertText('fivesixsevenfour');

    this.runTask(() => {
      set(this.context, 'model', {
        first: 'one',
        second: 'two',
        third: 'three',
        fourth: 'four'
      });
    });

    this.assertText('onetwothreefour');
  }

  ['@test it can be used as input for other helpers']() {
    this.registerHelper('x-eq', ([ actual, expected]) => actual === expected);

    this.render(`{{#if (x-eq (concat model.first model.second) "onetwo")}}Truthy!{{else}}False{{/if}}`, {
      model: {
        first: 'one',
        second: 'two'
      }
    });

    this.assertText('Truthy!');

    this.runTask(() => this.rerender());

    this.assertText('Truthy!');

    this.runTask(() => set(this.context, 'model.first', 'three'));

    this.assertText('False');

    this.runTask(() => set(this.context, 'model', { first: 'one', second: 'two' }));

    this.assertText('Truthy!');
  }
});
