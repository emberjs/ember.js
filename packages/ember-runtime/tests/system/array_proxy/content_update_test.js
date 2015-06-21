import Ember from 'ember-metal/core';
import {computed} from 'ember-metal/computed';
import ArrayProxy from 'ember-runtime/system/array_proxy';

QUnit.module('Ember.ArrayProxy - content update');

QUnit.test('The `contentArrayDidChange` method is invoked after `content` is updated.', function() {

  var proxy;
  var observerCalled = false;

  proxy = ArrayProxy.extend({
    arrangedContent: computed('content', function(key) {
      return Ember.A(this.get('content').slice());
    }),

    contentArrayDidChange(array, idx, removedCount, addedCount) {
      observerCalled = true;
      return this._super(array, idx, removedCount, addedCount);
    }
  }).create({
    content: Ember.A()
  });

  proxy.pushObject(1);

  ok(observerCalled, 'contentArrayDidChange is invoked');
});
