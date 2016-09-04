import { computed } from 'ember-metal';
import ArrayProxy from '../../../system/array_proxy';
import { A as emberA } from '../../../system/native_array';

QUnit.module('Ember.ArrayProxy - content update');

QUnit.test('The `contentArrayDidChange` method is invoked after `content` is updated.', function() {
  let observerCalled = false;
  let proxy = ArrayProxy.extend({
    arrangedContent: computed('content', function(key) {
      return emberA(this.get('content').slice());
    }),

    contentArrayDidChange(array, idx, removedCount, addedCount) {
      observerCalled = true;
      return this._super(array, idx, removedCount, addedCount);
    }
  }).create({
    content: emberA()
  });

  proxy.pushObject(1);

  ok(observerCalled, 'contentArrayDidChange is invoked');
});
