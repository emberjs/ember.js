import { indexOfArray } from "glimmer-util";
// Regex to validate the identifier for block parameters.
// Based on the ID validation regex in Handlebars.

let ID_INVERSE_PATTERN = /[!"#%-,\.\/;->@\[-\^`\{-~]/;

// Checks the element's attributes to see if it uses block params.
// If it does, registers the block params with the program and
// removes the corresponding attributes from the element.

export function parseElementBlockParams(element) {
  let params = parseBlockParams(element);
  if (params) element.blockParams = params;
}

function parseBlockParams(element) {
  let l = element.attributes.length;
  let attrNames = [];

  for (let i = 0; i < l; i++) {
    attrNames.push(element.attributes[i].name);
  }

  let asIndex = indexOfArray(attrNames, 'as');

  if (asIndex !== -1 && l > asIndex && attrNames[asIndex + 1].charAt(0) === '|') {
    // Some basic validation, since we're doing the parsing ourselves
    let paramsString = attrNames.slice(asIndex).join(' ');
    if (paramsString.charAt(paramsString.length - 1) !== '|' || paramsString.match(/\|/g).length !== 2) {
      throw new Error('Invalid block parameters syntax: \'' + paramsString + '\'');
    }

    let params = [];
    for (let i = asIndex + 1; i < l; i++) {
      let param = attrNames[i].replace(/\|/g, '');
      if (param !== '') {
        if (ID_INVERSE_PATTERN.test(param)) {
          throw new Error('Invalid identifier for block parameters: \'' + param + '\' in \'' + paramsString + '\'');
        }
        params.push(param);
      }
    }

    if (params.length === 0) {
      throw new Error('Cannot use zero block parameters: \'' + paramsString + '\'');
    }

    element.attributes = element.attributes.slice(0, asIndex);
    return params;
  }
}

export function childrenFor(node) {
  if (node.type === 'Program') {
    return node.body;
  }
  if (node.type === 'ElementNode') {
    return node.children;
  }
}

export function appendChild(parent, node) {
  childrenFor(parent).push(node);
}

export function isHelper(mustache) {
  return (mustache.params && mustache.params.length > 0) ||
    (mustache.hash && mustache.hash.pairs.length > 0);
}

export function unwrapMustache(mustache) {
  if (isHelper(mustache)) {
    return mustache;
  } else {
    return mustache.path;
  }
}
