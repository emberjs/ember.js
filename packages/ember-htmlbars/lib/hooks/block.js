/**
@module ember
@submodule ember-htmlbars
*/

import { appendSimpleBoundView } from "ember-views/views/simple_bound_view";
import { isStream } from "ember-metal/streams/utils";
import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function block(env, morph, view, path, params, hash, template, inverse) {
  var helper = lookupHelper(path, view, env);

  Ember.assert("A helper named `"+path+"` could not be found", helper);

  var options = {
    morph: morph,
    template: template,
    inverse: inverse,
    isBlock: true
  };
  var result = helper.helperFunction.call(undefined, params, hash, options, env);

  if (isStream(result)) {
    appendSimpleBoundView(view, morph, result);
  } else {
    morph.setContent(result);
  }
}
