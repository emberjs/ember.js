import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { watch } from "ember-metal/watching";
import {
  hasPropertyAccessors,
  defineProperty
} from "ember-metal/platform/define_property";
import create from 'ember-metal/platform/create';
import { meta as metaFor } from "ember-metal/utils";

QUnit.module('mandatory-setters');

function hasMandatorySetter(object, property) {
  var meta = metaFor(object);

  return property in meta.values;
}

if (Ember.FEATURES.isEnabled('mandatory-setter')) {
  if (hasPropertyAccessors) {
    QUnit.test('does not assert if property is not being watched', function() {
      var obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      obj.someProp = 'blastix';
      equal(get(obj, 'someProp'), 'blastix');
    });

    QUnit.test('should not setup mandatory-setter if property is not writable', function() {
      expect(6);

      var obj = { };

      defineProperty(obj, 'a', { value: true });
      defineProperty(obj, 'b', { value: false });
      defineProperty(obj, 'c', { value: undefined });
      defineProperty(obj, 'd', { value: undefined, writable: false });
      defineProperty(obj, 'e', { value: undefined, configurable: false });
      defineProperty(obj, 'f', { value: undefined, configurable: true });

      watch(obj, 'a');
      watch(obj, 'b');
      watch(obj, 'c');
      watch(obj, 'd');
      watch(obj, 'e');
      watch(obj, 'f');

      ok(!hasMandatorySetter(obj, 'a'), 'mandatory-setter should not be installed');
      ok(!hasMandatorySetter(obj, 'b'), 'mandatory-setter should not be installed');
      ok(!hasMandatorySetter(obj, 'c'), 'mandatory-setter should not be installed');
      ok(!hasMandatorySetter(obj, 'd'), 'mandatory-setter should not be installed');
      ok(!hasMandatorySetter(obj, 'e'), 'mandatory-setter should not be installed');
      ok(!hasMandatorySetter(obj, 'f'), 'mandatory-setter should not be installed');
    });

    QUnit.test('should not setup mandatory-setter if setter is already setup on property', function() {
      expect(2);

      var obj = { someProp: null };

      defineProperty(obj, 'someProp', {
        set(value) {
          equal(value, 'foo-bar', 'custom setter was called');
        }
      });

      watch(obj, 'someProp');
      ok(!hasMandatorySetter(obj, 'someProp'), 'mandatory-setter should not be installed');

      obj.someProp = 'foo-bar';
    });

    QUnit.test('should assert if set without Ember.set when property is being watched', function() {
      var obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      watch(obj, 'someProp');

      expectAssertion(function() {
        obj.someProp = 'foo-bar';
      }, 'You must use Ember.set() to set the `someProp` property (of custom-object) to `foo-bar`.');
    });

    QUnit.test('should not assert if set with Ember.set when property is being watched', function() {
      var obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      watch(obj, 'someProp');
      set(obj, 'someProp', 'foo-bar');

      equal(get(obj, 'someProp'), 'foo-bar');
    });

    QUnit.test('does not setup mandatory-setter if non-configurable', function() {
      var obj = {
        someProp: null,
        toString() {
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

    QUnit.test('sets up mandatory-setter if property comes from prototype', function() {
      expect(2);

      var obj = {
        someProp: null,
        toString() {
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
  QUnit.test('does not assert', function() {
    var obj = {
      someProp: null,
      toString() {
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
