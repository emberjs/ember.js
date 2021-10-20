import { typeOf } from '../../lib/type-of';
import EmberObject from '../../lib/system/object';
import { window } from '@ember/-internals/browser-environment';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember Type Checking',
  class extends AbstractTestCase {
    ['@test Ember.typeOf'](assert) {
      let MockedDate = function () {};
      MockedDate.prototype = new Date();

      let mockedDate = new MockedDate();
      let date = new Date();
      let error = new Error('boum');
      let object = { a: 'b' };
      let a = null;
      let arr = [1, 2, 3];
      let obj = {};
      let instance = EmberObject.create({
        method() {},
        async asyncMethod() {},
      });

      assert.strictEqual(typeOf(), 'undefined', 'undefined');
      assert.strictEqual(typeOf(null), 'null', 'null');
      assert.strictEqual(typeOf('Cyril'), 'string', 'Cyril');
      assert.strictEqual(typeOf(101), 'number', '101');
      assert.strictEqual(typeOf(true), 'boolean', 'true');
      assert.strictEqual(typeOf([1, 2, 90]), 'array', '[1,2,90]');
      assert.strictEqual(typeOf(/abc/), 'regexp', '/abc/');
      assert.strictEqual(typeOf(date), 'date', 'new Date()');
      assert.strictEqual(typeOf(mockedDate), 'date', 'mocked date');
      assert.strictEqual(typeOf(error), 'error', 'error');
      assert.strictEqual(typeOf(object), 'object', 'object');
      assert.strictEqual(typeOf(undefined), 'undefined', 'item of type undefined');
      assert.strictEqual(typeOf(a), 'null', 'item of type null');
      assert.strictEqual(typeOf(arr), 'array', 'item of type array');
      assert.strictEqual(typeOf(obj), 'object', 'item of type object');
      assert.strictEqual(typeOf(instance), 'instance', 'item of type instance');
      assert.strictEqual(typeOf(instance.method), 'function', 'item of type function');
      assert.strictEqual(typeOf(instance.asyncMethod), 'function', 'item of type async function');
      assert.strictEqual(typeOf(EmberObject.extend()), 'class', 'item of type class');
      assert.strictEqual(typeOf(new Error()), 'error', 'item of type error');
    }

    ['@test Ember.typeOf(fileList)'](assert) {
      if (window && typeof window.FileList === 'function') {
        let fileListElement = document.createElement('input');
        fileListElement.type = 'file';
        let fileList = fileListElement.files;
        assert.strictEqual(typeOf(fileList), 'filelist', 'item of type filelist');
      } else {
        assert.ok(true, 'FileList is not present on window');
      }
    }
  }
);
