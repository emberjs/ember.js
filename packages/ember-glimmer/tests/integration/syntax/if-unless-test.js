import { moduleFor } from '../../utils/test-case';
import { TogglingSyntaxConditionalsTest } from '../../utils/shared-conditional-tests';

moduleFor('Syntax test: {{#if}} with inverse', class extends TogglingSyntaxConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#if ${cond}}}${truthy}{{else}}${falsy}{{/if}}`;
  }

});

moduleFor('Syntax test: {{#unless}} with inverse', class extends TogglingSyntaxConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#unless ${cond}}}${falsy}{{else}}${truthy}{{/unless}}`;
  }

});

moduleFor('Syntax test: {{#if}} and {{#unless}} without inverse', class extends TogglingSyntaxConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#if ${cond}}}${truthy}{{/if}}{{#unless ${cond}}}${falsy}{{/unless}}`;
  }

});
