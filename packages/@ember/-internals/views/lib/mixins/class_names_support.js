/**
@module ember
*/
import { descriptorFor } from '@ember/-internals/meta';
import { Mixin } from '@ember/-internals/metal';
import { assert } from '@ember/debug';

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

    assert(
      `Only arrays are allowed for 'classNameBindings'`,
      descriptorFor(this, 'classNameBindings') === undefined &&
        Array.isArray(this.classNameBindings)
    );
    assert(
      `Only arrays of static class strings are allowed for 'classNames'. For dynamic classes, use 'classNameBindings'.`,
      descriptorFor(this, 'classNames') === undefined && Array.isArray(this.classNames)
    );
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
    import Component from '@ember/component';
    Component.extend({
      classNameBindings: ['priority'],
      priority: 'high'
    });
    ```

    If the value of the property is a Boolean, the name of that property is
    added as a dasherized class name.

    ```javascript
    // Applies the 'is-urgent' class to the view element
    import Component from '@ember/component';
    Component.extend({
      classNameBindings: ['isUrgent'],
      isUrgent: true
    });
    ```

    If you would prefer to use a custom value instead of the dasherized
    property name, you can pass a binding like this:

    ```javascript
    // Applies the 'urgent' class to the view element
    import Component from '@ember/component';
    Component.extend({
      classNameBindings: ['isUrgent:urgent'],
      isUrgent: true
    });
    ```

    If you would like to specify a class that should only be added when the
    property is false, you can declare a binding like this:

    ```javascript
    // Applies the 'disabled' class to the view element
    import Component from '@ember/component';
    Component.extend({
      classNameBindings: ['isEnabled::disabled'],
      isEnabled: false
    });
    ```

    This list of properties is inherited from the component's superclasses as well.

    @property classNameBindings
    @type Array
    @default []
    @public
  */
  classNameBindings: EMPTY_ARRAY,
});
