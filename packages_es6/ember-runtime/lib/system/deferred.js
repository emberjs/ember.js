import DeferredMixin from "ember-runtime/mixins/deferred";
import {get} from "ember-metal/property_get";
import EmberObject from "ember-runtime/system/object";

var Deferred = EmberObject.extend(DeferredMixin);

Deferred.reopenClass({
  promise: function(callback, binding) {
    var deferred = Deferred.create();
    callback.call(binding, deferred);
    return deferred;
  }
});

export default Deferred;
