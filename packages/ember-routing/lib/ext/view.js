/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

Ember.View.reopen({

  /**
    Sets the private `_outlets` object on the view.

    @method init
   */
  init: function() {
    set(this, '_outlets', {});
    this._super();
  },

  /**
    Allows you to connect a unique view as the parent
    view's `{{outlet}}`.

    ```javascript
      myView.connectOutlet('main', Ember.View.extend({
        template: Ember.Handlebars.compile('<h1>Foo</h1> ')
      }));
    ```
    @method connectOutlet
    @param  {String} outletName A unique name for the outlet
    @param  {Object} view       An Ember.View
   */
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

  /**
    @private

    Determines if the view has already been created by checking if
    the view has the same constructor, template, and context as the
    view in the `_outlets` object.

    @method _hasEquivalentView
    @param  {String} outletName The name of the outlet we are checking
    @param  {Object} view       An Ember.View
    @return {Boolean}
   */
  _hasEquivalentView: function(outletName, view) {
    var existingView = get(this, '_outlets.'+outletName);
    return existingView &&
      existingView.constructor === view.constructor &&
      existingView.get('template') === view.get('template') &&
      existingView.get('context') === view.get('context');
  },

  /**
    Removes an outlet from the current view.

    @method disconnectOutlet
    @param  {String} outletName The name of the outlet to be removed
   */
  disconnectOutlet: function(outletName) {
    if (!this._pendingDisconnections) {
      this._pendingDisconnections = {};
    }
    this._pendingDisconnections[outletName] = true;
    Ember.run.once(this, '_finishDisconnections');
  },

  /**
    @private

    Gets an outlet that is pending disconnection and then
    nullifys the object on the `_outlet` object.

    @method _finishDisconnections
   */
  _finishDisconnections: function() {
    var outlets = get(this, '_outlets');
    var pendingDisconnections = this._pendingDisconnections;
    this._pendingDisconnections = null;

    for (var outletName in pendingDisconnections) {
      set(outlets, outletName, null);
    }
  }
});
