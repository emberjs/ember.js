/**
@module ember
@submodule ember-htmlbars
*/

export default function get(view, path) {
  return view.getStream(path);
}
