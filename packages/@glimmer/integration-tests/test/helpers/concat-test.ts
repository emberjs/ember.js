import { jitSuite, RenderTest, test } from '../..';

class ConcatTest extends RenderTest {
  static suiteName = 'Helpers test: {{concat}}';

  @test
  'it concats static arguments'() {
    this.render(`{{concat "foo" " " "bar" " " "baz"}}`);
    this.assertHTML('foo bar baz');
  }

  @test
  'it updates for bound arguments'() {
    this.render(`{{concat this.model.first this.model.second}}`, {
      model: { first: 'one', second: 'two' },
    });

    this.assertHTML('onetwo');
    this.assertStableRerender();

    this.rerender({ model: { first: 'three', second: 'two' } });
    this.assertHTML('threetwo');

    this.rerender({ model: { first: 'three', second: 'four' } });
    this.assertHTML('threefour');

    this.rerender({ model: { first: 'one', second: 'two' } });
    this.assertHTML('onetwo');
  }

  @test
  'it can be used as a sub-expression'() {
    this.render(
      `{{concat (concat this.model.first this.model.second) (concat this.model.third this.model.fourth)}}`,
      {
        model: {
          first: 'one',
          second: 'two',
          third: 'three',
          fourth: 'four',
        },
      }
    );

    this.assertHTML('onetwothreefour');
    this.assertStableRerender();

    this.rerender({
      model: {
        first: 'five',
        second: 'two',
        third: 'three',
        fourth: 'four',
      },
    });
    this.assertHTML('fivetwothreefour');

    this.rerender({
      model: {
        first: 'five',
        second: 'six',
        third: 'seven',
        fourth: 'four',
      },
    });
    this.assertHTML('fivesixsevenfour');

    this.rerender({
      model: {
        first: 'one',
        second: 'two',
        third: 'three',
        fourth: 'four',
      },
    });
    this.assertHTML('onetwothreefour');
  }

  @test
  'it can be used as input for other helpers'() {
    this.registerHelper('x-eq', ([actual, expected]) => actual === expected);

    this.render(
      `{{#if (x-eq (concat this.model.first this.model.second) "onetwo")}}Truthy!{{else}}False{{/if}}`,
      {
        model: {
          first: 'one',
          second: 'two',
        },
      }
    );

    this.assertHTML('Truthy!');
    this.assertStableRerender();

    this.rerender({ model: { first: 'three', second: 'two' } });
    this.assertHTML('False');

    this.rerender({ model: { first: 'one', second: 'two' } });
    this.assertHTML('Truthy!');
  }
}

jitSuite(ConcatTest);
