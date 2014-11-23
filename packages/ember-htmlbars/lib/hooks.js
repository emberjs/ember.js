import Ember from "ember-metal/core";
import EmberError from "ember-metal/error";
import run from "ember-metal/run_loop";
import lookupHelper from "ember-htmlbars/system/lookup-helper";
import concat from "ember-htmlbars/system/concat";
import { sanitizeOptionsForHelper } from "ember-htmlbars/system/sanitize-for-helper";

function streamifyArgs(view, params, hash, options, env, helper) {
  sanitizeOptionsForHelper(options);
  helper.preprocessArguments(view, params, hash, options, env);

  // Convert ID params to streams
  for (var i = 0, l = params.length; i < l; i++) {
    if (options.paramTypes[i] === 'id') {
      params[i] = view.getStream(params[i]);
    }
  }

  // Convert hash ID values to streams
  var hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id' && key !== 'classBinding' && key !== 'class') {
      hash[key] = view.getStream(hash[key]);
    }
  }
}

export function set(view, name, value) {
  if (Ember.FEATURES.isEnabled('ember-htmlbars-block-params')) {
    view._keywords[name] = value;
  } else {
    throw new EmberError(
      "You must enable the ember-htmlbars-block-params feature " +
      "flag to use the block params feature in Ember."
    );
  }
}

export function content(morph, path, view, params, hash, options, env) {
  var helper = lookupHelper(path, view, env);
  if (!helper) {
    helper = lookupHelper('bindHelper', view, env);
    // Modify params to include the first word
    params.unshift(path);
    options.paramTypes = ['id'];
  }

  streamifyArgs(view, params, hash, options, env, helper);
  return helper.helperFunction.call(view, params, hash, options, env);
}

export function component(morph, tagName, view, hash, options, env) {
  var params = [];
  var helper = lookupHelper(tagName, view, env);

  Ember.assert('You specified `' + tagName + '` in your template, but a component for `' + tagName + '` could not be found.', !!helper);

  streamifyArgs(view, params, hash, options, env, helper);
  return helper.helperFunction.call(view, params, hash, options, env);
}

export function element(element, path, view, params, hash, options, env) { //jshint ignore:line
  var helper = lookupHelper(path, view, env);

  if (helper) {
    streamifyArgs(view, params, hash, options, env, helper);
    return helper.helperFunction.call(view, params, hash, options, env);
  } else {
    return view.getStream(path);
  }
}

export function subexpr(path, view, params, hash, options, env) {
  var helper = lookupHelper(path, view, env);

  if (helper) {
    streamifyArgs(view, params, hash, options, env, helper);
    return helper.helperFunction.call(view, params, hash, options, env);
  } else {
    return view.getStream(path);
  }
}

export function attribute(element, attributeName, quoted, context, parts, options, env) {
  var dom = env.dom;
  var isDirty, lastRenderedValue, attrValueStream;

  if (quoted) {
    attrValueStream = concat(parts);
  } else {
    attrValueStream = parts[0];
  }

  attrValueStream.subscribe(function() {
    isDirty = true;

    run.schedule('render', this, function() {
      var value = attrValueStream.value();

      if (isDirty) {
        isDirty = false;

        if (value !== lastRenderedValue) {
          lastRenderedValue = value;

          if (lastRenderedValue === null) {
            dom.removeAttribute(element, attributeName);
          } else {
            dom.setAttribute(element, attributeName, lastRenderedValue);
          }
        }
      }
    });
  });

  lastRenderedValue = attrValueStream.value();

  dom.setAttribute(element, attributeName, lastRenderedValue);
}
