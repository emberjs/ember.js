/**
@module ember
@submodule ember-htmlbars
*/

export default function getRoot(scope, key) {
  if (key === 'this') {
    return [scope.getSelf()];
  } else if (key === 'hasBlock') {
    return [!!scope.hasBlock('default')];
  } else if (key === 'hasBlockParams') {
    let block = scope.getBlock('default');
    return [!!block && block.arity];
  } else if (scope.hasLocal(key)) {
    return [scope.getLocal(key)];
  } else {
    return [getKey(scope, key)];
  }
}

function getKey(scope, key) {
  if (key === 'attrs') {
    let attrs = scope.getAttrs();
    if (attrs) { return attrs; }
  }

  var self = scope.getSelf() || scope.getLocal('view');

  if (self) {
    return self.getKey(key);
  }

  let attrs = scope.getAttrs();
  if (key in attrs) {
    // TODO: attrs
    // deprecate("You accessed the `" + key + "` attribute directly. Please use `attrs." + key + "` instead.");
    return attrs[key];
  }
}
