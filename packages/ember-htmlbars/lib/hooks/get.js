/**
@module ember
@submodule ember-htmlbars
*/

export default function get(env, view, path) {
  return view.getStream(path);
}
