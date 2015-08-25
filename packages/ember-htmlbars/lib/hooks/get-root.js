/**
@module ember
@submodule ember-htmlbars
*/

export default function getRoot(scope, key) {
  if (key === 'this') {
    return [scope.self];
  } else if (key === 'hasBlock') {
    return [!!scope.blocks.default];
  } else if (key === 'hasBlockParams') {
    return [!!(scope.blocks.default && scope.blocks.default.arity)];
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
    // deprecate("You accessed the `" + key + "` attribute directly. Please use `attrs." + key + "` instead.");
    return scope.attrs[key];
  }
}
