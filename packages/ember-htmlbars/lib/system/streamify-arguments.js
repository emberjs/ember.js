/**
@module ember
@submodule ember-htmlbars
*/

import { sanitizeOptionsForHelper } from "ember-htmlbars/system/sanitize-for-helper";

export default function streamifyArgs(view, params, hash, options, env, helper) {
  sanitizeOptionsForHelper(options);
  helper.preprocessArguments(view, params, hash, options, env);

  // Convert ID params to streams
  for (var i = 0, l = params.length; i < l; i++) {
    if (options.paramTypes[i] === 'id') {
      params[i] = view.getStream(params[i]);
    }
  }

  // Convert hash ID values to streams
  var hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id' && key !== 'classBinding' && key !== 'class') {
      hash[key] = view.getStream(hash[key]);
    }
  }
}

