/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

Ember.View.reopen(Ember.Filters, {
  init: function() {
    set(this, '_outlets', {});
    this._super();
  },

  connectOutlet: function(outletName, view) {
    this.fbefore('connectOutlet', this, arguments);

    var outlets = get(this, '_outlets'),
        container = get(this, 'container'),
        router = container && container.lookup('router:main'),
        renderedName = get(view, 'renderedName');

    set(outlets, outletName, view);

    if (router && renderedName) {
      router._connectActiveView(renderedName, view);
    }

    this.fafter('connectOutlet', this, arguments);
  },

  disconnectOutlet: function(outletName) {
    this.fbefore('disconnectOutlet', this, arguments);
    
    var outlets = get(this, '_outlets');

    set(outlets, outletName, null);
  }
});
