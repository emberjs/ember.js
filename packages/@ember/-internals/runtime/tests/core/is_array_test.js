import { A as emberA, isArray } from '../../lib/mixins/array';
import ArrayProxy from '../../lib/system/array_proxy';
import EmberObject from '../../lib/system/object';
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

      assert.strictEqual(isArray(numarray), true, '[1,2,3]');
      assert.strictEqual(isArray(number), false, '23');
      assert.strictEqual(isArray(strarray), true, '["Hello", "Hi"]');
      assert.strictEqual(isArray(string), false, '"Hello"');
      assert.strictEqual(isArray(object), false, '{}');
      assert.strictEqual(isArray(length), true, '{ length: 12 }');
      assert.strictEqual(isArray(strangeLength), false, '{ length: "yes" }');
      assert.strictEqual(isArray(global), false, 'global');
      assert.strictEqual(isArray(fn), false, 'function() {}');
      assert.strictEqual(isArray(asyncFn), false, 'async function() {}');
      assert.strictEqual(isArray(arrayProxy), true, '[]');
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

      assert.strictEqual(isArray(instance), false);
    }

    ['@test Ember.isArray(fileList)'](assert) {
      if (window && typeof window.FileList === 'function') {
        let fileListElement = document.createElement('input');
        fileListElement.type = 'file';
        let fileList = fileListElement.files;
        assert.strictEqual(isArray(fileList), false, 'fileList');
      } else {
        assert.ok(true, 'FileList is not present on window');
      }
    }
  }
);
