/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core'; // Ember.lookup
import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { Mixin } from 'ember-metal/mixin';
import { computed } from 'ember-metal/computed';

/**
`Ember.TargetActionSupport` is a mixin that can be included in a class
to add a `triggerAction` method with semantics similar to the Handlebars
`{{action}}` helper. In normal Ember usage, the `{{action}}` helper is
usually the best choice. This mixin is most often useful when you are
doing more complex event handling in View objects.

See also `Ember.ViewTargetActionSupport`, which has
view-aware defaults for target and actionContext.

@class TargetActionSupport
@namespace Ember
@extends Ember.Mixin
@private
*/
var TargetActionSupport = Mixin.create({
  target: null,
  action: null,
  actionContext: null,

  targetObject: computed('target', function() {
    if (this._targetObject) {
      return this._targetObject;
    }

    var target = get(this, 'target');

    if (typeof target === 'string') {
      var value = get(this, target);
      if (value === undefined) {
        value = get(Ember.lookup, target);
      }

      return value;
    } else {
      return target;
    }
  }),

  actionContextObject: computed(function() {
    var actionContext = get(this, 'actionContext');

    if (typeof actionContext === 'string') {
      var value = get(this, actionContext);
      if (value === undefined) { value = get(Ember.lookup, actionContext); }
      return value;
    } else {
      return actionContext;
    }
  }).property('actionContext'),

  /**
  Send an `action` with an `actionContext` to a `target`. The action, actionContext
  and target will be retrieved from properties of the object. For example:

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: Ember.computed.alias('controller'),
    action: 'save',
    actionContext: Ember.computed.alias('context'),
    click: function() {
      this.triggerAction(); // Sends the `save` action, along with the current context
                            // to the current controller
    }
  });
  ```

  The `target`, `action`, and `actionContext` can be provided as properties of
  an optional object argument to `triggerAction` as well.

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    click: function() {
      this.triggerAction({
        action: 'save',
        target: this.get('controller'),
        actionContext: this.get('context')
      }); // Sends the `save` action, along with the current context
          // to the current controller
    }
  });
  ```

  The `actionContext` defaults to the object you are mixing `TargetActionSupport` into.
  But `target` and `action` must be specified either as properties or with the argument
  to `triggerAction`, or a combination:

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: Ember.computed.alias('controller'),
    click: function() {
      this.triggerAction({
        action: 'save'
      }); // Sends the `save` action, along with a reference to `this`,
          // to the current controller
    }
  });
  ```

  @method triggerAction
  @param opts {Object} (optional, with the optional keys action, target and/or actionContext)
  @return {Boolean} true if the action was sent successfully and did not return false
  @private
  */
  triggerAction(opts) {
    opts = opts || {};
    var action = opts.action || get(this, 'action');
    var target = opts.target || get(this, 'targetObject');
    var actionContext = opts.actionContext;

    function args(options, actionName) {
      var ret = [];
      if (actionName) { ret.push(actionName); }

      return ret.concat(options);
    }

    if (typeof actionContext === 'undefined') {
      actionContext = get(this, 'actionContextObject') || this;
    }

    if (target && action) {
      var ret;

      if (target.send) {
        ret = target.send.apply(target, args(actionContext, action));
      } else {
        assert('The action \'' + action + '\' did not exist on ' + target, typeof target[action] === 'function');
        ret = target[action].apply(target, args(actionContext));
      }

      if (ret !== false) {
        ret = true;
      }

      return ret;
    } else {
      return false;
    }
  }
});

export default TargetActionSupport;
