import {get} from "ember-metal/property_get";
import {map} from "ember-metal/array";
import {onLoad} from "ember-runtime/system/lazy_load";
import {ControllerMixin} from "ember-runtime/controllers/controller";
import EmberRouter from "ember-routing/system/router";
import {resolveParams as handlebarsResolve, handlebarsGet} from "ember-handlebars/ext";

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

    if (ControllerMixin.detect(object)) {
      return unwrap(get(object, 'model'), path ? path + '.model' : 'model');
    } else {
      return path;
    }
  }
}

export {resolveParams, resolvePaths};
