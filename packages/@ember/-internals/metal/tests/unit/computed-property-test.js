import { module, test } from 'qunit';
import EmberObject from '@ember/object';
import ComputedProperty from '@ember/-internals/metal/lib/computed.ts';
import { metaFor, tagMetaFor, tagFor, validateTag } from '@ember/-internals/metal/lib/tags';

module('Unit | ComputedProperty', function() {
  test('get method - CT1', function(assert) {
    let obj = EmberObject.create();
    let keyName = 'testKey';
    let computedProperty = new ComputedProperty(function() {
      return 'testValue';
    });

    // Simulate conditions for CT1
    let meta = metaFor(obj);
    meta.setRevisionFor(keyName, undefined);
    computedProperty._dependentKeys = undefined;

    let propertyTag = tagFor(obj, keyName, tagMetaFor(obj));
    validateTag(propertyTag, 0); // Simulate validateTag returning false

    let result = computedProperty.get(obj, keyName);
    assert.equal(result, undefined, 'Expected value should be undefined');
  });

  test('get method - CT2', function(assert) {
    let obj = EmberObject.create();
    let keyName = 'testKey';
    let computedProperty = new ComputedProperty(function() {
      return 'testValue';
    });

    // Simulate conditions for CT2
    let meta = metaFor(obj);
    meta.setRevisionFor(keyName, 1);
    computedProperty._dependentKeys = undefined;

    let propertyTag = tagFor(obj, keyName, tagMetaFor(obj));
    validateTag(propertyTag, 0); // Simulate validateTag returning false

    let result = computedProperty.get(obj, keyName);
    assert.equal(result, 'testValue', 'Expected value should be returned');
  });

  test('get method - CT3', function(assert) {
    let obj = EmberObject.create();
    let keyName = 'testKey';
    let computedProperty = new ComputedProperty(function() {
      return 'testValue';
    });

    // Simulate conditions for CT3
    let meta = metaFor(obj);
    meta.setRevisionFor(keyName, undefined);
    computedProperty._dependentKeys = undefined;

    let propertyTag = tagFor(obj, keyName, tagMetaFor(obj));
    validateTag(propertyTag, 1); // Simulate validateTag returning true

    let result = computedProperty.get(obj, keyName);
    assert.equal(result, 'testValue', 'Expected value should be returned');
  });

  test('get method - CT4', function(assert) {
    let obj = EmberObject.create();
    let keyName = 'testKey';
    let computedProperty = new ComputedProperty(function() {
      return 'testValue';
    });

    // Simulate conditions for CT4
    let meta = metaFor(obj);
    meta.setRevisionFor(keyName, undefined);
    computedProperty._dependentKeys = ['depKey'];

    let propertyTag = tagFor(obj, keyName, tagMetaFor(obj));
    validateTag(propertyTag, 0); // Simulate validateTag returning false

    let result = computedProperty.get(obj, keyName);
    assert.equal(result, 'testValue', 'Expected value should be returned');
  });

  test('get method - CT5', function(assert) {
    let obj = EmberObject.create();
    let keyName = 'testKey';
    let computedProperty = new ComputedProperty(function() {
      return ['testValue'];
    });

    // Simulate conditions for CT5
    let meta = metaFor(obj);
    meta.setRevisionFor(keyName, undefined);
    computedProperty._dependentKeys = undefined;

    let propertyTag = tagFor(obj, keyName, tagMetaFor(obj));
    validateTag(propertyTag, 0); // Simulate validateTag returning false

    let result = computedProperty.get(obj, keyName);
    assert.deepEqual(result, ['testValue'], 'Expected value should be returned');
  });
});