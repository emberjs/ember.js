import { moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';
import {
  BASIC_TRUTHY_TESTS,
  BASIC_FALSY_TESTS,
  SharedConditionalsTest
} from './shared-conditional-tests';

moduleFor('Syntax test: {{#if}}', class extends SharedConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#if ${cond}}}${truthy}{{else}}${falsy}{{/if}}`;
  }

  ['@test it renders and hides the given block based on the conditional']() {
    this.render(`{{#if cond1}}T1{{/if}}{{#if cond2}}T2{{/if}}`, { cond1: true, cond2: false });

    this.assertText('T1');

    this.runTask(() => this.rerender());

    this.assertText('T1');

    this.runTask(() => set(this.context, 'cond1', false));

    this.assertText('');

    this.runTask(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', true);
    });

    this.assertText('T1T2');

    this.runTask(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', false);
    });

    this.assertText('T1');
  }

}, BASIC_TRUTHY_TESTS, BASIC_FALSY_TESTS);

moduleFor('Syntax test: {{#unless}}', class extends SharedConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#unless ${cond}}}${falsy}{{else}}${truthy}{{/unless}}`;
  }

  ['@test it renders and hides the given block based on the conditional']() {
    this.render(`{{#unless cond1}}F1{{/unless}}{{#unless cond2}}F2{{/unless}}`, {
      cond1: true,
      cond2: false
    });

    this.assertText('F2');

    this.runTask(() => this.rerender());

    this.assertText('F2');

    this.runTask(() => set(this.context, 'cond2', true));

    this.assertText('');

    this.runTask(() => {
      set(this.context, 'cond1', false);
      set(this.context, 'cond2', false);
    });

    this.assertText('F1F2');

    this.runTask(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', false);
    });

    this.assertText('F2');
  }

}, BASIC_TRUTHY_TESTS, BASIC_FALSY_TESTS);
