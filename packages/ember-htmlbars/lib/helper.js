import Object from "ember-runtime/system/object";

// Ember.Helper.extend({ compute(params, hash) {} });
var Helper = Object.extend({
  isHelper: true,
  recompute() {
    this._stream.notify();
  }
});

Helper.reopenClass({
  isHelperFactory: true
});

// Ember.Helper.helper(function(params, hash) {});
export function helper(helperFn) {
  return {
    isHelperInstance: true,
    compute: helperFn
  };
}

Helper.helper = helper;

export default Helper;
