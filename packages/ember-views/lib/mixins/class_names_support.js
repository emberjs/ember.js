/**
@module ember
@submodule ember-views
*/
import Ember from 'ember-metal/core';
import { Mixin } from "ember-metal/mixin";
import { A as emberA } from "ember-runtime/system/native_array";
import {
  forEach,
  addObject
} from "ember-metal/enumerable_utils";
import {
  subscribe,
  read,
  isStream
} from "ember-metal/streams/utils";
import { streamifyClassNameBinding } from "ember-views/streams/class_name_binding";
import {
  typeOf
} from "ember-metal/utils";

var EMPTY_ARRAY = [];

/**
  @class ClassNamesSupport
  @namespace Ember
*/
var ClassNamesSupport = Mixin.create({
  concatenatedProperties: ['classNames', 'classNameBindings'],

  init() {
    this._super(...arguments);

    Ember.assert("Only arrays are allowed for 'classNameBindings'", typeOf(this.classNameBindings) === 'array');
    this.classNameBindings = emberA(this.classNameBindings.slice());

    this._classNameUnsubscribers = [];

    Ember.assert("Only arrays of static class strings are allowed for 'classNames'. For dynamic classes, use 'classNameBindings'.", typeOf(this.classNames) === 'array');
    this.classNames = emberA(this.classNames.slice());
  },

  /**
    Standard CSS class names to apply to the view's outer element. This
    property automatically inherits any class names defined by the view's
    superclasses as well.

    @property classNames
    @type Array
    @default ['ember-view']
  */
  classNames: ['ember-view'],

  /**
    A list of properties of the view to apply as class names. If the property
    is a string value, the value of that string will be applied as a class
    name.

    ```javascript
    // Applies the 'high' class to the view element
    Ember.View.extend({
      classNameBindings: ['priority']
      priority: 'high'
    });
    ```

    If the value of the property is a Boolean, the name of that property is
    added as a dasherized class name.

    ```javascript
    // Applies the 'is-urgent' class to the view element
    Ember.View.extend({
      classNameBindings: ['isUrgent']
      isUrgent: true
    });
    ```

    If you would prefer to use a custom value instead of the dasherized
    property name, you can pass a binding like this:

    ```javascript
    // Applies the 'urgent' class to the view element
    Ember.View.extend({
      classNameBindings: ['isUrgent:urgent']
      isUrgent: true
    });
    ```

    This list of properties is inherited from the view's superclasses as well.

    @property classNameBindings
    @type Array
    @default []
  */
  classNameBindings: EMPTY_ARRAY,

  /**
    Iterates over the view's `classNameBindings` array, inserts the value
    of the specified property into the `classNames` array, then creates an
    observer to update the view's element if the bound property ever changes
    in the future.

    @method _applyClassNameBindings
    @private
  */
  _applyClassNameBindings() {
    var classBindings = this.classNameBindings;

    if (!classBindings || !classBindings.length) { return; }

    var classNames = this.classNames;
    var elem, newClass, dasherizedClass;

    // Loop through all of the configured bindings. These will be either
    // property names ('isUrgent') or property paths relative to the view
    // ('content.isUrgent')
    forEach(classBindings, function(binding) {

      var boundBinding;
      if (isStream(binding)) {
        boundBinding = binding;
      } else {
        boundBinding = streamifyClassNameBinding(this, binding, '_view.');
      }

      // Variable in which the old class value is saved. The observer function
      // closes over this variable, so it knows which string to remove when
      // the property changes.
      var oldClass;

      // Set up an observer on the context. If the property changes, toggle the
      // class name.
      var observer = this._wrapAsScheduled(function() {
        // Get the current value of the property
        elem = this.$();
        newClass = read(boundBinding);

        // If we had previously added a class to the element, remove it.
        if (oldClass) {
          elem.removeClass(oldClass);
          // Also remove from classNames so that if the view gets rerendered,
          // the class doesn't get added back to the DOM.
          classNames.removeObject(oldClass);
        }

        // If necessary, add a new class. Make sure we keep track of it so
        // it can be removed in the future.
        if (newClass) {
          elem.addClass(newClass);
          oldClass = newClass;
        } else {
          oldClass = null;
        }
      });

      // Get the class name for the property at its current value
      dasherizedClass = read(boundBinding);

      if (dasherizedClass) {
        // Ensure that it gets into the classNames array
        // so it is displayed when we render.
        addObject(classNames, dasherizedClass);

        // Save a reference to the class name so we can remove it
        // if the observer fires. Remember that this variable has
        // been closed over by the observer.
        oldClass = dasherizedClass;
      }

      this._classNameUnsubscribers.push(subscribe(boundBinding, observer, this));
    }, this);
  },

  willDestroyElement: function() {
    var unsubscribers = this._classNameUnsubscribers;

    for (var i=0, l=unsubscribers.length; i<l; i++) {
      unsubscribers[i]();
    }

    this._super.apply(this, arguments);
  }
});

export default ClassNamesSupport;
