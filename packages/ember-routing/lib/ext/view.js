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
    Manually fill any of a view's `{{outlet}}` areas with the
    supplied view.

    Example

    ```javascript
    var MyView = Ember.View.extend({
      template: Ember.Handlebars.compile('Child view: {{outlet "main"}} ')
    });
    var myView = MyView.create();
    myView.appendTo('body');
    // The html for myView now looks like:
    // <div id="ember228" class="ember-view">Child view: </div>

    var FooView = Ember.View.extend({
      template: Ember.Handlebars.compile('<h1>Foo</h1> ')
    });
    var fooView = FooView.create();
    myView.connectOutlet('main', fooView);
    // The html for myView now looks like:
    // <div id="ember228" class="ember-view">Child view:
    //   <div id="ember234" class="ember-view"><h1>Foo</h1> </div>
    // </div>
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
    Determines if the view has already been created by checking if
    the view has the same constructor, template, and context as the
    view in the `_outlets` object.

    @private
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
    Removes an outlet from the view.

    Example

    ```javascript
    var MyView = Ember.View.extend({
      template: Ember.Handlebars.compile('Child view: {{outlet "main"}} ')
    });
    var myView = MyView.create();
    myView.appendTo('body');
    // myView's html:
    // <div id="ember228" class="ember-view">Child view: </div>

    var FooView = Ember.View.extend({
      template: Ember.Handlebars.compile('<h1>Foo</h1> ')
    });
    var fooView = FooView.create();
    myView.connectOutlet('main', fooView);
    // myView's html:
    // <div id="ember228" class="ember-view">Child view:
    //   <div id="ember234" class="ember-view"><h1>Foo</h1> </div>
    // </div>

    myView.disconnectOutlet('main');
    // myView's html:
    // <div id="ember228" class="ember-view">Child view: </div>
    ```

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
    Gets an outlet that is pending disconnection and then
    nullifys the object on the `_outlet` object.

    @private
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
