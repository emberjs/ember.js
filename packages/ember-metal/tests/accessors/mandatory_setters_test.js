import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { watch } from "ember-metal/watching";
import {
  hasPropertyAccessors,
  defineProperty,
  create
} from "ember-metal/platform";
import { meta as metaFor } from "ember-metal/utils";

QUnit.module('mandatory-setters');

if (Ember.FEATURES.isEnabled('mandatory-setter')) {
  if (hasPropertyAccessors) {
    test('does not assert if property is not being watched', function() {
      var obj = {
        someProp: null,
        toString: function() {
          return 'custom-object';
        }
      };

      obj.someProp = 'blastix';
      equal(get(obj, 'someProp'), 'blastix');
    });

    test('should assert if set without Ember.set when property is being watched', function() {
      var obj = {
        someProp: null,
        toString: function() {
          return 'custom-object';
        }
      };

      watch(obj, 'someProp');

      expectAssertion(function() {
        obj.someProp = 'foo-bar';
      }, 'You must use Ember.set() to set the `someProp` property (of custom-object) to `foo-bar`.');
    });

    test('should not assert if set with Ember.set when property is being watched', function() {
      var obj = {
        someProp: null,
        toString: function() {
          return 'custom-object';
        }
      };

      watch(obj, 'someProp');
      set(obj, 'someProp', 'foo-bar');

      equal(get(obj, 'someProp'), 'foo-bar');
    });

    test('does not setup mandatory-setter if non-configurable', function() {
      var obj = {
        someProp: null,
        toString: function() {
          return 'custom-object';
        }
      };
      var meta = metaFor(obj);

      defineProperty(obj, 'someProp', {
        configurable: false,
        enumerable: true,
        value: 'blastix'
      });

      watch(obj, 'someProp');

      ok(!('someProp' in meta.values), 'blastix');
    });

    test('sets up mandatory-setter if property comes from prototype', function() {
      expect(2);

      var obj = {
        someProp: null,
        toString: function() {
          return 'custom-object';
        }
      };
      var obj2 = create(obj);

      watch(obj2, 'someProp');
      var meta = metaFor(obj2);

      ok(('someProp' in meta.values), 'mandatory setter has been setup');

      expectAssertion(function() {
        obj2.someProp = 'foo-bar';
      }, 'You must use Ember.set() to set the `someProp` property (of custom-object) to `foo-bar`.');
    });
  }
} else {
  test('does not assert', function() {
    var obj = {
      someProp: null,
      toString: function() {
        return 'custom-object';
      }
    };

    obj.someProp = 'blastix';
    equal(get(obj, 'someProp'), 'blastix');

    watch(obj, 'someProp');

    obj.someProp = 'foo-bar';
    equal(get(obj, 'someProp'), 'foo-bar');

    obj.someProp = 'bernie';
    equal(get(obj, 'someProp'), 'bernie');
  });
}
