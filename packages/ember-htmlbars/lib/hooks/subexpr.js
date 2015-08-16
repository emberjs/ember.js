/**
@module ember
@submodule ember-htmlbars
*/

import lookupHelper from 'ember-htmlbars/system/lookup-helper';
import { buildHelperStream } from 'ember-htmlbars/system/invoke-helper';
import {
  labelsFor,
  labelFor
} from 'ember-metal/streams/utils';

export default function subexpr(env, scope, helperName, params, hash) {
  // TODO: Keywords and helper invocation should be integrated into
  // the subexpr hook upstream in HTMLBars.
  var keyword = env.hooks.keywords[helperName];
  if (keyword) {
    return keyword(null, env, scope, params, hash, null, null);
  }

  var label = labelForSubexpr(params, hash, helperName);
  var helper = lookupHelper(helperName, scope.self, env);

  var helperStream = buildHelperStream(helper, params, hash, null, env, scope, label);

  for (var i = 0, l = params.length; i < l; i++) {
    helperStream.addDependency(params[i]);
  }

  for (var key in hash) {
    helperStream.addDependency(hash[key]);
  }

  return helperStream;
}

export function labelForSubexpr(params, hash, helperName) {
  var paramsLabels = labelsForParams(params);
  var hashLabels = labelsForHash(hash);
  var label = `(${helperName}`;

  if (paramsLabels) { label += ` ${paramsLabels}`; }
  if (hashLabels) { label += ` ${hashLabels}`; }

  return `${label})`;
}

function labelsForParams(params) {
  return labelsFor(params).join(' ');
}

function labelsForHash(hash) {
  var out = [];

  for (var prop in hash) {
    out.push(`${prop}=${labelFor(hash[prop])}`);
  }

  return out.join(' ');
}
