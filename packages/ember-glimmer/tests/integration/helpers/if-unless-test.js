import { moduleFor } from '../../utils/test-case';
import { TogglingHelperConditionalsTest } from '../../utils/shared-conditional-tests';

moduleFor('Helpers test: inline {{if}}', class extends TogglingHelperConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{if ${cond} ${truthy} ${falsy}}}`;
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

});

moduleFor('@glimmer Helpers test: nested {{if}} helpers (returning truthy values)', class extends TogglingHelperConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{if (if ${cond} ${cond} false) ${truthy} ${falsy}}}`;
  }

});

moduleFor('@glimmer Helpers test: nested {{if}} helpers (returning falsy values)', class extends TogglingHelperConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{if (if ${cond} true ${cond}) ${truthy} ${falsy}}}`;
  }

});

moduleFor('@glimmer Helpers test: {{if}} used with another helper', class extends TogglingHelperConditionalsTest {

  wrapperFor(templates) {
    return `{{concat ${templates.join(' ')}}}`;
  }

  templateFor({ cond, truthy, falsy }) {
    return `(if ${cond} ${truthy} ${falsy})`;
  }

});

moduleFor('@glimmer Helpers test: {{if}} used in attribute position', class extends TogglingHelperConditionalsTest {

  wrapperFor(templates) {
    return `<div data-foo="${templates.join('')}" />`;
  }

  templateFor({ cond, truthy, falsy }) {
    return `{{if ${cond} ${truthy} ${falsy}}}`;
  }

  textValue() {
    return this.$('div').attr('data-foo');
  }

});

moduleFor('Helpers test: inline {{if}} and {{unless}} without the inverse argument', class extends TogglingHelperConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{if ${cond} ${truthy}}}{{unless ${cond} ${falsy}}}`;
  }

});

moduleFor('Helpers test: inline {{unless}}', class extends TogglingHelperConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{unless ${cond} ${falsy} ${truthy}}}`;
  }

  ['@test it raises when there are more than three arguments']() {
    expectAssertion(() => {
      this.render(`{{unless condition 'a' 'b' 'c'}}`, { condition: true });
    }, /The inline form of the `if` and `unless` helpers expect two or three arguments/);
  }

  ['@test it raises when there are less than two arguments']() {
    expectAssertion(() => {
      this.render(`{{unless condition}}`, { condition: true });
    }, /The inline form of the `if` and `unless` helpers expect two or three arguments/);
  }

});

moduleFor('@glimmer Helpers test: nested {{unless}} helpers (returning truthy values)', class extends TogglingHelperConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{unless (unless ${cond} false ${cond}) ${falsy} ${truthy}}}`;
  }

});

moduleFor('@glimmer Helpers test: nested {{unless}} helpers (returning falsy values)', class extends TogglingHelperConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{unless (unless ${cond} ${cond} true) ${falsy} ${truthy}}}`;
  }

});

moduleFor('@glimmer Helpers test: {{unless}} used with another helper', class extends TogglingHelperConditionalsTest {

  wrapperFor(templates) {
    return `{{concat ${templates.join(' ')}}}`;
  }

  templateFor({ cond, truthy, falsy }) {
    return `(unless ${cond} ${falsy} ${truthy})`;
  }

});

moduleFor('@glimmer Helpers test: {{unless}} used in attribute position', class extends TogglingHelperConditionalsTest {

  wrapperFor(templates) {
    return `<div data-foo="${templates.join('')}" />`;
  }

  templateFor({ cond, truthy, falsy }) {
    return `{{unless ${cond} ${falsy} ${truthy}}}`;
  }

  textValue() {
    return this.$('div').attr('data-foo');
  }

});
