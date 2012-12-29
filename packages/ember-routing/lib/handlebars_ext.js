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

  function args(linkView, route) {
    var ret = [ route || linkView.namedRoute ],
        params = linkView.parameters,
        contexts = params.contexts,
        roots = params.roots,
        data = params.data;

    for (var i=0, l=contexts.length; i<l; i++) {
      ret.push( Ember.Handlebars.get(roots[i], contexts[i], { data: data }) );
    }

    return ret;
  }

  function simpleClick(event) {
    var modifier = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey,
        secondaryClick = event.which > 1; // IE9 may return undefined

    return !modifier && !secondaryClick;
  }

  var LinkView = Ember.View.extend({
    tagName: 'a',
    namedRoute: null,
    currentWhen: null,
    activeClass: 'active',
    attributeBindings: 'href',
    classNameBindings: 'active',

    active: Ember.computed(function() {
      var router = this.get('router'),
          isActive = router.isActive.apply(router, args(this, this.currentWhen));

      if (isActive) { return get(this, 'activeClass'); }
    }).property('namedRoute', 'router.url'),

    router: Ember.computed(function() {
      return this.get('controller').container.lookup('router:main');
    }),

    click: function(event) {
      if (!simpleClick(event)) { return true; }

      var router = this.get('router');
      router.transitionTo.apply(router, args(this));
      return false;
    },

    href: Ember.computed(function() {
      var router = this.get('router');
      return router.generate.apply(router, args(this));
    })
  });

  LinkView.toString = function() { return "LinkView"; };

  Ember.Handlebars.registerHelper('linkTo', function(name) {
    var options = [].slice.call(arguments, -1)[0];
    var contexts = [].slice.call(arguments, 1, -1);

    var hash = options.hash;

    hash.namedRoute = name;
    hash.currentWhen = hash.currentWhen || name;

    hash.parameters = {
      data: options.data,
      contexts: contexts,
      roots: options.contexts
    };

    return Ember.Handlebars.helpers.view.call(this, LinkView, options);
  });

});
