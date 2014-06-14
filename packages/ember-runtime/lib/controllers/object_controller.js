import { meta } from "ember-metal/utils";
import { defineProperty } from "ember-metal/properties";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { fmt } from "ember-runtime/system/string";
import { ControllerMixin } from "ember-runtime/controllers/controller";
import ObjectProxy from "ember-runtime/system/object_proxy";

/**
@module ember
@submodule ember-runtime
*/

/**
  `Ember.ObjectController` is part of Ember's Controller layer. It is intended
  to wrap a single object, proxying unhandled attempts to `get` and `set` to the underlying
  model object, and to forward unhandled action attempts to its `target`.

  `Ember.ObjectController` derives this functionality from its superclass
  `Ember.ObjectProxy` and the `Ember.ControllerMixin` mixin.

  @class ObjectController
  @namespace Ember
  @extends Ember.ObjectProxy
  @uses Ember.ControllerMixin
**/
export default ObjectProxy.extend(ControllerMixin, {
  setUnknownProperty: function (key, value) {
    var m = meta(this);
    if (m.proto === this) {
      // if marked as prototype then just defineProperty
      // rather than delegate
      defineProperty(this, key, null, value);
      return value;
    }

    var content = get(this, 'content');
    Ember.assert(fmt("Can't set `%@` on `%@` because its model was not set. Make sure the model hook in your route is returning a value.", [key, this._debugContainerKey, this]), content);
    return set(content, key, value);
  }
});
