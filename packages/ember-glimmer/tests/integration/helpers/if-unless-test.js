import { moduleFor } from '../../utils/test-case';
import { IfUnlessHelperTest } from '../../utils/shared-conditional-tests';

moduleFor('Helpers test: inline {{if}}', class extends IfUnlessHelperTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{if ${cond} ${truthy} ${falsy}}}`;
  }

  ['@test it raises when there are more than three arguments']() {
    expectAssertion(() => {
      this.render(`{{if condition 'a' 'b' 'c'}}`, { condition: true });
    }, /The inline form of the `if` helper expects two or three arguments/);
  }

  ['@test it raises when there are less than two arguments']() {
    expectAssertion(() => {
      this.render(`{{if condition}}`, { condition: true });
    }, /The inline form of the `if` helper expects two or three arguments/);
  }

});

moduleFor('Helpers test: nested {{if}} helpers (returning truthy values)', class extends IfUnlessHelperTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{if (if ${cond} ${cond} false) ${truthy} ${falsy}}}`;
  }

});

moduleFor('Helpers test: nested {{if}} helpers (returning falsy values)', class extends IfUnlessHelperTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{if (if ${cond} true ${cond}) ${truthy} ${falsy}}}`;
  }

});

moduleFor('Helpers test: {{if}} used with another helper', class extends IfUnlessHelperTest {

  wrapperFor(templates) {
    return `{{concat ${templates.join(' ')}}}`;
  }

  templateFor({ cond, truthy, falsy }) {
    return `(if ${cond} ${truthy} ${falsy})`;
  }

});

moduleFor('Helpers test: {{if}} used in attribute position', class extends IfUnlessHelperTest {

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

moduleFor('Helpers test: inline {{if}} and {{unless}} without the inverse argument', class extends IfUnlessHelperTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{if ${cond} ${truthy}}}{{unless ${cond} ${falsy}}}`;
  }

});

moduleFor('Helpers test: inline {{unless}}', class extends IfUnlessHelperTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{unless ${cond} ${falsy} ${truthy}}}`;
  }

  ['@test it raises when there are more than three arguments']() {
    expectAssertion(() => {
      this.render(`{{unless condition 'a' 'b' 'c'}}`, { condition: true });
    }, /The inline form of the `unless` helper expects two or three arguments/);
  }

  ['@test it raises when there are less than two arguments']() {
    expectAssertion(() => {
      this.render(`{{unless condition}}`, { condition: true });
    }, /The inline form of the `unless` helper expects two or three arguments/);
  }

});

moduleFor('Helpers test: nested {{unless}} helpers (returning truthy values)', class extends IfUnlessHelperTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{unless (unless ${cond} false ${cond}) ${falsy} ${truthy}}}`;
  }

});

moduleFor('Helpers test: nested {{unless}} helpers (returning falsy values)', class extends IfUnlessHelperTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{unless (unless ${cond} ${cond} true) ${falsy} ${truthy}}}`;
  }

});

moduleFor('Helpers test: {{unless}} used with another helper', class extends IfUnlessHelperTest {

  wrapperFor(templates) {
    return `{{concat ${templates.join(' ')}}}`;
  }

  templateFor({ cond, truthy, falsy }) {
    return `(unless ${cond} ${falsy} ${truthy})`;
  }

});

moduleFor('Helpers test: {{unless}} used in attribute position', class extends IfUnlessHelperTest {

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
