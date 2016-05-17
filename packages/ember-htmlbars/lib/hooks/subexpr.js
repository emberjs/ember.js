/**
@module ember
@submodule ember-htmlbars
*/

import lookupHelper from 'ember-htmlbars/system/lookup-helper';
import { buildHelperStream } from 'ember-htmlbars/system/invoke-helper';
import {
  labelsFor,
  labelFor
} from '../streams/utils';
import { linkParamsFor } from 'ember-htmlbars/hooks/link-render-node';

export default function subexpr(env, scope, helperName, params, hash) {
  // TODO: Keywords and helper invocation should be integrated into
  // the subexpr hook upstream in HTMLBars.
  var keyword = env.hooks.keywords[helperName];
  if (keyword) {
    return keyword(null, env, scope, params, hash, null, null);
  }

  linkParamsFor(helperName, params);

  var label = labelForSubexpr(params, hash, helperName);
  var helper = lookupHelper(helperName, scope.getSelf(), env);

  var helperStream = buildHelperStream(helper, params, hash, null, env, scope, label);

  for (var i = 0; i < params.length; i++) {
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
