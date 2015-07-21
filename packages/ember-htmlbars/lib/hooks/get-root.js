/**
@module ember
@submodule ember-htmlbars
*/

import Ember from 'ember-metal/core';
import { isGlobal } from 'ember-metal/path_cache';
import ProxyStream from 'ember-metal/streams/proxy-stream';

export default function getRoot(scope, key) {
  if (key === 'this') {
    return [scope.self];
  } else if (key === 'hasBlock') {
    return [!!scope.blocks.default];
  } else if (key === 'hasBlockParams') {
    return [!!(scope.blocks.default && scope.blocks.default.arity)];
  } else if (isGlobal(key) && Ember.lookup[key]) {
    return [getGlobal(key)];
  } else if (key in scope.locals) {
    return [scope.locals[key]];
  } else {
    return [getKey(scope, key)];
  }
}

function getKey(scope, key) {
  if (key === 'attrs' && scope.attrs) {
    return scope.attrs;
  }

  var self = scope.self || scope.locals.view;

  if (self) {
    return self.getKey(key);
  } else if (scope.attrs && key in scope.attrs) {
    // TODO: attrs
    // Ember.deprecate("You accessed the `" + key + "` attribute directly. Please use `attrs." + key + "` instead.");
    return scope.attrs[key];
  }
}

function getGlobal(name) {
  Ember.deprecate('Global lookup of ' + name + ' from a Handlebars template is deprecated.', false, { id: 'ember-htmlbars.get-global', until: '3.0.0' });

  // This stream should be memoized, but this path is deprecated and
  // will be removed soon so it's not worth the trouble.
  return new ProxyStream(Ember.lookup[name], name);
}
