import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { watch } from "ember-metal/watching";

QUnit.module('mandatory-setters');

if (Ember.FEATURES.isEnabled('mandatory-setter')) {
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

  test('should assert if get a watched property (not on the prototype) that is not set by Ember.set', function() {
    var obj = {
      toString: function() {
        return 'custom-object';
      }
    };

    watch(obj, 'someProp');

    obj.someProp = 'foo-bar';

    expectAssertion(function() {
      get(obj, 'someProp');
    }, 'You must use Ember.set to set `someProp` (on `custom-object`).');
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

  test('prints a helpful assertion if a watched property (not present at watch time) was not set with Ember.set', function() {
    var obj = {
      toString: function() {
        return 'custom-object';
      }
    };

    watch(obj, 'someProp');
    obj.someProp = 'blastix';

    equal(get(obj, 'someProp'), 'blastix');
  });

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
