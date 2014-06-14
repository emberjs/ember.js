import Stream from "ember-metal/streams/stream";
import {readArray} from "ember-metal/streams/read";

function streamifyArgs(context, params, options, env) {
  var hooks = env.hooks;

  // TODO: Revisit keyword rewriting approach
  if (params.length === 3 && params[1] === "in") {
    params.splice(0, 3, {isKeyword: true, from: params[2], to: params[0]});
    options.types.splice(0, 3, 'keyword');
  }

  if (params.length === 3 && params[1] === "as") {
    params.splice(0, 3, {isKeyword: true, from: params[0], to: params[2]});
    options.types.splice(0, 3, 'keyword');
  }

  // Convert ID params to streams
  for (var i = 0, l = params.length; i < l; i++) {
    if (options.types[i] === 'id') {
      params[i] = hooks.streamFor(context, params[i]);
    } else if (options.types[i] === 'keyword') {
      params[i].lazyValue = hooks.streamFor(context, params[i].from);
    }
  }

  // Convert hash ID values to streams
  var hash = options.hash,
      hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id') {
      hash[key] = hooks.streamFor(context, hash[key]);
    }
  }
}

export function content(morph, path, context, params, options, env) {
  var hooks = env.hooks;

  // TODO: just set escaped on the morph in HTMLBars
  morph.escaped = options.escaped;
  var lazyValue;
  var helper = hooks.lookupHelper(path, env);
  if (helper) {
    streamifyArgs(context, params, options, env);
    lazyValue = helper(params, options, env);
  } else {
    lazyValue = hooks.streamFor(context, path);
  }
  if (lazyValue) {
    lazyValue.subscribe(function(sender) {
      morph.update(sender.value());
    });

    morph.update(lazyValue.value());
  }
}

export function element(element, path, context, params, options, env) { //jshint ignore:line
  var hooks = env.hooks;
  var helper = hooks.lookupHelper(path, env);

  if (helper) {
    streamifyArgs(context, params, options, env);
    return helper(element, params, options, env);
  } else {
    return hooks.streamFor(context, path);
  }
}

export function subexpr(path, context, params, options, env) {
  var hooks = env.hooks;
  var helper = hooks.lookupHelper(path, env);

  if (helper) {
    streamifyArgs(context, params, options, env);
    return helper(params, options, env);
  } else {
    return hooks.streamFor(context, path);
  }
}

export function lookupHelper(name, env) {
  if (name === 'concat') { return concat; }
  if (name === 'attribute') { return attribute; }
  return env.helpers[name];
}

function attribute(element, params, options) {
  var name = params[0],
      value = params[1];

  value.subscribe(function(lazyValue) {
    element.setAttribute(name, lazyValue.value());
  });

  element.setAttribute(name, value.value());
}

function concat(params, options) {
  var stream = new Stream(function() {
    return readArray(params).join('');
  });

  params.forEach(function(param) {
    if (param && param.isStream) {
      param.subscribe(stream.notifyAll, stream);
    }
  });

  return stream;
}
