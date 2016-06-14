import EmberHandlebars from 'ember-htmlbars/compat';
import { isHtmlSafe } from 'ember-htmlbars/utils/string';
import { TestCase } from '../utils/abstract-test-case';
import { moduleFor } from '../utils/test-case';


moduleFor('compat - SafeString', class extends TestCase {
  ['@test using new results in a deprecation']() {
    let result;

    expectDeprecation(() => {
      result = new EmberHandlebars.SafeString('<b>test</b>');
    }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');

    this.assert.equal(result.toHTML(), '<b>test</b>');

    // Ensure this functionality is maintained for backwards compat, but also deprecated.
    expectDeprecation(() => {
      this.assert.ok(result instanceof EmberHandlebars.SafeString);
    }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');
  }

  ['@test isHtmlSafe should detect SafeString']() {
    let safeString;

    expectDeprecation(() => {
      safeString = new EmberHandlebars.SafeString('<b>test</b>');
    }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');

    this.assert.ok(isHtmlSafe(safeString));
  }
});
