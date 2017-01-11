import { Opaque, Option } from '@glimmer/util';
import { normalizeTextValue } from '../compiled/opcodes/content';
import { isSafeString } from '../upsert';
import { Environment } from '../environment';
import * as Simple from './interfaces';

const badProtocols = [
  'javascript:',
  'vbscript:'
];

const badTags = [
  'A',
  'BODY',
  'LINK',
  'IMG',
  'IFRAME',
  'BASE',
  'FORM'
];

const badTagsForDataURI = [
  'EMBED'
];

const badAttributes = [
  'href',
  'src',
  'background',
  'action'
];

const badAttributesForDataURI = [
  'src'
];

function has(array: Array<string>, item: string): boolean {
  return array.indexOf(item) !== -1;
}

function checkURI(tagName: Option<string>, attribute: string): boolean {
  return (tagName === null || has(badTags, tagName)) && has(badAttributes, attribute);
}

function checkDataURI(tagName: Option<string>, attribute: string): boolean {
  if (tagName === null) return false;
  return has(badTagsForDataURI, tagName) && has(badAttributesForDataURI, attribute);
}

export function requiresSanitization(tagName: string, attribute: string): boolean {
  return checkURI(tagName, attribute) || checkDataURI(tagName, attribute);
}

export function sanitizeAttributeValue(env: Environment, element: Simple.Element, attribute: string, value: Opaque): Opaque {
  let tagName: Option<string> = null;

  if (value === null || value === undefined) {
    return value;
  }

  if (isSafeString(value)) {
    return value.toHTML();
  }

  if (!element) {
    tagName = null;
  } else {
    tagName = element.tagName.toUpperCase();
  }

  let str = normalizeTextValue(value);

  if (checkURI(tagName, attribute)) {
    let protocol = env.protocolForURL(str);
    if (has(badProtocols, protocol)) {
      return `unsafe:${str}`;
    }
  }

  if (checkDataURI(tagName, attribute)) {
    return `unsafe:${str}`;
  }

  return str;
}
