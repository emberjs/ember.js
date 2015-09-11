/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core'; // Ember.EXTEND_PROTOTYPES
import { assert, deprecateFunc } from 'ember-metal/debug';
import { computed } from 'ember-metal/computed';
import { observer } from 'ember-metal/mixin';

var a_slice = Array.prototype.slice;
var FunctionPrototype = Function.prototype;

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Function) {
  /**
    The `property` extension of Javascript's Function prototype is available
    when `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Function` is
    `true`, which is the default.

    Computed properties allow you to treat a function like a property:

    ```javascript
    MyApp.President = Ember.Object.extend({
      firstName: '',
      lastName:  '',

      fullName: function() {
        return this.get('firstName') + ' ' + this.get('lastName');
      }.property() // Call this flag to mark the function as a property
    });

    var president = MyApp.President.create({
      firstName: 'Barack',
      lastName: 'Obama'
    });

    president.get('fullName'); // 'Barack Obama'
    ```

    Treating a function like a property is useful because they can work with
    bindings, just like any other property.

    Many computed properties have dependencies on other properties. For
    example, in the above example, the `fullName` property depends on
    `firstName` and `lastName` to determine its value. You can tell Ember
    about these dependencies like this:

    ```javascript
    MyApp.President = Ember.Object.extend({
      firstName: '',
      lastName:  '',

      fullName: function() {
        return this.get('firstName') + ' ' + this.get('lastName');

        // Tell Ember.js that this computed property depends on firstName
        // and lastName
      }.property('firstName', 'lastName')
    });
    ```

    Make sure you list these dependencies so Ember knows when to update
    bindings that connect to a computed property. Changing a dependency
    will not immediately trigger an update of the computed property, but
    will instead clear the cache so that it is updated when the next `get`
    is called on the property.

    See [Ember.ComputedProperty](/api/classes/Ember.ComputedProperty.html), [Ember.computed](/api/#method_computed).

    @method property
    @for Function
    @public
  */
  FunctionPrototype.property = function () {
    var ret = computed(this);
    // ComputedProperty.prototype.property expands properties; no need for us to
    // do so here.
    return ret.property(...arguments);
  };

  /**
    The `observes` extension of Javascript's Function prototype is available
    when `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Function` is
    true, which is the default.

    You can observe property changes simply by adding the `observes`
    call to the end of your method declarations in classes that you write.
    For example:

    ```javascript
    Ember.Object.extend({
      valueObserver: function() {
        // Executes whenever the "value" property changes
      }.observes('value')
    });
    ```

    In the future this method may become asynchronous.

    See `Ember.observer`.

    @method observes
    @for Function
    @public
  */
  FunctionPrototype.observes = function(...args) {
    args.push(this);
    return observer.apply(this, args);
  };


  FunctionPrototype._observesImmediately = function () {
    assert(
      'Immediate observers must observe internal properties only, ' +
      'not properties on other objects.',
      function checkIsInternalProperty() {
        for (var i = 0, l = arguments.length; i < l; i++) {
          if (arguments[i].indexOf('.') !== -1) {
            return false;
          }
        }
        return true;
      }
    );

    // observes handles property expansion
    return this.observes(...arguments);
  };
  /**
    The `observesImmediately` extension of Javascript's Function prototype is
    available when `Ember.EXTEND_PROTOTYPES` or
    `Ember.EXTEND_PROTOTYPES.Function` is true, which is the default.

    You can observe property changes simply by adding the `observesImmediately`
    call to the end of your method declarations in classes that you write.
    For example:

    ```javascript
    Ember.Object.extend({
      valueObserver: function() {
        // Executes immediately after the "value" property changes
      }.observesImmediately('value')
    });
    ```

    In the future, `observes` may become asynchronous. In this event,
    `observesImmediately` will maintain the synchronous behavior.

    See `Ember.immediateObserver`.

    @method observesImmediately
    @for Function
    @deprecated
    @private
  */
  FunctionPrototype.observesImmediately = deprecateFunc(
    'Function#observesImmediately is deprecated. Use Function#observes instead',
    { id: 'ember-runtime.ext-function', until: '3.0.0' },
    FunctionPrototype._observesImmediately
  );

  /**
    The `on` extension of Javascript's Function prototype is available
    when `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Function` is
    true, which is the default.

    You can listen for events simply by adding the `on` call to the end of
    your method declarations in classes or mixins that you write. For example:

    ```javascript
    Ember.Mixin.create({
      doSomethingWithElement: function() {
        // Executes whenever the "didInsertElement" event fires
      }.on('didInsertElement')
    });
    ```

    See `Ember.on`.

    @method on
    @for Function
    @public
  */
  FunctionPrototype.on = function () {
    var events = a_slice.call(arguments);
    this.__ember_listens__ = events;

    return this;
  };
}
