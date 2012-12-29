var get = Ember.get, set = Ember.set;

require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {
  /**
  @module ember
  @submodule ember-handlebars
  */

  Handlebars.OutletView = Ember.ContainerView.extend(Ember._Metamorph);

  /**
    The `outlet` helper allows you to specify that the current
    view's controller will fill in the view for a given area.

    ``` handlebars
    {{outlet}}
    ```

    By default, when the the current controller's `view` property changes, the
    outlet will replace its current view with the new view. You can set the
    `view` property directly, but it's normally best to use `connectOutlet`.

    ``` javascript
    # Instantiate App.PostsView and assign to `view`, so as to render into outlet.
    controller.connectOutlet('posts');
    ```

    You can also specify a particular name other than `view`:

    ``` handlebars
    {{outlet masterView}}
    {{outlet detailView}}
    ```

    Then, you can control several outlets from a single controller.

    ``` javascript
    # Instantiate App.PostsView and assign to controller.masterView.
    controller.connectOutlet('masterView', 'posts');
    # Also, instantiate App.PostInfoView and assign to controller.detailView.
    controller.connectOutlet('detailView', 'postInfo');
    ```

    @method outlet
    @for Ember.Handlebars.helpers
    @param {String} property the property on the controller
      that holds the view for this outlet
  */
  Handlebars.registerHelper('outlet', function(property, options) {
    if (property && property.data && property.data.isRenderData) {
      options = property;
      property = 'main';
    }

    options.hash.currentViewBinding = "_view._outlets." + property;

    return Handlebars.helpers.view.call(this, Handlebars.OutletView, options);
  });

  Ember.View.reopen({
    init: function() {
      set(this, '_outlets', {});
      this._super();
    },

    connectOutlet: function(outletName, view) {
      var outlets = get(this, '_outlets'),
          container = get(this, 'container'),
          router = container && container.lookup('router:main'),
          oldView = get(outlets, outletName),
          viewName = get(view, 'viewName');

      set(outlets, outletName, view);

      if (router) {
        if (oldView) {
          router._disconnectActiveView(oldView);
        }
        if (viewName) {
          router._connectActiveView(viewName, view);
        }
      }
    },

    disconnectOutlet: function(outletName) {
      var outlets = get(this, '_outlets'),
          container = get(this, 'container'),
          router = container && container.lookup('router:main'),
          view = get(outlets, outletName);

      set(outlets, outletName, null);

      if (router && view) {
        router._disconnectActiveView(view);
      }
    }
  });

});

function args(linkView) {
  var ret = [ linkView.namedRoute ],
      params = linkView.parameters,
      contexts = params.contexts,
      roots = params.roots,
      data = params.data;

  for (var i=0, l=contexts.length; i<l; i++) {
    ret.push( Ember.Handlebars.get(roots[i], contexts[i], { data: data }) );
  }

  return ret;
}

var LinkView = Ember.View.extend({
  tagName: 'a',
  attributeBindings: 'href',

  click: function() {
    this.router.transitionTo.apply(this.router, args(this));
    return false;
  },

  href: Ember.computed(function() {
    // TODO: Fix this in route-recognizer
    return this.router.generate.apply(this.router, args(this)) || "/";
  })
});

LinkView.toString = function() { return "LinkView"; };

Ember.Handlebars.registerHelper('linkTo', function(name) {
  var options = [].slice.call(arguments, -1)[0];
  var contexts = [].slice.call(arguments, 1, -1);

  var hash = options.hash;

  var controller = options.data.keywords.controller;
  Ember.assert("You cannot use the {{linkTo}} helper because your current template does not have a controller", controller.target);

  hash.namedRoute = name;
  hash.router = controller.target;
  hash.parameters = {
    data: options.data,
    contexts: contexts,
    roots: options.contexts
  };

  return Ember.Handlebars.helpers.view.call(this, LinkView, options);
});
