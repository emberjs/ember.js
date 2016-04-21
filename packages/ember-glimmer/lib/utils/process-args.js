import { assert } from 'ember-metal/debug';
import assign from 'ember-metal/assign';
import EmptyObject from 'ember-metal/empty_object';

export default function processArgs(args, positionalParamsDefinition) {
  let attrs = assign(new EmptyObject(), args.named.value());
  processPositionalParams(positionalParamsDefinition || [], args.positional, attrs);

  let props = attrsToProps(keysForAttrs(args, positionalParamsDefinition), attrs);

  return { attrs, props };
}

// Transforms an object of external attributes to internal properties.
// This means that each key-value pair needs to be accessible both as key and
// attrs.key
function attrsToProps(keys, attrs) {
  let merged = new EmptyObject();

  merged.attrs = attrs;

  for (let i = 0, l = keys.length; i < l; i++) {
    let name = keys[i];
    let value = attrs[name];

    merged[name] = value;
  }

  return merged;
}

function processPositionalParams(positionalParams, params, attrs) {
  let isRest = typeof positionalParams === 'string';

  if (isRest) {
    processRestPositionalParameters(positionalParams, params, attrs);
  } else {
    processNamedPositionalParameters(positionalParams, params, attrs);
  }
}

function processNamedPositionalParameters(positionalParams, params, attrs) {
  let limit = Math.min(params.length, positionalParams.length);

  for (let i = 0; i < limit; i++) {
    let param = params.at(i).value();

    assert(`You cannot specify both a positional param (at position ${i}) and the hash argument \`${positionalParams[i]}\`.`,
           !(positionalParams[i] in attrs));

    attrs[positionalParams[i]] = param;
  }
}

function processRestPositionalParameters(positionalParamsName, params, attrs) {
  let nameInAttrs = positionalParamsName in attrs;

  // when no params are used, do not override the specified `attrs.stringParamName` value
  if (params.length === 0 && nameInAttrs) {
    return;
  }

  // If there is already an attribute for that variable, do nothing
  assert(`You cannot specify positional parameters and the hash argument \`${positionalParamsName}\`.`,
         !nameInAttrs);

  attrs[positionalParamsName] = params.value();
}

// Keys to copy from named arguments
function keysForAttrs(args, posParamsDefinition) {
  let namedKeys = args.named.keys;
  let posKeys = keysForPositionalParameters(args, posParamsDefinition);

  return namedKeys.concat(posKeys);
}

// Keys to copy for positional arguments
function keysForPositionalParameters(args, posParamsDefinition) {
  let numberOfPosParams = args.positional.length;
  if (numberOfPosParams === 0) {
    // If there are no positional parameters passed, returned an empty array
    return [];
  } else if (typeof posParamsDefinition === 'string') {
    // If there are any positional parameter and we are receiving a rest type
    // positional parameter, then return an array with the only key.
    return [posParamsDefinition];
  } else {
    // If we have received any positional parameter, return the keys for those
    // parameters we have received.
    let posEndIndex = Math.min(posParamsDefinition.length, args.positional.length);
    return posParamsDefinition.slice(0, posEndIndex);
  }
}

