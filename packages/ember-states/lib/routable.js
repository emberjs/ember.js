var get = Ember.get, getPath = Ember.getPath;

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

Ember.Routable = Ember.Mixin.create({
  init: function() {
    this.on('connectOutlets', this, this.stashContext);

    this._super();
  },

  stashContext: function(manager, context) {
    var meta = get(manager, 'stateMeta'),
        serialized = this.serialize(manager, context);

    meta.set(this, serialized);

    if (get(this, 'isRoutable')) {
      this.updateRoute(manager, get(manager, 'location'));
    }
  },

  updateRoute: function(manager, location) {
    if (location && get(this, 'isLeaf')) {
      var path = this.absoluteRoute(manager);
      location.setURL(path);
    }
  },

  absoluteRoute: function(manager) {
    var parentState = get(this, 'parentState');
    var path = '';

    if (get(parentState, 'isRoutable')) {
      path = parentState.absoluteRoute(manager);
    }

    var matcher = get(this, 'routeMatcher'),
        hash = get(manager, 'stateMeta').get(this);

    var generated = matcher.generate(hash);

    if (generated !== "") {
      return path + '/' + matcher.generate(hash);
    } else {
      return path;
    }
  },

  isRoutable: Ember.computed(function() {
    return typeof this.route === "string";
  }).cacheable(),

  routeMatcher: Ember.computed(function() {
    if (get(this, 'route')) {
      return Ember._RouteMatcher.create({ route: get(this, 'route') });
    }
  }).cacheable(),

  modelClass: Ember.computed(function() {
    var modelType = get(this, 'modelType');

    if (typeof modelType === 'string') {
      return Ember.getPath(window, modelType);
    } else {
      return modelType;
    }
  }).cacheable(),

  modelClassFor: function(manager) {
    var modelClass, namespace, routeMatcher, identifiers, match, className;

    // if an explicit modelType was specified, use that
    if (modelClass = get(this, 'modelClass')) { return modelClass; }

    // if the router has no lookup namespace, we won't be able to guess
    // the modelType
    namespace = get(manager, 'namespace');
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

  deserialize: function(manager, params) {
    var modelClass, routeMatcher, param;

    if (modelClass = this.modelClassFor(manager)) {
      return modelClass.find(params[paramForClass(modelClass)]);
    }

    return params;
  },

  serialize: function(manager, context) {
    var modelClass, routeMatcher, namespace, param, id;

    if (modelClass = this.modelClassFor(manager)) {
      param = paramForClass(modelClass);
      id = get(context, 'id');
      context = {};
      context[param] = id;
    }

    return context;
  },

  routePath: function(manager, path) {
    if (get(this, 'isLeaf')) { return; }

    var childStates = get(this, 'childStates'), match;

    childStates = childStates.sort(function(a, b) {
      return getPath(b, 'route.length') - getPath(a, 'route.length');
    });

    var state = childStates.find(function(state) {
      var matcher = get(state, 'routeMatcher');
      if (match = matcher.match(path)) { return true; }
    });

    Ember.assert("Could not find state for path " + path, !!state);

    var object = state.deserialize(manager, match.hash) || {};
    manager.transitionTo(get(state, 'path'), object);
    manager.send('routePath', match.remaining);
  }
});

Ember.State.reopen(Ember.Routable);
