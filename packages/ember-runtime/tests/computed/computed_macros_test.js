module('CP macros');

if (Ember.FEATURES.isEnabled('ember-metal-computed-empty-array')) {
  testBoth('Ember.computed.empty', function (get, set) {
    var obj = Ember.Object.extend({
      bestLannister: null,
      lannisters: null,

      bestLannisterUnspecified: Ember.computed.empty('bestLannister'),
      noLannistersKnown: Ember.computed.empty('lannisters')
    }).create({
      lannisters: Ember.A([])
    });

    equal(get(obj, 'bestLannisterUnspecified'), true, "bestLannister initially empty");
    equal(get(obj, 'noLannistersKnown'), true, "lannisters initially empty");

    get(obj, 'lannisters').pushObject('Tyrion');
    set(obj, 'bestLannister', 'Tyrion');

    equal(get(obj, 'bestLannisterUnspecified'), false, "empty respects strings");
    equal(get(obj, 'noLannistersKnown'), false, "empty respects array mutations");
  });

  if (Ember.FEATURES.isEnabled('composable-computed-properties')) {
    testBoth('Ember.computed.empty with composable computed properties', function (get, set) {
      var obj = Ember.Object.extend({
        lannisters: null,

        noPeopleKnown: Ember.computed.empty(Ember.computed.alias('lannisters'))
      }).create({
        lannisters: Ember.A([])
      });

      equal(get(obj, 'noPeopleKnown'), true, "lannisters initially empty");

      get(obj, 'lannisters').pushObject('Tyrion');

      equal(get(obj, 'noPeopleKnown'), false, "empty respects array mutations");
    });
  }
}
