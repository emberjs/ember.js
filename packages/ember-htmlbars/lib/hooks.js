import Ember from "ember-metal/core";
import { lookupHelper } from "ember-htmlbars/system/lookup-helper";
import { sanitizeOptionsForHelper } from "ember-htmlbars/system/sanitize-for-helper";

function streamifyArgs(view, params, hash, options, env) {
  if (params.length === 3 && params[1] === "as") {
    params.splice(0, 3, {
      from: params[0],
      to: params[2],
      stream: view.getStream(params[0])
    });
    options.types.splice(0, 3, 'keyword');
  } else {
    // Convert ID params to streams
    for (var i = 0, l = params.length; i < l; i++) {
      if (options.types[i] === 'id') {
        params[i] = view.getStream(params[i]);
        options.types[i] = 'stream';
      }
    }
  }

  // Convert hash ID values to streams
  var hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id' && key !== 'classBinding' && key !== 'class') {
      hash[key] = view.getStream(hash[key]);
      hashTypes[key] = 'stream';
    }
  }
}

export function content(morph, path, view, params, hash, options, env) {
  // TODO: just set escaped on the morph in HTMLBars
  morph.escaped = options.escaped;
  var helper = lookupHelper(path, view, env);
  if (!helper) {
    helper = lookupHelper('bindHelper', view, env);
    // Modify params to include the first word
    params.unshift(path);
    options.types = ['id'];
  }

  streamifyArgs(view, params, hash, options, env);
  sanitizeOptionsForHelper(options);
  return helper.call(view, params, hash, options, env);
}

export function component(morph, tagName, view, hash, options, env) {
  var params = [];
  var helper = lookupHelper(tagName, view, env);

  Ember.assert('You specified `' + tagName + '` in your template, but a component for `' + tagName + '` could not be found.', !!helper);

  streamifyArgs(view, params, hash, options, env);
  sanitizeOptionsForHelper(options);
  return helper.call(view, params, hash, options, env);
}

export function element(element, path, view, params, hash, options, env) { //jshint ignore:line
  var helper = lookupHelper(path, view, env);

  if (helper) {
    streamifyArgs(view, params, hash, options, env);
    sanitizeOptionsForHelper(options);
    return helper.call(view, params, hash, options, env);
  } else {
    return view.getStream(path);
  }
}

export function subexpr(path, view, params, hash, options, env) {
  var helper = lookupHelper(path, view, env);

  if (helper) {
    streamifyArgs(view, params, hash, options, env);
    sanitizeOptionsForHelper(options);
    return helper.call(view, params, hash, options, env);
  } else {
    return view.getStream(path);
  }
}
