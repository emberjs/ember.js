/**
@module ember
@submodule ember-views
*/

import { Mixin } from 'ember-metal';
import { assert } from 'ember-debug';

const EMPTY_ARRAY = Object.freeze([]);

/**
  @class ClassNamesSupport
  @namespace Ember
  @private
*/
export default Mixin.create({
  concatenatedProperties: ['classNames', 'classNameBindings'],

  init() {
    this._super(...arguments);

    assert(`Only arrays are allowed for 'classNameBindings'`, Array.isArray(this.classNameBindings));
    assert(`Only arrays of static class strings are allowed for 'classNames'. For dynamic classes, use 'classNameBindings'.`, Array.isArray(this.classNames));
  },

  /**
    Standard CSS class names to apply to the view's outer element. This
    property automatically inherits any class names defined by the view's
    superclasses as well.

    @property classNames
    @type Array
    @default ['ember-view']
    @public
  */
  classNames: EMPTY_ARRAY,

  /**
    A list of properties of the view to apply as class names. If the property
    is a string value, the value of that string will be applied as a class
    name.

    ```javascript
    // Applies the 'high' class to the view element
    Ember.Component.extend({
      classNameBindings: ['priority'],
      priority: 'high'
    });
    ```

    If the value of the property is a Boolean, the name of that property is
    added as a dasherized class name.

    ```javascript
    // Applies the 'is-urgent' class to the view element
    Ember.Component.extend({
      classNameBindings: ['isUrgent'],
      isUrgent: true
    });
    ```

    If you would prefer to use a custom value instead of the dasherized
    property name, you can pass a binding like this:

    ```javascript
    // Applies the 'urgent' class to the view element
    Ember.Component.extend({
      classNameBindings: ['isUrgent:urgent'],
      isUrgent: true
    });
    ```

    This list of properties is inherited from the component's superclasses as well.

    @property classNameBindings
    @type Array
    @default []
    @public
  */
  classNameBindings: EMPTY_ARRAY
});
