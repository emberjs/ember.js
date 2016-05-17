import { assert } from 'ember-metal/debug';
import { Stream } from '../streams/stream';
import { readArray } from '../streams/utils';

export default function extractPositionalParams(renderNode, component, params, attrs, raiseAssertions = true) {
  let positionalParams = component.positionalParams;

  if (positionalParams) {
    processPositionalParams(renderNode, positionalParams, params, attrs, raiseAssertions);
  }
}

export function processPositionalParams(renderNode, positionalParams, params, attrs, raiseAssertions = true) {
  let isRest = typeof positionalParams === 'string';

  if (isRest) {
    processRestPositionalParameters(renderNode, positionalParams, params, attrs, raiseAssertions);
  } else {
    processNamedPositionalParameters(renderNode, positionalParams, params, attrs, raiseAssertions);
  }
}

function processNamedPositionalParameters(renderNode, positionalParams, params, attrs, raiseAssertions) {
  let limit = Math.min(params.length, positionalParams.length);

  for (let i = 0; i < limit; i++) {
    let param = params[i];

    assert(`You cannot specify both a positional param (at position ${i}) and the hash argument \`${positionalParams[i]}\`.`,
           !(positionalParams[i] in attrs && raiseAssertions));

    attrs[positionalParams[i]] = param;
  }
}

function processRestPositionalParameters(renderNode, positionalParamsName, params, attrs, raiseAssertions) {
  let nameInAttrs = positionalParamsName in attrs;

  // when no params are used, do not override the specified `attrs.stringParamName` value
  if (params.length === 0 && nameInAttrs) {
    return;
  }

  // If there is already an attribute for that variable, do nothing
  assert(`You cannot specify positional parameters and the hash argument \`${positionalParamsName}\`.`,
         !(nameInAttrs && raiseAssertions));

  let paramsStream = new Stream(() => {
    return readArray(params.slice(0));
  }, 'params');

  attrs[positionalParamsName] = paramsStream;

  for (let i = 0; i < params.length; i++) {
    let param = params[i];
    paramsStream.addDependency(param);
  }
}
