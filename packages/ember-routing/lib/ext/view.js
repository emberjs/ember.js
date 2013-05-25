/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

Ember.View.reopen({
  init: function() {
    set(this, '_outlets', {});
    this._super();
  },

  connectOutlet: function(outletName, view) {
    if (this._pendingDisconnections) {
      delete this._pendingDisconnections[outletName];
    }

    if (this._hasEquivalentView(outletName, view)) {
      view.destroy();
      return;
    }

    var outlets = get(this, '_outlets'),
        container = get(this, 'container'),
        router = container && container.lookup('router:main'),
        renderedName = get(view, 'renderedName');

    set(outlets, outletName, view);

    if (router && renderedName) {
      router._connectActiveView(renderedName, view);
    }
  },

  _hasEquivalentView: function(outletName, view) {
    var existingView = get(this, '_outlets.'+outletName);
    return existingView &&
      existingView.prototype === view.prototype &&
      existingView.get('template') === view.get('template') &&
      existingView.get('context') === view.get('context');
  },

  disconnectOutlet: function(outletName) {
    if (!this._pendingDisconnections) {
      this._pendingDisconnections = {};
    }
    this._pendingDisconnections[outletName] = true;
    Ember.run.once(this, '_finishDisconnections');
  },

  _finishDisconnections: function() {
    var outlets = get(this, '_outlets');
    var pendingDisconnections = this._pendingDisconnections;
    this._pendingDisconnections = null;

    for (var outletName in pendingDisconnections) {
      set(outlets, outletName, null);
    }
  }
});
