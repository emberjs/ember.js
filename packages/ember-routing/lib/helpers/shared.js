require('ember-routing/system/router');

Ember.onLoad('Ember.Handlebars', function() {
  var handlebarsResolve = Ember.Handlebars.resolveParams,
      map = Ember.ArrayPolyfills.map,
      get = Ember.get,
      handlebarsGet = Ember.Handlebars.get;

  function resolveParams(context, params, options) {
    return map.call(resolvePaths(context, params, options), function(path, i) {
      if (null === path) {
        // Param was string/number, not a path, so just return raw string/number.
        return params[i];
      } else {
        return handlebarsGet(context, path, options);
      }
    });
  }

  function resolvePaths(context, params, options) {
    var resolved = handlebarsResolve(context, params, options),
        types = options.types;

    return map.call(resolved, function(object, i) {
      if (types[i] === 'ID') {
        return unwrap(object, params[i]);
      } else {
        return null;
      }
    });

    function unwrap(object, path) {
      if (path === 'controller') { return path; }

      if (Ember.ControllerMixin.detect(object)) {
        return unwrap(get(object, 'model'), path ? path + '.model' : 'model');
      } else {
        return path;
      }
    }
  }

  Ember.Router.resolveParams = resolveParams;
  Ember.Router.resolvePaths = resolvePaths;
});
