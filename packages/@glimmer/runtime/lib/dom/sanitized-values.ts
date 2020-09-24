import { Option } from '@glimmer/interfaces';
import { SimpleElement } from '@simple-dom/interface';
import { isSafeString, normalizeStringValue } from '../dom/normalize';

const badProtocols = ['javascript:', 'vbscript:'];

const badTags = ['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM'];

const badTagsForDataURI = ['EMBED'];

const badAttributes = ['href', 'src', 'background', 'action'];

const badAttributesForDataURI = ['src'];

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

interface NodeUrlParseResult {
  protocol: string | null;
}

interface NodeUrlModule {
  parse(url: string): NodeUrlParseResult;
}

let protocolForUrl: (url: string) => string;

if (
  typeof URL === 'object' &&
  URL !== null &&
  // this is super annoying, TS thinks that URL **must** be a function so `URL.parse` check
  // thinks it is `never` without this `as unknown as any`
  typeof ((URL as unknown) as any).parse === 'function'
) {
  // In Ember-land the `fastboot` package sets the `URL` global to `require('url')`
  // ultimately, this should be changed (so that we can either rely on the natural `URL` global
  // that exists) but for now we have to detect the specific `FastBoot` case first
  //
  // a future version of `fastboot` will detect if this legacy URL setup is required (by
  // inspecting Ember version) and if new enough, it will avoid shadowing the `URL` global
  // constructor with `require('url')`.
  let nodeURL = URL as NodeUrlModule;

  protocolForUrl = (url: string) => {
    let protocol = null;

    if (typeof url === 'string') {
      protocol = nodeURL.parse(url).protocol;
    }

    return protocol === null ? ':' : protocol;
  };
} else if (typeof URL === 'function') {
  protocolForUrl = (_url: string) => {
    try {
      let url = new URL(_url);

      return url.protocol;
    } catch (error) {
      // any non-fully qualified url string will trigger an error (because there is no
      // baseURI that we can provide; in that case we **know** that the protocol is
      // "safe" because it isn't specifically one of the `badProtocols` listed above
      // (and those protocols can never be the default baseURI)
      return ':';
    }
  };
} else {
  // fallback for IE11 support
  let parsingNode = document.createElement('a');

  protocolForUrl = (url: string) => {
    parsingNode.href = url;
    return parsingNode.protocol;
  };
}

export function sanitizeAttributeValue(
  element: SimpleElement,
  attribute: string,
  value: unknown
): unknown {
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

  let str = normalizeStringValue(value);

  if (checkURI(tagName, attribute)) {
    let protocol = protocolForUrl(str);
    if (has(badProtocols, protocol)) {
      return `unsafe:${str}`;
    }
  }

  if (checkDataURI(tagName, attribute)) {
    return `unsafe:${str}`;
  }

  return str;
}
