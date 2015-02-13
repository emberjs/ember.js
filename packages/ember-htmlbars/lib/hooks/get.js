/**
@module ember
@submodule ember-htmlbars
*/

export default function get(morph, env, scope, path) {
  return scope.self.getStream(path);
}
