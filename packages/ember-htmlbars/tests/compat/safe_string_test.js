import EmberHandlebars from 'ember-htmlbars/compat';

QUnit.module('ember-htmlbars: compat - SafeString');

QUnit.test('using new results in a deprecation', function(assert) {
  let result;

  expectDeprecation(function() {
    result = new EmberHandlebars.SafeString('<b>test</b>');
  }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');

  assert.equal(result.toHTML(), '<b>test</b>');
});
