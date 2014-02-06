
if (Ember.FEATURES.isEnabled('core-merge-mergeIf-fastMerge')) {
  module('Ember.merge/Ember.mergeIf');
  var expected, a, b, c, d, e,
    reset = function () {
      a = {name: 'Gasmi'};
      b = {firstName: 'Aboubakr'};
      c = {name: ''};
      d = {
        firstLevel: {
          prop1: false,
          languages: [1, 2],
          secondLevel: {
              prop2: 'a string'
          }
        }
      };
      e = {
        firstLevel: {
          prop1: true,
          languages: [3, 4],
          secondLevel: {
              prop1: true,
              prop2: ''
          }
        }
      };
    };
  test('Ember.merge', function() {
    reset();
    expected = {name: 'Gasmi', firstName: 'Aboubakr'};
    deepEqual(expected, Ember.merge(a, b), 'merges two objects');

    reset();
    expected = {
        name: '',
        firstName: 'Aboubakr',
        firstLevel: {
          prop1: false,
          languages: [1, 2],
          secondLevel: {
              prop2: 'a string'
          }
        }
    };
    deepEqual(expected, Ember.merge(a, b, c, d), 'merges a list of objects submited as arguments');
    deepEqual(expected, Ember.merge(a, [b, c, d]), 'merges a list of objects submited in array');
    deepEqual(expected, Ember.merge(a, [b, c], d), 'merges a list of objects submited as a mix of arguments and array');

    reset();
    deepEqual(e, Ember.merge(d, e), 'by default overrides nested objects if the first parameter is not boolean');

    reset();
    deepEqual(e, Ember.merge(false, d, e), 'overrides nested objects if the first parameter is false');

    reset();
    expected = {
      firstLevel: {
        prop1: true,
        languages: [3, 4],
        secondLevel: {
            prop1: true,
            prop2: ''
        }
      }
    };
    deepEqual(expected, Ember.merge(true, d, e), 'merges nested objects if the first parameter is true');

  });

  //almost the same behavior, except that in some cases keys tested as falsy with Ember.isEmpty() will not be applied
  test('Conditional keys merge with Ember.mergeIf', function() {
    reset();
    expected = {name: 'Gasmi', firstName: 'Aboubakr'};
    deepEqual(expected, Ember.merge(a, b), 'merges two objects');

    reset();
    expected = {
      name: 'Gasmi',
      firstName: 'Aboubakr',
      firstLevel: {
        prop1: false,
        languages: [1, 2],
        secondLevel: {
            prop2: 'a string'
        }
      }
    };
    deepEqual(expected, Ember.mergeIf(a, b, c, d), 'merges a list of objects submited as arguments');
    deepEqual(expected, Ember.mergeIf(a, [b, c, d]), 'merges a list of objects submited in array');
    deepEqual(expected, Ember.mergeIf(a, [b, c], d), 'merges a list of objects submited as a mix of arguments and array');
    reset();
    deepEqual(e, Ember.mergeIf(d, e), 'by default overrides nested objects if the first parameter is not boolean');

    reset();
    deepEqual(e, Ember.mergeIf(false, d, e), 'overrides nested objects if the first parameter is false');

    reset();
    expected = {
      firstLevel: {
        prop1: true,
        languages: [3, 4],
        secondLevel: {
            prop1: true,
            prop2: 'a string'
        }
      }
    };
    deepEqual(expected, Ember.mergeIf(true, d, e), 'merges nested objects if the first parameter is true');

  });
}
