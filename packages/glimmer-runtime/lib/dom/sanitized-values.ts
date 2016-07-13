import { FIXME, Opaque } from 'glimmer-util';
import { isSafeString } from '../upsert';
import { DOMHelper } from './helper';

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

export const badAttributes = [
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

function checkURI(tagName: string, attribute: string): boolean {
  return (tagName === null || has(badTags, tagName)) && has(badAttributes, attribute);
}

function checkDataURI(tagName: string, attribute: string): boolean {
  return has(badTagsForDataURI, tagName) && has(badAttributesForDataURI, attribute);
}

export function requiresSanitization(tagName: string, attribute: string): boolean {
  return checkURI(tagName, attribute) || checkDataURI(tagName, attribute);
}

export function sanitizeAttributeValue(dom: DOMHelper, element: Element, attribute: string, value: Opaque): Opaque {
  let tagName;

  if (isSafeString(value)) {
    return value.toHTML();
  }

  if (!element) {
    tagName = null;
  } else {
    tagName = element.tagName.toUpperCase();
  }

  if (checkURI(tagName, attribute)) {
    let protocol = dom.protocolForURL(value as FIXME<string>);
    if (has(badProtocols, protocol)) {
      return `unsafe:${value}`;
    }
  }

  if (checkDataURI(tagName, attribute)) {
    return `unsafe:${value}`;
  }

  return value;
}
