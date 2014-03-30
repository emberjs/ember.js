/*global Global: true*/

require('ember-metal/~tests/props_helper');

if (Ember.FEATURES.isEnabled('composable-computed-properties')) {
  var metaFor = Ember.meta,
      addObserver = Ember.addObserver,
      obj;
    
  module('Ember.computed - composable', {
    teardown: function () {
      if (obj && obj.destroy) {
        Ember.run(function() {
          obj.destroy();
        });
      }
    }
  });

  testBoth('should be able to take a computed property as a parameter for ember objects', function(get, set) {
    var not = Ember.computed.not,
        equals = Ember.computed.equal;

    obj = Ember.Object.extend({
      firstName: null,
      lastName: null,
      state: null,
      napTime: not(equals('state', 'sleepy'))
    }).create({
      firstName: 'Alex',
      lastName: 'Navasardyan',
      state: 'sleepy'
    });

    equal(get(obj, 'firstName'), 'Alex');
    equal(get(obj, 'lastName'), 'Navasardyan');

    equal(get(obj, 'state'), 'sleepy');
    equal(get(obj, 'napTime'), false);

    set(obj, 'state', 'not sleepy');
    equal(get(obj, 'state'), 'not sleepy');
    equal(get(obj, 'napTime'), true);
  });

  testBoth('should work with plain JavaScript objects', function(get, set) {
    var not = Ember.computed.not,
        equals = Ember.computed.equal;

    obj = {
      firstName: 'Alex',
      lastName: 'Navasardyan',
      state: 'sleepy'
    };

    Ember.defineProperty(obj, 'napTime', not(equals('state', 'sleepy')));

    equal(get(obj, 'firstName'), 'Alex');
    equal(get(obj, 'lastName'), 'Navasardyan');

    equal(get(obj, 'state'), 'sleepy');
    equal(get(obj, 'napTime'), false);

    set(obj, 'state', 'not sleepy');
    equal(get(obj, 'state'), 'not sleepy');
    equal(get(obj, 'napTime'), true);
  });

  testBoth('should be able to take many computed properties as parameters', function(get, set) {
    var and     = Ember.computed.and,
        equals  = Ember.computed.equal,
        not     = Ember.computed.not,
        obj = Ember.Object.extend({
          firstName: null,
          lastName: null,
          state: null,
          hungry: null,
          thirsty: null,
          napTime: and(equals('state', 'sleepy'), not('hungry'), not('thirsty'))
        }).create({
          firstName: 'Alex',
          lastName:  'Navasardyan',
          state:     'sleepy',
          hungry:    true,
          thirsty:   false
        });

    equal(get(obj, 'firstName'), 'Alex');
    equal(get(obj, 'lastName'), 'Navasardyan');

    equal(get(obj, 'state'), 'sleepy');
    equal(get(obj, 'napTime'), false);

    set(obj, 'state', 'not sleepy');
    equal(get(obj, 'state'), 'not sleepy');
    equal(get(obj, 'napTime'), false);

    set(obj, 'state', 'sleepy');
    set(obj, 'thristy', false);
    set(obj, 'hungry', false);
    equal(get(obj, 'napTime'), true);
  });

  testBoth('composable computed properties can be shared between types', function (get, set) {
    var not = Ember.computed.not,
        equals = Ember.computed.equal,
        notSleepy = not(equals('state', 'sleepy')),
        Type0 = Ember.Object.extend({
          state: null,
          napTime: notSleepy
        }),
        Type1 = Ember.Object.extend({
          state: null,
          napTime: notSleepy
        }),
        obj0 = Type0.create({ state: 'sleepy'}),
        obj1 = Type1.create({ state: 'sleepy' });

    equal(get(obj0, 'state'), 'sleepy');
    equal(get(obj0, 'napTime'), false);

    set(obj0, 'state', 'not sleepy');
    equal(get(obj0, 'state'), 'not sleepy');
    equal(get(obj0, 'napTime'), true);

    equal(get(obj1, 'state'), 'sleepy');
    equal(get(obj1, 'napTime'), false);

    set(obj1, 'state', 'not sleepy');
    equal(get(obj1, 'state'), 'not sleepy');
    equal(get(obj1, 'napTime'), true);
  });

  testBoth('composable computed properties work with existing CP macros', function(get, set) {
    var not = Ember.computed.not,
        equals = Ember.computed.equal,
        observerCalls = 0;

    obj = Ember.Object.extend({
      firstName: null,
      lastName: null,
      state: null,
      napTime: not(equals('state', 'sleepy'))
    }).create({
      firstName: 'Alex',
      lastName: 'Navasardyan',
      state: 'sleepy'
    });

    addObserver(obj, 'napTime', function () {
      ++observerCalls;
    });

    equal(get(obj, 'napTime'), false);
    equal(observerCalls, 0);

    set(obj, 'state', 'not sleepy');
    equal(observerCalls, 1);
    equal(get(obj, 'napTime'), true);
  });

  testBoth('composable computed properties work with arrayComputed properties', function (get, set) {
    var mapBy = Ember.computed.mapBy,
        union = Ember.computed.union,
        sort  = Ember.computed.sort;

    obj = Ember.Object.extend({
      names: sort(
              union(mapBy('people', 'firstName'), mapBy('people', 'lastName'), 'cats'),
              Ember.compare
             )
    }).create({
      people: Ember.A([{
        firstName: 'Alex', lastName: 'Navasardyan'
      }, {
        firstName: 'David', lastName: 'Hamilton'
      }]),
      cats: Ember.A(['Grey Kitty', 'Little Boots'])
    });

    deepEqual(get(obj, 'names'), ['Alex', 'David', 'Grey Kitty', 'Hamilton', 'Little Boots', 'Navasardyan']);
  });

  testBoth('composable computed properties work with CPs that have no dependencies', function (get, set) {
    var not = Ember.computed.not,
        constant = function (c) {
          return Ember.computed(function () {
            return c;
          });
        };

    obj = Ember.Object.extend({
      p: not(constant(true))
    }).create();

    equal(get(obj, 'p'), false, "ccp works with dependencies that themselves have no dependencies");
  });

  testBoth('composable computed properties work with depKey paths', function (get, set) {
    var not = Ember.computed.not,
        alias = Ember.computed.alias;

    obj = Ember.Object.extend({
      q: not(alias('indirection.p'))
    }).create({
      indirection: { p: true }
    });

    equal(get(obj, 'q'), false, "ccp is initially correct");

    set(obj, 'indirection.p', false);

    equal(get(obj, 'q'), true, "ccp is true after dependent chain updated");
  });

  testBoth('composable computed properties work with macros that have non-cp args', function (get, set) {
    var equals = Ember.computed.equal,
        not = Ember.computed.not,
        or = Ember.computed.or;

    obj = Ember.Object.extend({
      isJaime: equals('name', 'Jaime'),
      isCersei: equals('name', 'Cersei'),

      isEither: or( equals('name', 'Jaime'),
                    equals('name', 'Cersei'))
    }).create({
      name: 'Robb'
    });

    equal(false, get(obj, 'isEither'), "Robb is neither Jaime nor Cersei");

    set(obj, 'name', 'Jaime');

    equal(true, get(obj, 'isEither'), "Jaime is either Jaime nor Cersei");

    set(obj, 'name', 'Cersei');

    equal(true, get(obj, 'isEither'), "Cersei is either Jaime nor Cersei");

    set(obj, 'name', 'Tyrion');

    equal(false, get(obj, 'isEither'), "Tyrion is neither Jaime nor Cersei");
  });
}
