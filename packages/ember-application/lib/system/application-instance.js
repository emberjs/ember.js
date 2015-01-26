/**
@module ember
@submodule ember-application
@private
*/

import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";

/**
  The `ApplicationInstance` encapsulates all of the stateful aspects of a
  running `Application`.

  At a high-level, we break application boot into two distinct phases:

  * Definition time, where all of the classes, templates, and other
    dependencies are loaded (typically in the browser).
  * Run time, where we begin executing the application once everything
    has loaded.

  Definition time can be expensive and only needs to happen once since it is
  an idempotent operation. For example, between test runs and FastBoot
  requests, the application stays the same. It is only the state that we want
  to reset.

  That state is what the `ApplicationInstance` manages: it is responsible for
  creating the container that contains all application state, and disposing of
  it once the particular test run or FastBoot request has finished.
*/

export default EmberObject.extend({
  /**
    The application instance's container. The container stores all of the
    instance-specific state for this application run.

    @property {Ember.Container} container
  */
  container: null,

  /**
    The application's registry. The registry contains the classes, templates,
    and other code that makes up the application.

    @property {Ember.Registry} registry
  */
  registry: null,

  /**
    The DOM events for which the event dispatcher should listen.

    By default, the application's `Ember.EventDispatcher` listens
    for a set of standard DOM events, such as `mousedown` and
    `keyup`, and delegates them to your application's `Ember.View`
    instances.

    @private
    @property {Object} customEvents
  */
  customEvents: null,

  /**
    The root DOM element of the Application as an element or a
    [jQuery-compatible selector
    string](http://api.jquery.com/category/selectors/).

    @private
    @property {String|DOMElement} rootElement
  */
  rootElement: null,

  init: function() {
    this._super.apply(this, arguments);
    this.container = this.registry.container();
  },

  /**
    @private
  */
  startRouting: function() {
    var router = this.container.lookup('router:main');
    if (!router) { return; }

    var isModuleBasedResolver = !!this.registry.resolver.moduleBasedResolver;
    router.startRouting(isModuleBasedResolver);
  },

  /**
    @private
  */
  handleURL: function(url) {
    var router = this.container.lookup('router:main');

    return router.handleURL(url);
  },

  /**
    @private
  */
  setupEventDispatcher: function() {
    var dispatcher = this.container.lookup('event_dispatcher:main');

    dispatcher.setup(this.customEvents, this.rootElement);

    return dispatcher;
  },

  /**
    @private
  */
  willDestroy: function() {
    this._super.apply(this, arguments);
    run(this.container, 'destroy');
  }
});
