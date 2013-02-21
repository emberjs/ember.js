require('ember-routing/system/router');

Ember.onLoad('Ember.Handlebars', function() {
  var handlebarsResolve = Ember.Handlebars.resolveParams,
      map = Ember.ArrayPolyfills.map,
      get = Ember.get;

  function resolveParams(context, params, options) {
    var resolved = handlebarsResolve(context, params, options);
    return map.call(resolved, unwrap);
  }

  function unwrap(object) {
    if (Ember.ControllerMixin.detect(object)) {
      return unwrap(get(object, 'model'));
    } else {
      return object;
    }
  }

  Ember.Router.resolveParams = resolveParams;
});
