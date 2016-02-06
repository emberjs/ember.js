import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';

moduleFor('Helpers test: {{concat}}', class extends RenderingTest {

  ['@test it concats static arguments']() {
    this.render(`{{concat "foo" " " "bar" " " "baz"}}`);
    this.assertText('foo bar baz');
  }

  ['@test it updates for bound arguments']() {
    this.render(`{{concat first second}}`, {
      first: 'one',
      second: 'two'
    });

    this.assertText('onetwo');

    this.runTask(() => this.rerender());

    this.assertText('onetwo');

    this.runTask(() => set(this.context, 'first', 'three'));

    this.assertText('threetwo');

    this.runTask(() => set(this.context, 'second', 'four'));

    this.assertText('threefour');
  }

  ['@test it can be used as a sub-expression']() {
    this.render(`{{concat (concat first second) (concat third fourth)}}`, {
      first: 'one',
      second: 'two',
      third: 'three',
      fourth: 'four'
    });

    this.assertText('onetwothreefour');

    this.runTask(() => this.rerender());

    this.assertText('onetwothreefour');

    this.runTask(() => {
      set(this.context, 'first', 'five');
      set(this.context, 'third', 'six');
    });

    this.assertText('fivetwosixfour');
  }

  ['@test it can be used as input for other helpers']() {
    this.registerHelper('x-eq', ([ actual, expected]) => actual === expected);

    this.render(`{{#if (x-eq (concat first second) "onetwo")}}Truthy!{{else}}False{{/if}}`, {
      first: 'one',
      second: 'two'
    });

    this.assertText('Truthy!');

    this.runTask(() => this.rerender());

    this.assertText('Truthy!');

    this.runTask(() => set(this.context, 'first', 'three'));

    this.assertText('False');
  }

});
