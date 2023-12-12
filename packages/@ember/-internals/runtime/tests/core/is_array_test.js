import { A as emberA, isArray } from '@ember/array';
import ArrayProxy from '@ember/array/proxy';
import EmberObject from '@ember/object';
import { window } from '@ember/-internals/browser-environment';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

const global = this;

moduleFor(
  'Ember Type Checking',
  class extends AbstractTestCase {
    ['@test Ember.isArray'](assert) {
      let numarray = [1, 2, 3];
      let number = 23;
      let strarray = ['Hello', 'Hi'];
      let string = 'Hello';
      let object = {};
      let length = { length: 12 };
      let strangeLength = { length: 'yes' };
      let fn = function () {};
      let asyncFn = async function () {};
      let arrayProxy = ArrayProxy.create({ content: emberA() });

      assert.equal(isArray(numarray), true, '[1,2,3]');
      assert.equal(isArray(number), false, '23');
      assert.equal(isArray(strarray), true, '["Hello", "Hi"]');
      assert.equal(isArray(string), false, '"Hello"');
      assert.equal(isArray(object), false, '{}');
      assert.equal(isArray(length), true, '{ length: 12 }');
      assert.equal(isArray(strangeLength), false, '{ length: "yes" }');
      assert.equal(isArray(global), false, 'global');
      assert.equal(isArray(fn), false, 'function() {}');
      assert.equal(isArray(asyncFn), false, 'async function() {}');
      assert.equal(isArray(arrayProxy), true, '[]');
    }

    '@test Ember.isArray does not trigger proxy assertion when probing for length GH#16495'(
      assert
    ) {
      let instance = EmberObject.extend({
        // intentionally returning non-null / non-undefined
        unknownProperty() {
          return false;
        },
      }).create();

      assert.equal(isArray(instance), false);
    }

    ['@test Ember.isArray(fileList)'](assert) {
      if (window && typeof window.FileList === 'function') {
        let fileListElement = document.createElement('input');
        fileListElement.type = 'file';
        let fileList = fileListElement.files;
        assert.equal(isArray(fileList), false, 'fileList');
      } else {
        assert.ok(true, 'FileList is not present on window');
      }
    }
  }
);
