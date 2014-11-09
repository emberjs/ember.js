import Stream from "ember-metal/streams/stream";
import {readArray} from "ember-metal/streams/read";

function streamifyArgs(view, params, options, env) {
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
      }
    }
  }

  // Convert hash ID values to streams
  var hash = options.hash;
  var hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id' && key !== 'classBinding') {
      hash[key] = view.getStream(hash[key]);
    }
  }
}

export function content(morph, path, view, params, options, env) {
  var hooks = env.hooks;

  // TODO: just set escaped on the morph in HTMLBars
  morph.escaped = options.escaped;
  var helper = hooks.lookupHelper(path, env);
  if (!helper) {
    helper = hooks.lookupHelper('bindHelper', env);
    // Modify params to include the first word
    params.unshift(path);
    options.types = ['id'];
  }

  streamifyArgs(view, params, options, env);
  return helper.call(view, params, options, env);
}

export function element(element, path, view, params, options, env) { //jshint ignore:line
  var hooks = env.hooks;
  var helper = hooks.lookupHelper(path, env);

  if (helper) {
    streamifyArgs(view, params, options, env);
    return helper.call(view, element, params, options, env);
  } else {
    return view.getStream(path);
  }
}

export function subexpr(path, view, params, options, env) {
  var hooks = env.hooks;
  var helper = hooks.lookupHelper(path, env);

  if (helper) {
    streamifyArgs(view, params, options, env);
    return helper.call(view, params, options, env);
  } else {
    return view.getStream(path);
  }
}

export function lookupHelper(name, env) {
  if (name === 'concat') { return concat; }
  if (name === 'attribute') { return attribute; }
  return env.helpers[name];
}

function attribute(element, params, options) {
  var name = params[0];
  var value = params[1];

  value.subscribe(function(lazyValue) {
    element.setAttribute(name, lazyValue.value());
  });

  element.setAttribute(name, value.value());
}

function concat(params, options) {
  var stream = new Stream(function() {
    return readArray(params).join('');
  });

  for (var i = 0, l = params.length; i < l; i++) {
    var param = params[i];

    if (param && param.isStream) {
      param.subscribe(stream.notifyAll, stream);
    }
  }

  return stream;
}
