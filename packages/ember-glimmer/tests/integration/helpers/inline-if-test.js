import { moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';

import {
  BASIC_TRUTHY_TESTS,
  BASIC_FALSY_TESTS,
  SharedHelperConditionalsTest
} from '../../utils/shared-conditional-tests';

moduleFor('Helpers test: inline {{if}}', class extends SharedHelperConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{if ${cond} ${truthy} ${falsy}}}`;
  }

  ['@test it can omit the falsy argument']() {
    this.render(`{{if cond1 'T1'}}{{if cond2 'T2'}}`, { cond1: true, cond2: false });

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

  ['@test it raises when there are more than three arguments']() {
    expectAssertion(() => {
      this.render(`{{if condition 'a' 'b' 'c'}}`, { condition: true });
    }, /The inline form of the `if` and `unless` helpers expect two or three arguments/);
  }

  ['@test it raises when there are less than two arguments']() {
    expectAssertion(() => {
      this.render(`{{if condition}}`, { condition: true });
    }, /The inline form of the `if` and `unless` helpers expect two or three arguments/);
  }

}, BASIC_TRUTHY_TESTS, BASIC_FALSY_TESTS);

moduleFor('@glimmer Helpers test: {{if}} used with another helper', class extends SharedHelperConditionalsTest {

  wrapperFor(templates) {
    return `{{concat ${templates.join(' ')}}}`;
  }

  templateFor({ cond, truthy, falsy }) {
    return `(if ${cond} ${truthy} ${falsy})`;
  }

});

moduleFor('@glimmer Helpers test: {{if}} used in attribute position', class extends SharedHelperConditionalsTest {

  wrapperFor(templates) {
    return `<div data-foo="${templates.join('')}" />`;
  }

  templateFor({ cond, truthy, falsy }) {
    return `{{if ${cond} ${truthy} ${falsy}}}`;
  }

  textValue() {
    return this.$('div', this.element).attr('data-foo');
  }

});
