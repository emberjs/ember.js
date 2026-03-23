import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';
import { hash } from '@ember/helper';

class KeywordHash extends RenderTest {
  static suiteName = 'keyword helper: hash';

  @test
  'it works with explicit scope'() {
    const compiled = template('{{#let (hash name="Ember") as |obj|}}{{obj.name}}{{/let}}', {
      strictMode: true,
      scope: () => ({
        hash,
      }),
    });

    this.renderComponent(compiled);
    this.assertHTML('Ember');
  }

  @test
  'it works as a keyword (no import needed)'() {
    const compiled = template('{{#let (hash name="Ember") as |obj|}}{{obj.name}}{{/let}}', {
      strictMode: true,
      scope: () => ({}),
    });

    this.renderComponent(compiled);
    this.assertHTML('Ember');
  }

  @test
  'it works with the runtime compiler'() {
    const compiled = template('{{#let (hash name="Ember") as |obj|}}{{obj.name}}{{/let}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('Ember');
  }
}

jitSuite(KeywordHash);
