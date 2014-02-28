import Ember from "ember-metal/core";
import {computed} from "ember-metal/computed";
import ArrayProxy from "ember-runtime/system/array_proxy";

module("Ember.ArrayProxy - content update");

test("The `contentArrayDidChange` method is invoked after `content` is updated.", function() {

  var proxy, observerCalled = false;

  proxy = ArrayProxy.createWithMixins({
    content: Ember.A(),

    arrangedContent: computed('content', function(key, value) {
      // setup arrangedContent as a different object than content,
      // which is the default
      return Ember.A(this.get('content').slice());
    }),

    contentArrayDidChange: function(array, idx, removedCount, addedCount) {
      observerCalled = true;
      return this._super(array, idx, removedCount, addedCount);
    }
  });

  proxy.pushObject(1);

  ok(observerCalled, "contentArrayDidChange is invoked");
});
