/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core'; // Ember.EXTEND_PROTOTYPES, Ember.assert
import expandProperties from 'ember-metal/expand_properties';
import { computed } from 'ember-metal/computed';
import { observer } from "ember-metal/mixin";

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
  */
  FunctionPrototype.property = function () {
    var ret = computed(this);
    // ComputedProperty.prototype.property expands properties; no need for us to
    // do so here.
    return ret.property.apply(ret, arguments);
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

    In the future this method may become asynchronous. If you want to ensure
    synchronous behavior, use `observesImmediately`.

    See `Ember.observer`.

    @method observes
    @for Function
  */
  FunctionPrototype.observes = function() {
    var length = arguments.length;
    var args = new Array(length);
    for (var x = 0; x < length; x++) {
      args[x] = arguments[x];
    }
    return observer.apply(this, args.concat(this));
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
  */
  FunctionPrototype.observesImmediately = function () {
    Ember.assert('Immediate observers must observe internal properties only, ' +
                 'not properties on other objects.', function checkIsInternalProperty() {
      for(var i = 0, l = arguments.length; i < l; i++) {
        if(arguments[i].indexOf('.') !== -1) {
          return false;
        }
      }
      return true;
    });

    // observes handles property expansion
    return this.observes.apply(this, arguments);
  };

  /**
    The `observesBefore` extension of Javascript's Function prototype is
    available when `Ember.EXTEND_PROTOTYPES` or
    `Ember.EXTEND_PROTOTYPES.Function` is true, which is the default.

    You can get notified when a property change is about to happen by
    by adding the `observesBefore` call to the end of your method
    declarations in classes that you write. For example:

    ```javascript
    Ember.Object.extend({
      valueObserver: function() {
        // Executes whenever the "value" property is about to change
      }.observesBefore('value')
    });
    ```

    See `Ember.beforeObserver`.

    @method observesBefore
    @for Function
  */
  FunctionPrototype.observesBefore = function () {
    var watched = [];
    var addWatchedProperty = function (obs) {
      watched.push(obs);
    };

    for (var i = 0, l = arguments.length; i < l; ++i) {
      expandProperties(arguments[i], addWatchedProperty);
    }

    this.__ember_observesBefore__ = watched;

    return this;
  };

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
  */
  FunctionPrototype.on = function () {
    var events = a_slice.call(arguments);
    this.__ember_listens__ = events;

    return this;
  };
}
