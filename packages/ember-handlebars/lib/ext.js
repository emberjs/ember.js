require('ember-handlebars-compiler');

/**
  @private

  If a path starts with a reserved keyword, returns the root
  that should be used.

  @method normalizePath
  @for Ember
  @param root {Object}
  @param path {String}
  @param data {Hash}
*/
var normalizePath = Ember.Handlebars.normalizePath = function(root, path, data) {
  var keywords = (data && data.keywords) || {},
      keyword, isKeyword;

  // Get the first segment of the path. For example, if the
  // path is "foo.bar.baz", returns "foo".
  keyword = path.split('.', 1)[0];

  // Test to see if the first path is a keyword that has been
  // passed along in the view's data hash. If so, we will treat
  // that object as the new root.
  if (keywords.hasOwnProperty(keyword)) {
    // Look up the value in the template's data hash.
    root = keywords[keyword];
    isKeyword = true;

    // Handle cases where the entire path is the reserved
    // word. In that case, return the object itself.
    if (path === keyword) {
      path = '';
    } else {
      // Strip the keyword from the path and look up
      // the remainder from the newly found root.
      path = path.substr(keyword.length+1);
    }
  }

  return { root: root, path: path, isKeyword: isKeyword };
};


/**
  Lookup both on root and on window. If the path starts with
  a keyword, the corresponding object will be looked up in the
  template's data hash and used to resolve the path.

  @method get
  @for Ember.Handlebars
  @param {Object} root The object to look up the property on
  @param {String} path The path to be lookedup
  @param {Object} options The template's option hash
*/
var handlebarsGet = Ember.Handlebars.get = function(root, path, options) {
  var data = options && options.data,
      normalizedPath = normalizePath(root, path, data),
      value;

  // In cases where the path begins with a keyword, change the
  // root to the value represented by that keyword, and ensure
  // the path is relative to it.
  root = normalizedPath.root;
  path = normalizedPath.path;

  value = Ember.get(root, path);

  // If the path starts with a capital letter, look it up on Ember.lookup,
  // which defaults to the `window` object in browsers.
  if (value === undefined && root !== Ember.lookup && Ember.isGlobalPath(path)) {
    value = Ember.get(Ember.lookup, path);
  }
  return value;
};
Ember.Handlebars.getPath = Ember.deprecateFunc('`Ember.Handlebars.getPath` has been changed to `Ember.Handlebars.get` for consistency.', Ember.Handlebars.get);

Ember.Handlebars.resolveParams = function(context, params, options) {
  var resolvedParams = [], types = options.types, param, type;

  for (var i=0, l=params.length; i<l; i++) {
    param = params[i];
    type = types[i];

    if (type === 'ID') {
      resolvedParams.push(handlebarsGet(context, param, options));
    } else {
      resolvedParams.push(param);
    }
  }

  return resolvedParams;
};

Ember.Handlebars.resolveHash = function(context, hash, options) {
  var resolvedHash = {}, types = options.hashTypes, type;

  for (var key in hash) {
    if (!hash.hasOwnProperty(key)) { continue; }

    type = types[key];

    if (type === 'ID') {
      resolvedHash[key] = handlebarsGet(context, hash[key], options);
    } else {
      resolvedHash[key] = hash[key];
    }
  }

  return resolvedHash;
};

/**
  @private

  Registers a helper in Handlebars that will be called if no property with the
  given name can be found on the current context object, and no helper with
  that name is registered.

  This throws an exception with a more helpful error message so the user can
  track down where the problem is happening.

  @method helperMissing
  @for Ember.Handlebars.helpers
  @param {String} path
  @param {Hash} options
*/
Ember.Handlebars.registerHelper('helperMissing', function(path, options) {
  var error, view = "";

  error = "%@ Handlebars error: Could not find property '%@' on object %@.";
  if (options.data){
    view = options.data.view;
  }
  throw new Ember.Error(Ember.String.fmt(error, [view, path, this]));
});

/**
  Register a bound handlebars helper. Bound helpers behave similarly to regular
  handlebars helpers, with the added ability to re-render when the underlying data
  changes.

  ## Simple example

  ```javascript
  Ember.Handlebars.registerBoundHelper('capitalize', function(value) {
    return value.toUpperCase();
  });
  ```

  The above bound helper can be used inside of templates as follows:

  ```handlebars
  {{capitalize name}}
  ```

  In this case, when the `name` property of the template's context changes,
  the rendered value of the helper will update to reflect this change.

  ## Example with options

  Like normal handlebars helpers, bound helpers have access to the options
  passed into the helper call.

  ```javascript
  Ember.Handlebars.registerBoundHelper('repeat', function(value, options) {
    var count = options.hash.count;
    var a = [];
    while(a.length < count){
        a.push(value);
    }
    return a.join('');
  });
  ```

  This helper could be used in a template as follows:

  ```handlebars
  {{repeat text count=3}}
  ```

  ## Example with extra dependencies

  The `Ember.Handlebars.registerBoundHelper` method takes a variable length
  third parameter which indicates extra dependencies on the passed in value.
  This allows the handlebars helper to update when these dependencies change.

  ```javascript
  Ember.Handlebars.registerBoundHelper('capitalizeName', function(value) {
    return value.get('name').toUpperCase();
  }, 'name');
  ```

  @method registerBoundHelper
  @for Ember.Handlebars
  @param {String} name
  @param {Function} function
  @param {String} dependentKeys*
*/
Ember.Handlebars.registerBoundHelper = function(name, fn) {
  var dependentKeys = Array.prototype.slice.call(arguments, 2);
  Ember.Handlebars.registerHelper(name, function(property, options) {
    var data = options.data,
      view = data.view,
      currentContext = (options.contexts && options.contexts[0]) || this,
      pathRoot, path, normalized,
      observer, loc;

    normalized = Ember.Handlebars.normalizePath(currentContext, property, data);

    pathRoot = normalized.root;
    path = normalized.path;

    var bindView = new Ember._SimpleHandlebarsView(
      path, pathRoot, !options.hash.unescaped, options.data
    );

    bindView.normalizedValue = function() {
      var value = Ember._SimpleHandlebarsView.prototype.normalizedValue.call(bindView);
      return fn.call(view, value, options);
    };

    view.appendChild(bindView);

    observer = function() {
      Ember.run.scheduleOnce('render', bindView, 'rerender');
    };

    view.registerObserver(pathRoot, path, observer);

    for (var i=0, l=dependentKeys.length; i<l; i++) {
      view.registerObserver(pathRoot, path + '.' + dependentKeys[i], observer);
    }
  });
};

/**
  @private

  Overrides Handlebars.template so that we can distinguish
  user-created, top-level templates from inner contexts.

  @method template
  @for Ember.Handlebars
  @param {String} template spec
*/
Ember.Handlebars.template = function(spec){
  var t = Handlebars.template(spec);
  t.isTop = true;
  return t;
};

