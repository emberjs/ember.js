/**
@module ember
@submodule ember-htmlbars
*/

import { appendSimpleBoundView } from "ember-views/views/simple_bound_view";
import { isStream } from "ember-metal/streams/utils";
import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function content(env, morph, view, path) {
  var helper = lookupHelper(path, view, env);
  var result;

  if (helper) {
    var options = {
      morph: morph,
      isInline: true
    };
    result = helper.helperFunction.call(undefined, [], {}, options, env);
  } else {
    result = view.getStream(path);
  }

  if (isStream(result)) {
    appendSimpleBoundView(view, morph, result);
  } else {
    morph.setContent(result);
  }
}
