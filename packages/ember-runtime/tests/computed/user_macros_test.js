require('ember-metal/~tests/props_helper');

if (Ember.FEATURES.isEnabled('composable-computed-properties')) {
  var get = Ember.get, set = Ember.set,
      a_slice = Array.prototype.slice,
      normalizeDependentKey = Ember.computed.normalizeDependentKey,
      obj,
      join,
      among,
      l = Ember.computed.literal;

  module('Ember.computed - user macros', {
    setup: function () {
      join = Ember.computedMacro(function () {
        var values = a_slice.call(arguments, 0, -1),
            separator = a_slice.call(arguments, -1);

        return values.join(separator);
      });

      among = Ember.computedMacro(function (testValue) {
        for (var i=1; i<arguments.length; ++i) {
          if (testValue === arguments[i]) {
            return true;
          }
        }

        return false;
      });
    },
    teardown: function () {
      if (obj && obj.destroy) {
        Ember.run(function() {
          obj.destroy();
        });
      }
    }
  });

  test('user macros can easily support composition', function () {
    obj = Ember.Object.extend({
      both: join( join('person0FirstName', 'person0LastName', l(" ")),
                  join('person1FirstName', 'person1LastName', l(" ")),
                  l(" and "))
    }).create({
      person0FirstName: "Jaime",
      person0LastName: "Lannister",

      person1FirstName: "Cersei",
      person1LastName: "Lannister"
    });

    equal(get(obj, 'both'), ["Jaime Lannister and Cersei Lannister"], "composed `join` is initially correct");

    set(obj, 'person0FirstName',  ['Tyrion']);
    set(obj, 'person1FirstName',  ['Sansa']);
    set(obj, 'person1LastName',   ['Stark']);

    equal(get(obj, 'both'), ["Tyrion Lannister and Sansa Stark"], "composed `join` is correct after updating");
  });


  test('user macros can easily support composition and literal/property agnosticism', function () {
    var l = Ember.computed.literal;
    var pluck = function (depKey, property) {
      var normalizedKey = normalizeDependentKey(depKey);

      return Ember.computed(depKey, function () {
        return get(this, normalizedKey + '.' + property);
      });
    };

    var obj = Ember.Object.extend({
      included: among('selected', 'queen', pluck('tyrion', 'brother'), l('Tywin'))
    }).create({
      selected: 'Cersei',

      queen: 'Cersei',
      tyrion: { name: 'Tyrion', brother: 'Jaime' }
    });

    equal(get(obj, 'included'), true, "user macro supports simple properties");

    set(obj, 'selected', 'Jaime');

    equal(get(obj, 'included'), true, "user macro supports composition");

    set(obj, 'selected', 'Tywin');

    equal(get(obj, 'included'), true, "user macro supports literal/property agnosticism");

    set(obj, 'selected', 'Eddard');

    equal(get(obj, 'included'), false, "selected no longer among list");
  });
}
