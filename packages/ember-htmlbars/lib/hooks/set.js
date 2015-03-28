/**
@module ember
@submodule ember-htmlbars
*/

export default function set(env, view, name, value) {
  view._keywords[name] = value;
}
