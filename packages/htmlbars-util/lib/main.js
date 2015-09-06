/*globals console*/

import SafeString from './htmlbars-util/safe-string';
import { escapeExpression } from './htmlbars-util/handlebars/utils';
import { getAttrNamespace } from './htmlbars-util/namespaces';
import { validateChildMorphs, linkParams, dump } from './htmlbars-util/morph-utils';

let alreadyWarned = false;
export function debugAssert(test, msg) {
  if (!alreadyWarned) {
    alreadyWarned = true;
    console.log("Don't leave debug assertions on in public builds");
  }

  if (!test) {
    throw new Error(msg || "assertion failure");
  }
}

export function prodAssert() {}

export { debugAssert as assert };

export {
  SafeString,
  escapeExpression,
  getAttrNamespace,
  validateChildMorphs,
  linkParams,
  dump
};
