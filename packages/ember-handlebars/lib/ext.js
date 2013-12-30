require('ember-handlebars-compiler');

var slice = Array.prototype.slice,
    originalTemplate = Ember.Handlebars.template;

/**
  If a path starts with a reserved keyword, returns the root
  that should be used.

  @private
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

  if (Ember.FEATURES.isEnabled("ember-handlebars-caps-lookup")) {

    // If the path starts with a capital letter, look it up on Ember.lookup,
    // which defaults to the `window` object in browsers.
    if (Ember.isGlobalPath(path)) {
      value = Ember.get(Ember.lookup, path);
    } else {

      // In cases where the path begins with a keyword, change the
      // root to the value represented by that keyword, and ensure
      // the path is relative to it.
      value = Ember.get(normalizedPath.root, normalizedPath.path);
    }

  } else {
    root = normalizedPath.root;
    path = normalizedPath.path;

    value = Ember.get(root, path);

    if (value === undefined && root !== Ember.lookup && Ember.isGlobalPath(path)) {
      value = Ember.get(Ember.lookup, path);
    }
  }

  return value;
};

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
  Registers a helper in Handlebars that will be called if no property with the
  given name can be found on the current context object, and no helper with
  that name is registered.

  This throws an exception with a more helpful error message so the user can
  track down where the problem is happening.

  @private
  @method helperMissing
  @for Ember.Handlebars.helpers
  @param {String} path
  @param {Hash} options
*/
Ember.Handlebars.registerHelper('helperMissing', function(path) {
  var error, view = "";

  var options = arguments[arguments.length - 1];

  var helper = Ember.Handlebars.resolveHelper(options.data.view.container, path);

  if (helper) {
    return helper.apply(this, slice.call(arguments, 1));
  }

  error = "%@ Handlebars error: Could not find property '%@' on object %@.";
  if (options.data) {
    view = options.data.view;
  }
  throw new Ember.Error(Ember.String.fmt(error, [view, path, this]));
});

/**
  Registers a helper in Handlebars that will be called if no property with the
  given name can be found on the current context object, and no helper with
  that name is registered.

  This throws an exception with a more helpful error message so the user can
  track down where the problem is happening.

  @private
  @method helperMissing
  @for Ember.Handlebars.helpers
  @param {String} path
  @param {Hash} options
*/
Ember.Handlebars.registerHelper('blockHelperMissing', function(path) {

  var options = arguments[arguments.length - 1];

  Ember.assert("`blockHelperMissing` was invoked without a helper name, which is most likely due to a mismatch between the version of Ember.js you're running now and the one used to precompile your templates. Please make sure the version of `ember-handlebars-compiler` you're using is up to date.", path);

  var helper = Ember.Handlebars.resolveHelper(options.data.view.container, path);

  if (helper) {
    return helper.apply(this, slice.call(arguments, 1));
  } else {
    return Handlebars.helpers.helperMissing.call(this, path);
  }

  return Handlebars.helpers.blockHelperMissing.apply(this, arguments);
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
    while(a.length < count) {
        a.push(value);
    }
    return a.join('');
  });
  ```

  This helper could be used in a template as follows:

  ```handlebars
  {{repeat text count=3}}
  ```

  ## Example with bound options

  Bound hash options are also supported. Example:

  ```handlebars
  {{repeat text countBinding="numRepeats"}}
  ```

  In this example, count will be bound to the value of
  the `numRepeats` property on the context. If that property
  changes, the helper will be re-rendered.

  ## Example with extra dependencies

  The `Ember.Handlebars.registerBoundHelper` method takes a variable length
  third parameter which indicates extra dependencies on the passed in value.
  This allows the handlebars helper to update when these dependencies change.

  ```javascript
  Ember.Handlebars.registerBoundHelper('capitalizeName', function(value) {
    return value.get('name').toUpperCase();
  }, 'name');
  ```

  ## Example with multiple bound properties

  `Ember.Handlebars.registerBoundHelper` supports binding to
  multiple properties, e.g.:

  ```javascript
  Ember.Handlebars.registerBoundHelper('concatenate', function() {
    var values = Array.prototype.slice.call(arguments, 0, -1);
    return values.join('||');
  });
  ```

  Which allows for template syntax such as `{{concatenate prop1 prop2}}` or
  `{{concatenate prop1 prop2 prop3}}`. If any of the properties change,
  the helpr will re-render.  Note that dependency keys cannot be
  using in conjunction with multi-property helpers, since it is ambiguous
  which property the dependent keys would belong to.

  ## Use with unbound helper

  The `{{unbound}}` helper can be used with bound helper invocations
  to render them in their unbound form, e.g.

  ```handlebars
  {{unbound capitalize name}}
  ```

  In this example, if the name property changes, the helper
  will not re-render.

  ## Use with blocks not supported

  Bound helpers do not support use with Handlebars blocks or
  the addition of child views of any kind.

  @method registerBoundHelper
  @for Ember.Handlebars
  @param {String} name
  @param {Function} function
  @param {String} dependentKeys*
*/
Ember.Handlebars.registerBoundHelper = function(name, fn) {
  var boundHelperArgs = slice.call(arguments, 1),
      boundFn = Ember.Handlebars.makeBoundHelper.apply(this, boundHelperArgs);
  Ember.Handlebars.registerHelper(name, boundFn);
};

/**
  A (mostly) private helper function to `registerBoundHelper`. Takes the
  provided Handlebars helper function fn and returns it in wrapped
  bound helper form.

  The main use case for using this outside of `registerBoundHelper`
  is for registering helpers on the container:

  ```js
  var boundHelperFn = Ember.Handlebars.makeBoundHelper(function(word) {
    return word.toUpperCase();
  });

  container.register('helper:my-bound-helper', boundHelperFn);
  ```

  In the above example, if the helper function hadn't been wrapped in
  `makeBoundHelper`, the registered helper would be unbound.

  @private
  @method makeBoundHelper
  @for Ember.Handlebars
  @param {Function} function
  @param {String} dependentKeys*
*/
Ember.Handlebars.makeBoundHelper = function(fn) {
  var dependentKeys = slice.call(arguments, 1);

  function helper() {
    var properties = slice.call(arguments, 0, -1),
      numProperties = properties.length,
      options = arguments[arguments.length - 1],
      normalizedProperties = [],
      types = options.types,
      data = options.data,
      hash = options.hash,
      view = data.view,
      contexts = options.contexts,
      currentContext = (contexts && contexts.length) ? contexts[0] : this,
      prefixPathForDependentKeys = '',
      loc, len, hashOption,
      boundOption, property,
      normalizedValue = Ember._SimpleHandlebarsView.prototype.normalizedValue;

    Ember.assert("registerBoundHelper-generated helpers do not support use with Handlebars blocks.", !options.fn);

    // Detect bound options (e.g. countBinding="otherCount")
    var boundOptions = hash.boundOptions = {};
    for (hashOption in hash) {
      if (Ember.IS_BINDING.test(hashOption)) {
        // Lop off 'Binding' suffix.
        boundOptions[hashOption.slice(0, -7)] = hash[hashOption];
      }
    }

    // Expose property names on data.properties object.
    var watchedProperties = [];
    data.properties = [];
    for (loc = 0; loc < numProperties; ++loc) {
      data.properties.push(properties[loc]);
      if (types[loc] === 'ID') {
        var normalizedProp = normalizePath(currentContext, properties[loc], data);
        normalizedProperties.push(normalizedProp);
        watchedProperties.push(normalizedProp);
      } else {
        normalizedProperties.push(null);
      }
    }

    // Handle case when helper invocation is preceded by `unbound`, e.g.
    // {{unbound myHelper foo}}
    if (data.isUnbound) {
      return evaluateUnboundHelper(this, fn, normalizedProperties, options);
    }

    var bindView = new Ember._SimpleHandlebarsView(null, null, !options.hash.unescaped, options.data);

    // Override SimpleHandlebarsView's method for generating the view's content.
    bindView.normalizedValue = function() {
      var args = [], boundOption;

      // Copy over bound hash options.
      for (boundOption in boundOptions) {
        if (!boundOptions.hasOwnProperty(boundOption)) { continue; }
        property = normalizePath(currentContext, boundOptions[boundOption], data);
        bindView.path = property.path;
        bindView.pathRoot = property.root;
        hash[boundOption] = normalizedValue.call(bindView);
      }

      for (loc = 0; loc < numProperties; ++loc) {
        property = normalizedProperties[loc];
        if (property) {
          bindView.path = property.path;
          bindView.pathRoot = property.root;
          args.push(normalizedValue.call(bindView));
        } else {
          args.push(properties[loc]);
        }
      }
      args.push(options);

      // Run the supplied helper function.
      return fn.apply(currentContext, args);
    };

    view.appendChild(bindView);

    // Assemble list of watched properties that'll re-render this helper.
    for (boundOption in boundOptions) {
      if (boundOptions.hasOwnProperty(boundOption)) {
        watchedProperties.push(normalizePath(currentContext, boundOptions[boundOption], data));
      }
    }

    // Observe each property.
    for (loc = 0, len = watchedProperties.length; loc < len; ++loc) {
      property = watchedProperties[loc];
      view.registerObserver(property.root, property.path, bindView, bindView.rerender);
    }

    if (types[0] !== 'ID' || normalizedProperties.length === 0) {
      return;
    }

    // Add dependent key observers to the first param
    var normalized = normalizedProperties[0],
        pathRoot = normalized.root,
        path = normalized.path;

    if(!Ember.isEmpty(path)) {
      prefixPathForDependentKeys = path + '.';
    }
    for (var i=0, l=dependentKeys.length; i<l; i++) {
      view.registerObserver(pathRoot, prefixPathForDependentKeys + dependentKeys[i], bindView, bindView.rerender);
    }
  }

  helper._rawFunction = fn;
  return helper;
};

/**
  Renders the unbound form of an otherwise bound helper function.

  @private
  @method evaluateUnboundHelper
  @param {Function} fn
  @param {Object} context
  @param {Array} normalizedProperties
  @param {String} options
*/
function evaluateUnboundHelper(context, fn, normalizedProperties, options) {
  var args = [], hash = options.hash, boundOptions = hash.boundOptions, loc, len, property, boundOption;

  for (boundOption in boundOptions) {
    if (!boundOptions.hasOwnProperty(boundOption)) { continue; }
    hash[boundOption] = Ember.Handlebars.get(context, boundOptions[boundOption], options);
  }

  for(loc = 0, len = normalizedProperties.length; loc < len; ++loc) {
    property = normalizedProperties[loc];
    args.push(Ember.Handlebars.get(property.root, property.path, options));
  }
  args.push(options);
  return fn.apply(context, args);
}

/**
  Overrides Handlebars.template so that we can distinguish
  user-created, top-level templates from inner contexts.

  @private
  @method template
  @for Ember.Handlebars
  @param {String} spec
*/
Ember.Handlebars.template = function(spec) {
  var t = originalTemplate(spec);
  t.isTop = true;
  return t;
};
