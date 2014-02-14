if (Ember.FEATURES.isEnabled("string-parameterize")) {
  module('Ember.String.parameterize');

  var runParameterizeTest = function(input, expected) {
    deepEqual(Ember.String.parameterize(input), expected);
    if (Ember.EXTEND_PROTOTYPES) {
      deepEqual(input.parameterize(), expected);
    }
  };

  if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
    test('String.prototype.parameterize is not modified without EXTEND_PROTOTYPES', function() {
      ok('undefined' === typeof String.prototype.parameterize, 'String.prototype helper disabled');
    });
  }

  test('parameterize normal string', function() {
    runParameterizeTest(
      'My favorite items.',
      'my-favorite-items'
    );
  });

  test('parameterize underscored string', function() {
    runParameterizeTest(
      'action_name',
      'action-name'
    );
  });

  test('does nothing with parameterize string', function() {
    runParameterizeTest(
      'my-favorite-items',
      'my-favorite-items'
    );
  });

  test('parameterize real world strings with special characters', function() {
    runParameterizeTest(
      '100 ways Ember.js is better than Angular.',
      '100-ways-emberjs-is-better-than-angular'
    );
    runParameterizeTest(
      'You\'re (really) going to LOVE handling my "special" characters!?!',
      'youre-really-going-to-love-handling-my-special-characters'
    );
    runParameterizeTest(
      '#emberjs Core Team Meeting Minutes - 2013/12/06',
      'emberjs-core-team-meeting-minutes-2013-12-06'
    );
  });

  test('parameterize string with leading and trailing special characters', function() {
    runParameterizeTest(
      '   -- leading & --trailing  --_*-!-',
      'leading-trailing'
    );
  });
}