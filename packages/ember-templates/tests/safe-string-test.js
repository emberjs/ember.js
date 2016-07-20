import { EmberHandlebars } from 'ember-templates/compat';
import { isHTMLSafe } from 'ember-templates/string';
import isEnabled from 'ember-metal/features';

QUnit.module('compat - SafeString');

QUnit.test('using new results in a deprecation', (assert) => {
  let result;

  if (isEnabled('ember-string-ishtmlsafe')) {
    expectDeprecation(() => {
      result = new EmberHandlebars.SafeString('<b>test</b>');
    }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');
  } else {
    result = new EmberHandlebars.SafeString('<b>test</b>');
  }

  assert.equal(result.toHTML(), '<b>test</b>');

  if (isEnabled('ember-string-ishtmlsafe')) {
    // Ensure this functionality is maintained for backwards compat, but also deprecated.
    expectDeprecation(() => {
      assert.ok(result instanceof EmberHandlebars.SafeString);
    }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');
  } else {
    assert.ok(result instanceof EmberHandlebars.SafeString);
  }
});

QUnit.test('isHTMLSafe should detect SafeString', (assert) => {
  let safeString;

  if (isEnabled('ember-string-ishtmlsafe')) {
    expectDeprecation(() => {
      safeString = new EmberHandlebars.SafeString('<b>test</b>');
    }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');
  } else {
    safeString = new EmberHandlebars.SafeString('<b>test</b>');
  }

  assert.ok(isHTMLSafe(safeString));
});
