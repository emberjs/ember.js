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
        viewName = get(view, 'viewName');

    set(outlets, outletName, view);

    if (router && viewName) {
      router._connectActiveView(viewName, view);
    }
  },

  disconnectOutlet: function(outletName) {
    var outlets = get(this, '_outlets');

    set(outlets, outletName, null);
  }
});
