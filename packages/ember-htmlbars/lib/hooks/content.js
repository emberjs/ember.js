/**
@module ember
@submodule ember-htmlbars
*/

import subexpr from "ember-htmlbars/hooks/subexpr";
import { appendSimpleBoundView } from "ember-views/views/simple_bound_view";

export default function content(morph, path, view, params, hash, options, env) {
  var result = subexpr(path, view, params, hash, options, env);

  if (result && result.isStream) {
    appendSimpleBoundView(view, morph, result);
  } else {
    morph.update(result);
  }
}
