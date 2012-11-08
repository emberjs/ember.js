require('ember-runtime/system/namespace');

/**
@module ember
@submodule ember-runtime
*/

/**
  Defines a namespace that will contain an executable application. This is
  very similar to a normal namespace except that it is expected to include at
  least a 'ready' function which can be run to initialize the application.

  Currently `Ember.Application` is very similar to `Ember.Namespace.`  However,
  this class may be augmented by additional frameworks so it is important to
  use this instance when building new applications.

  # Example Usage

  ```javascript
  MyApp = Ember.Application.create({
    VERSION: '1.0.0',
    store: Ember.Store.create().from(Ember.fixtures)
  });

  MyApp.ready = function() {
    //..init code goes here...
  }
  ```

  @class Application
  @namespace Ember
  @extends Ember.Namespace
*/
Ember.Application = Ember.Namespace.extend();

