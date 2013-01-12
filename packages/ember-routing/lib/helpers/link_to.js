var get = Ember.get, set = Ember.set;

require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {

  var resolvePaths = Ember.Handlebars.resolvePaths,
      isSimpleClick = Ember.ViewUtils.isSimpleClick;

  function fullRouteName(router, name) {
    if (!router.hasRoute(name)) {
      name = name + '.index';
    }

    return name;
  }

  function resolvedPaths(linkView) {
    return resolvePaths(linkView.parameters);
  }

  function args(linkView, router, route) {
    var passedRouteName = route || linkView.namedRoute, routeName;

    routeName = fullRouteName(router, passedRouteName);

    Ember.assert("The route " + passedRouteName + " was not found", router.hasRoute(routeName));

    var ret = [ routeName ];
    return ret.concat(resolvePaths(linkView.parameters));
  }

  var LinkView = Ember.View.extend({
    tagName: 'a',
    namedRoute: null,
    currentWhen: null,
    title: null,
    activeClass: 'active',
    replace: false,
    attributeBindings: ['href', 'title'],
    classNameBindings: 'active',

    active: Ember.computed(function() {
      var router = this.get('router'),
          params = resolvedPaths(this),
          currentWithIndex = this.currentWhen + '.index',
          isActive = router.isActive.apply(router, [this.currentWhen].concat(params)) ||
                     router.isActive.apply(router, [currentWithIndex].concat(params));

      if (isActive) { return get(this, 'activeClass'); }
    }).property('namedRoute', 'router.url'),

    router: Ember.computed(function() {
      return this.get('controller').container.lookup('router:main');
    }),

    click: function(event) {
      if (!isSimpleClick(event)) { return true; }

      var router = this.get('router');

      if (this.get('replace')) {
        router.replaceWith.apply(router, args(this, router));
      } else {
        router.transitionTo.apply(router, args(this, router));
      }

      return false;
    },

    href: Ember.computed(function() {
      var router = this.get('router');
      return router.generate.apply(router, args(this, router));
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

