/**
@module ember
@submodule ember-application
*/

import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";

export default EmberObject.extend({
  container: null,
  customEvents: null,
  rootElement: null,

  startRouting: function(isModuleBasedResolver) {
    var router = this.container.lookup('router:main');
    if (!router) { return; }

    router.startRouting(isModuleBasedResolver);
  },

  handleURL: function(url) {
    var router = this.container.lookup('router:main');

    return router.handleURL(url);
  },

  setupEventDispatcher: function() {
    var dispatcher = this.container.lookup('event_dispatcher:main');

    dispatcher.setup(this.customEvents, this.rootElement);

    return dispatcher;
  },

  willDestroy: function() {
    run(this.container, 'destroy');
  }
});
