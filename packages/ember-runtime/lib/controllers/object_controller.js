import Ember from 'ember-metal/core';
import ControllerMixin from 'ember-runtime/mixins/controller';
import ObjectProxy from 'ember-runtime/system/object_proxy';

export var objectControllerDeprecation = 'Ember.ObjectController is deprecated, ' +
  'please use Ember.Controller and use `model.propertyName`.';

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
  @deprecated
**/
export default ObjectProxy.extend(ControllerMixin, {
  init: function() {
    this._super();

    Ember.deprecate(objectControllerDeprecation, this.isGenerated, {
      url: 'http://emberjs.com/guides/deprecations/#toc_objectcontroller'
    });
  }
});
