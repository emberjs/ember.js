import {ControllerMixin} from "ember-runtime/controllers/controller";
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
var ObjectController = ObjectProxy.extend(ControllerMixin);
export default ObjectController;
