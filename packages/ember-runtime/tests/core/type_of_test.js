import { typeOf } from '../../utils';
import EmberObject from '../../system/object';
import { environment } from 'ember-environment';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember Type Checking',
  class extends AbstractTestCase {
    ['@test Ember.typeOf'](assert) {
      let MockedDate = function() {};
      MockedDate.prototype = new Date();

      let mockedDate = new MockedDate();
      let date = new Date();
      let error = new Error('boum');
      let object = { a: 'b' };
      let a = null;
      let arr = [1, 2, 3];
      let obj = {};
      let instance = EmberObject.create({ method() {} });

      assert.equal(typeOf(), 'undefined', 'undefined');
      assert.equal(typeOf(null), 'null', 'null');
      assert.equal(typeOf('Cyril'), 'string', 'Cyril');
      assert.equal(typeOf(101), 'number', '101');
      assert.equal(typeOf(true), 'boolean', 'true');
      assert.equal(typeOf([1, 2, 90]), 'array', '[1,2,90]');
      assert.equal(typeOf(/abc/), 'regexp', '/abc/');
      assert.equal(typeOf(date), 'date', 'new Date()');
      assert.equal(typeOf(mockedDate), 'date', 'mocked date');
      assert.equal(typeOf(error), 'error', 'error');
      assert.equal(typeOf(object), 'object', 'object');
      assert.equal(typeOf(undefined), 'undefined', 'item of type undefined');
      assert.equal(typeOf(a), 'null', 'item of type null');
      assert.equal(typeOf(arr), 'array', 'item of type array');
      assert.equal(typeOf(obj), 'object', 'item of type object');
      assert.equal(typeOf(instance), 'instance', 'item of type instance');
      assert.equal(typeOf(instance.method), 'function', 'item of type function');
      assert.equal(typeOf(EmberObject.extend()), 'class', 'item of type class');
      assert.equal(typeOf(new Error()), 'error', 'item of type error');
    }

    ['@test Ember.typeOf(fileList)'](assert) {
      if (environment.window && typeof environment.window.FileList === 'function') {
        let fileListElement = document.createElement('input');
        fileListElement.type = 'file';
        let fileList = fileListElement.files;
        assert.equal(typeOf(fileList), 'filelist', 'item of type filelist');
      } else {
        assert.ok(true, 'FileList is not present on window');
      }
    }
  }
);
