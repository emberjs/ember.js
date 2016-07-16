import EmberHandlebars from 'ember-htmlbars/compat';
import { isHTMLSafe } from 'ember-htmlbars/utils/string';
import { TestCase } from '../utils/abstract-test-case';
import { moduleFor } from '../utils/test-case';
import isEnabled from 'ember-metal/features';


moduleFor('compat - SafeString', class extends TestCase {
  ['@test using new results in a deprecation']() {
    let result;

    if (isEnabled('ember-string-ishtmlsafe')) {
      expectDeprecation(() => {
        result = new EmberHandlebars.SafeString('<b>test</b>');
      }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');
    } else {
      result = new EmberHandlebars.SafeString('<b>test</b>');
    }

    this.assert.equal(result.toHTML(), '<b>test</b>');

    if (isEnabled('ember-string-ishtmlsafe')) {
      // Ensure this functionality is maintained for backwards compat, but also deprecated.
      expectDeprecation(() => {
        this.assert.ok(result instanceof EmberHandlebars.SafeString);
      }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');
    } else {
      this.assert.ok(result instanceof EmberHandlebars.SafeString);
    }
  }

  ['@test isHTMLSafe should detect SafeString']() {
    let safeString;

    if (isEnabled('ember-string-ishtmlsafe')) {
      expectDeprecation(() => {
        safeString = new EmberHandlebars.SafeString('<b>test</b>');
      }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');
    } else {
      safeString = new EmberHandlebars.SafeString('<b>test</b>');
    }

    this.assert.ok(isHTMLSafe(safeString));
  }
});
