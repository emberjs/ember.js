var get = Ember.get, set = Ember.set;

Ember.View.reopen({
  init: function() {
    set(this, '_outlets', {});
    this._super();
  },

  connectOutlet: function(outletName, view) {
    var outlets = get(this, '_outlets'),
        container = get(this, 'container'),
        router = container && container.lookup('router:main'),
        renderedName = get(view, 'renderedName');

    set(outlets, outletName, view);

    if (router && renderedName) {
      router._connectActiveView(renderedName, view);
    }
  },

  disconnectOutlet: function(outletName) {
    var outlets = get(this, '_outlets');

    set(outlets, outletName, null);
  }
});
