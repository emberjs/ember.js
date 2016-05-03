import EmberHandlebars from 'ember-htmlbars/compat';

QUnit.module('ember-htmlbars: compat - SafeString');

QUnit.test('using new results in a deprecation', function(assert) {
  expectDeprecation(function() {
    new EmberHandlebars.SafeString('test');
  }, 'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe');
});
