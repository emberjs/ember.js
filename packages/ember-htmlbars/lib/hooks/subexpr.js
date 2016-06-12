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
  let keyword = env.hooks.keywords[helperName];
  if (keyword) {
    return keyword(null, env, scope, params, hash, null, null);
  }

  linkParamsFor(helperName, params);

  let label = labelForSubexpr(params, hash, helperName);
  let helper = lookupHelper(helperName, scope.getSelf(), env);

  let helperStream = buildHelperStream(helper, params, hash, null, env, scope, label);

  for (let i = 0; i < params.length; i++) {
    helperStream.addDependency(params[i]);
  }

  for (let key in hash) {
    helperStream.addDependency(hash[key]);
  }

  return helperStream;
}

export function labelForSubexpr(params, hash, helperName) {
  let paramsLabels = labelsForParams(params);
  let hashLabels = labelsForHash(hash);
  let label = `(${helperName}`;

  if (paramsLabels) { label += ` ${paramsLabels}`; }
  if (hashLabels) { label += ` ${hashLabels}`; }

  return `${label})`;
}

function labelsForParams(params) {
  return labelsFor(params).join(' ');
}

function labelsForHash(hash) {
  let out = [];

  for (let prop in hash) {
    out.push(`${prop}=${labelFor(hash[prop])}`);
  }

  return out.join(' ');
}
