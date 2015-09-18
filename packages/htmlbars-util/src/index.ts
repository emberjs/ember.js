/*globals console*/

export { default as SafeString } from './htmlbars-util/safe-string';
export { escapeExpression } from './htmlbars-util/handlebars/utils';
export { getAttrNamespace } from './htmlbars-util/namespaces';
export { validateChildMorphs, linkParams, dump } from './htmlbars-util/morph-utils';

export { intern, symbol } from './htmlbars-util/platform-utils';

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

