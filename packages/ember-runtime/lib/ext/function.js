require('ember-runtime/core');

/**
@module ember
@submodule ember-runtime
*/

var a_slice = Array.prototype.slice;

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Function) {

  /**
    The `property` extension of Javascript's Function prototype is available
    when `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Function` is
    `true`, which is the default.

    Computed properties allow you to treat a function like a property:

    ```javascript
    MyApp.president = Ember.Object.create({
      firstName: "Barack",
      lastName: "Obama",

      fullName: function() {
        return this.get('firstName') + ' ' + this.get('lastName');

        // Call this flag to mark the function as a property
      }.property()
    });

    MyApp.president.get('fullName');    // "Barack Obama"
    ```

    Treating a function like a property is useful because they can work with
    bindings, just like any other property.

    Many computed properties have dependencies on other properties. For
    example, in the above example, the `fullName` property depends on
    `firstName` and `lastName` to determine its value. You can tell Ember
    about these dependencies like this:

    ```javascript
    MyApp.president = Ember.Object.create({
      firstName: "Barack",
      lastName: "Obama",

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

    See {{#crossLink "Ember.ComputedProperty"}}{{/crossLink}},
      {{#crossLink "Ember/computed"}}{{/crossLink}}

    @method property
    @for Function
  */
  Function.prototype.property = function() {
    var ret = Ember.computed(this);
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
    Ember.Object.create({
      valueObserver: function() {
        // Executes whenever the "value" property changes
      }.observes('value')
    });
    ```

    See {{#crossLink "Ember.Observable/observes"}}{{/crossLink}}

    @method observes
    @for Function
  */
  Function.prototype.observes = function() {
    this.__ember_observes__ = a_slice.call(arguments);
    return this;
  };

  /**
    The `observesBefore` extension of Javascript's Function prototype is
    available when `Ember.EXTEND_PROTOTYPES` or
    `Ember.EXTEND_PROTOTYPES.Function` is true, which is the default.

    You can get notified when a property changes is about to happen by
    by adding the `observesBefore` call to the end of your method
    declarations in classes that you write. For example:

    ```javascript
    Ember.Object.create({
      valueObserver: function() {
        // Executes whenever the "value" property is about to change
      }.observesBefore('value')
    });
    ```

    See {{#crossLink "Ember.Observable/observesBefore"}}{{/crossLink}}

    @method observesBefore
    @for Function
  */
  Function.prototype.observesBefore = function() {
    this.__ember_observesBefore__ = a_slice.call(arguments);
    return this;
  };

  /**
    The `inRunLoop` extension of Javascript's Function prototype is
    available when `Ember.EXTEND_PROTOTYPES` or
    `Ember.EXTEND_PROTOTYPES.Function` is true, which is the default.

    Adding a call to `inRunLoop` at the end of a function will return
    a version of that function that gets called within an Ember
    Run Loop. This is useful when you need to provide a callback
    to $.ajax queries or third party plugins that won't automatically
    wrap your callback in an Ember Run Loop.

    ```javascript
    Ember.$.ajax("/some_url", "GET", {
      context: this,
      success: function(json) {
        this.set('value', json.value);
      }.inRunLoop()
    });

    // This expands to:
    Ember.$.ajax("/some_url", "GET", {
      context: this,
      success: function(json) {
        Ember.run(this, function() { 
          this.set('value', json.value); 
        });
      }
    });
    ```

    See {{#crossLink "Ember.run"}}{{/crossLink}}

    @method inRunLoop
    @for Function
  */
  Function.prototype.inRunLoop = function() {
    var fn = this;
    return function() {
      var args = arguments;
      return Ember.run(this, function() {
        return fn.apply(this, args);
      });
    };
  };
}

