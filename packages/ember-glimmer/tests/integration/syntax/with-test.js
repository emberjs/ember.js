import { moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';
import {
  BASIC_TRUTHY_TESTS,
  BASIC_FALSY_TESTS,
  SharedConditionalsTest
} from './shared-conditional-tests';

moduleFor('Syntax test: {{#with}}', class extends SharedConditionalsTest {
  templateFor({ cond, truthy, falsy }) {
    return `{{#with ${cond} as |test|}}${truthy}{{else}}${falsy}{{/with}}`;
  }

  ['@test it aliases the condition into the block param']() {
    this.render(`{{#with cond1 as |cond|}}{{cond.greeting}}{{else}}False{{/with}}`, {
      cond1: { greeting: 'Hello' }
    });

    this.assertText('Hello');

    this.runTask(() => this.rerender());

    this.assertText('Hello');

    this.runTask(() => set(this.context, 'cond1', false));

    this.assertText('False');

    this.runTask(() => this.rerender());

    this.assertText('False');
  }
}, BASIC_TRUTHY_TESTS, BASIC_FALSY_TESTS);
