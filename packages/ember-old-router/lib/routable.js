require('ember-old-router/resolved_state');

/**
@module ember
@submodule ember-old-router
*/

var get = Ember.get;

// The Ember Routable mixin assumes the existance of a simple
// routing shim that supports the following three behaviors:
//
// * .getURL() - this is called when the page loads
// * .setURL(newURL) - this is called from within the state
//   manager when the state changes to a routable state
// * .onURLChange(callback) - this happens when the user presses
//   the back or forward button

var paramForClass = function(classObject) {
  var className = classObject.toString(),
      parts = className.split("."),
      last = parts[parts.length - 1];

  return Ember.String.underscore(last) + "_id";
};

var merge = function(original, hash) {
  for (var prop in hash) {
    if (!hash.hasOwnProperty(prop)) { continue; }
    if (original.hasOwnProperty(prop)) { continue; }

    original[prop] = hash[prop];
  }
};

/**
  @class Routable
  @namespace Ember
*/
Ember.Routable = Ember.Mixin.create({
  init: function() {
    var redirection;
    this.on('setup', this, this.stashContext);

    if (redirection = get(this, 'redirectsTo')) {
      Ember.assert("You cannot use `redirectsTo` if you already have a `connectOutlets` method", this.connectOutlets === Ember.K);

      this.connectOutlets = function(router) {
        router.transitionTo(redirection);
      };
    }

    // normalize empty route to '/'
    var route = get(this, 'route');
    if (route === '') {
      route = '/';
    }

    this._super();

    Ember.assert("You cannot use `redirectsTo` on a state that has child states", !redirection || (!!redirection && !!get(this, 'isLeaf')));
  },

  setup: function() {
    return this.connectOutlets.apply(this, arguments);
  },

  /**
    @private

    Whenever a routable state is entered, the context it was entered with
    is stashed so that we can regenerate the state's `absoluteURL` on
    demand.

    @method stashContext
    @param manager {Ember.StateManager}
    @param context
  */
  stashContext: function(manager, context) {
    this.router = manager;

    var serialized = this.serialize(manager, context);
    Ember.assert('serialize must return a hash', !serialized || typeof serialized === 'object');

    manager.setStateMeta(this, 'context', context);
    manager.setStateMeta(this, 'serialized', serialized);

    if (get(this, 'isRoutable') && !get(manager, 'isRouting')) {
      this.updateRoute(manager, get(manager, 'location'));
    }
  },

  /**
    @private

    Whenever a routable state is entered, the router's location object
    is notified to set the URL to the current absolute path.

    In general, this will update the browser's URL.

    @method updateRoute
    @param manager {Ember.StateManager}
    @param location {Ember.Location}
  */
  updateRoute: function(manager, location) {
    if (get(this, 'isLeafRoute')) {
      var path = this.absoluteRoute(manager);
      location.setURL(path);
    }
  },

  /**
    @private

    Get the absolute route for the current state and a given
    hash.

    This method is private, as it expects a serialized hash,
    not the original context object.

    @method absoluteRoute
    @param manager {Ember.StateManager}
    @param hashes {Array}
  */
  absoluteRoute: function(manager, hashes) {
    var parentState = get(this, 'parentState'),
      path = '',
      generated,
      currentHash;

    // check if object passed instead of array
    // in this case set currentHash = hashes
    // this allows hashes to be a single hash
    // (it will be applied to state and all parents)
    currentHash = null;
    if (hashes) {
      if (hashes instanceof Array) {
        if (hashes.length > 0) {
          currentHash = hashes.shift();
        }
      } else {
        currentHash = hashes;
      }
    }

    // If the parent state is routable, use its current path
    // as this route's prefix.
    if (get(parentState, 'isRoutable')) {
      path = parentState.absoluteRoute(manager, hashes);
    }

    var matcher = get(this, 'routeMatcher'),
        serialized = manager.getStateMeta(this, 'serialized');

    // merge the existing serialized object in with the passed
    // in hash.
    currentHash = currentHash || {};
    merge(currentHash, serialized);

    generated = matcher && matcher.generate(currentHash);

    if (generated) {
      path = path + '/' + generated;
    }

    return path;
  },

  /**
    @private

    At the moment, a state is routable if it has a string `route`
    property. This heuristic may change.

    @property isRoutable
    @type Boolean
  */
  isRoutable: Ember.computed(function() {
    return typeof get(this, 'route') === 'string';
  }),

  /**
    @private

    Determine if this is the last routeable state

    @property isLeafRoute
    @type Boolean
  */
  isLeafRoute: Ember.computed(function() {
    if (get(this, 'isLeaf')) { return true; }
    return !get(this, 'childStates').findProperty('isRoutable');
  }),

  /**
    @private

    A `_RouteMatcher` object generated from the current route's `route`
    string property.

    @property routeMatcher
    @type Ember._RouteMatcher
  */
  routeMatcher: Ember.computed(function() {
    var route = get(this, 'route');
    if (route) {
      return Ember._RouteMatcher.create({ route: route });
    }
  }),

  /**
    @private

    Check whether the route has dynamic segments and therefore takes
    a context.

    @property hasContext
    @type Boolean
  */
  hasContext: Ember.computed(function() {
    var routeMatcher = get(this, 'routeMatcher');
    if (routeMatcher) {
      return routeMatcher.identifiers.length > 0;
    }
  }),

  /**
    @private

    The model class associated with the current state. This property
    uses the `modelType` property, in order to allow it to be
    specified as a String.

    @property modelClass
    @type Ember.Object
  */
  modelClass: Ember.computed(function() {
    var modelType = get(this, 'modelType');

    if (typeof modelType === 'string') {
      return Ember.get(Ember.lookup, modelType);
    } else {
      return modelType;
    }
  }),

  /**
    @private

    Get the model class for the state. The heuristic is:

    * The state must have a single dynamic segment
    * The dynamic segment must end in `_id`
    * A dynamic segment like `blog_post_id` is converted into `BlogPost`
    * The name is then looked up on the passed in namespace

    The process of initializing an application with a router will
    pass the application's namespace into the router, which will be
    used here.

    @method modelClassFor
    @param namespace {Ember.Namespace}
  */
  modelClassFor: function(namespace) {
    var modelClass, routeMatcher, identifiers, match, className;

    // if an explicit modelType was specified, use that
    if (modelClass = get(this, 'modelClass')) { return modelClass; }

    // if the router has no lookup namespace, we won't be able to guess
    // the modelType
    if (!namespace) { return; }

    // make sure this state is actually a routable state
    routeMatcher = get(this, 'routeMatcher');
    if (!routeMatcher) { return; }

    // only guess modelType for states with a single dynamic segment
    // (no more, no fewer)
    identifiers = routeMatcher.identifiers;
    if (identifiers.length !== 2) { return; }

    // extract the `_id` from the end of the dynamic segment; if the
    // dynamic segment does not end in `_id`, we can't guess the
    // modelType
    match = identifiers[1].match(/^(.*)_id$/);
    if (!match) { return; }

    // convert the underscored type into a class form and look it up
    // on the router's namespace
    className = Ember.String.classify(match[1]);
    return get(namespace, className);
  },

  /**
    The default method that takes a `params` object and converts
    it into an object.

    By default, a params hash that looks like `{ post_id: 1 }`
    will be looked up as `namespace.Post.find(1)`. This is
    designed to work seamlessly with Ember Data, but will work
    fine with any class that has a `find` method.

    @method deserialize
    @param manager {Ember.StateManager}
    @param params {Hash}
  */
  deserialize: function(manager, params) {
    var modelClass, routeMatcher, param;

    if (modelClass = this.modelClassFor(get(manager, 'namespace'))) {
      Ember.assert("Expected "+modelClass.toString()+" to implement `find` for use in '"+this.get('path')+"' `deserialize`. Please implement the `find` method or overwrite `deserialize`.", modelClass.find);
      return modelClass.find(params[paramForClass(modelClass)]);
    }

    return params;
  },

  /**
    The default method that takes an object and converts it into
    a params hash.

    By default, if there is a single dynamic segment named
    `blog_post_id` and the object is a `BlogPost` with an
    `id` of `12`, the serialize method will produce:

    ```javascript
    { blog_post_id: 12 }
    ```

    @method serialize
    @param manager {Ember.StateManager}
    @param context
  */
  serialize: function(manager, context) {
    var modelClass, routeMatcher, namespace, param, id;

    if (Ember.isEmpty(context)) { return ''; }

    if (modelClass = this.modelClassFor(get(manager, 'namespace'))) {
      param = paramForClass(modelClass);
      id = get(context, 'id');
      context = {};
      context[param] = id;
    }

    return context;
  },

  /**
    @private
    @method resolvePath
    @param manager {Ember.StateManager}
    @param path {String}
  */
  resolvePath: function(manager, path) {
    if (get(this, 'isLeafRoute')) { return Ember.A(); }

    var childStates = get(this, 'childStates'), match;

    childStates = Ember.A(childStates.filterProperty('isRoutable'));

    childStates = childStates.sort(function(a, b) {
      var aDynamicSegments = get(a, 'routeMatcher.identifiers.length'),
          bDynamicSegments = get(b, 'routeMatcher.identifiers.length'),
          aRoute = get(a, 'route'),
          bRoute = get(b, 'route');

      if (aRoute.indexOf(bRoute) === 0) {
        return -1;
      } else if (bRoute.indexOf(aRoute) === 0) {
        return 1;
      }

      if (aDynamicSegments !== bDynamicSegments) {
        return aDynamicSegments - bDynamicSegments;
      }

      return get(b, 'route.length') - get(a, 'route.length');
    });

    var state = childStates.find(function(state) {
      var matcher = get(state, 'routeMatcher');
      if (match = matcher.match(path)) { return true; }
    });

    Ember.assert("Could not find state for path " + path, !!state);

    var resolvedState = Ember._ResolvedState.create({
      manager: manager,
      state: state,
      match: match
    });

    var states = state.resolvePath(manager, match.remaining);

    return Ember.A([resolvedState]).pushObjects(states);
  },

  /**
    @private

    Once `unroute` has finished unwinding, `routePath` will be called
    with the remainder of the route.

    For example, if you were in the `/posts/1/comments` state, and you
    moved into the `/posts/2/comments` state, `routePath` will be called
    on the state whose path is `/posts` with the path `/2/comments`.

    @method routePath
    @param manager {Ember.StateManager}
    @param path {String}
  */
  routePath: function(manager, path) {
    if (get(this, 'isLeafRoute')) { return; }

    var resolvedStates = this.resolvePath(manager, path),
        hasPromises = resolvedStates.some(function(s) { return get(s, 'hasPromise'); });

    function runTransition() {
      resolvedStates.forEach(function(rs) { rs.transition(); });
    }

    if (hasPromises) {
      manager.transitionTo('loading');

      Ember.assert('Loading state should be the child of a route', Ember.Routable.detect(get(manager, 'currentState.parentState')));
      Ember.assert('Loading state should not be a route', !Ember.Routable.detect(get(manager, 'currentState')));

      manager.handleStatePromises(resolvedStates, runTransition);
    } else {
      runTransition();
    }
  },

  /**
    @private

    When you move to a new route by pressing the back
    or forward button, this method is called first.

    Its job is to move the state manager into a parent
    state of the state it will eventually move into.

    @method unroutePath
    @param router {Ember.Router}
    @param path {String}
  */
  unroutePath: function(router, path) {
    var parentState = get(this, 'parentState');

    // If we're at the root state, we're done
    if (parentState === router) {
      return;
    }

    path = path.replace(/^(?=[^\/])/, "/");
    var absolutePath = this.absoluteRoute(router);

    var route = get(this, 'route');

    // If the current path is empty, move up one state,
    // because the index ('/') state must be a leaf node.
    if (route !== '/') {
      // If the current path is a prefix of the path we're trying
      // to go to, we're done.
      var index = path.indexOf(absolutePath),
          next = path.charAt(absolutePath.length);

      if (index === 0 && (next === "/" || next === "")) {
        return;
      }
    }

    // Transition to the parent and call unroute again.
    router.enterState({
      exitStates: [this],
      enterStates: [],
      finalState: parentState
    });

    router.send('unroutePath', path);
  },

  parentTemplate: Ember.computed(function() {
    var state = this, parentState, template;

    while (state = get(state, 'parentState')) {
      if (template = get(state, 'template')) {
        return template;
      }
    }

    return 'application';
  }),

  _template: Ember.computed(function(key) {
    var value = get(this, 'template');

    if (value) { return value; }

    // If no template was explicitly supplied convert
    // the class name into a template name. For example,
    // App.PostRoute will return `post`.
    var className = this.constructor.toString(), baseName;
    if (/^[^\[].*Route$/.test(className)) {
      baseName = className.match(/([^\.]+\.)*([^\.]+)/)[2];
      baseName = baseName.replace(/Route$/, '');
      return baseName.charAt(0).toLowerCase() + baseName.substr(1);
    }
  }),

  render: function(options) {
    options = options || {};

    var template = options.template || get(this, '_template'),
        parentTemplate = options.into || get(this, 'parentTemplate'),
        controller = get(this.router, parentTemplate + "Controller");

    var viewName = Ember.String.classify(template) + "View",
        viewClass = get(get(this.router, 'namespace'), viewName);

    viewClass = (viewClass || Ember.View).extend({
      templateName: template
    });

    controller.set('view', viewClass.create());
  },

  /**
    The `connectOutlets` event will be triggered once a
    state has been entered. It will be called with the
    route's context.

    @event connectOutlets
    @param router {Ember.Router}
    @param [context*]
  */
  connectOutlets: Ember.K,

  /**
   The `navigateAway` event will be triggered when the
   URL changes due to the back/forward button

   @event navigateAway
  */
  navigateAway: Ember.K
});
