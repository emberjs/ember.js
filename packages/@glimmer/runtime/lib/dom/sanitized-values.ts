import type { Nullable, SimpleElement } from '@glimmer/interfaces';

import { isSafeString, normalizeStringValue } from '../dom/normalize';

const badProtocols = ['javascript:', 'vbscript:'];

const badTags = ['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM'];

const badTagsForDataURI = ['EMBED'];

const badAttributes = ['href', 'src', 'background', 'action'];

const badAttributesForDataURI = ['src'];

function has(array: Array<string>, item: string): boolean {
  return array.indexOf(item) !== -1;
}

function checkURI(tagName: Nullable<string>, attribute: string): boolean {
  return (tagName === null || has(badTags, tagName)) && has(badAttributes, attribute);
}

function checkDataURI(tagName: Nullable<string>, attribute: string): boolean {
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

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type WeirdUrl = typeof import('url') | typeof URL | undefined | null;

function findProtocolForURL() {
  const weirdURL = URL as WeirdUrl;

  if (
    typeof weirdURL === 'object' &&
    weirdURL !== null &&
    // this is super annoying, TS thinks that URL **must** be a function so `URL.parse` check
    // thinks it is `never` without this `as unknown as any`

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    typeof weirdURL.parse === 'function'
  ) {
    // In Ember-land the `fastboot` package sets the `URL` global to `require('url')`
    // ultimately, this should be changed (so that we can either rely on the natural `URL` global
    // that exists) but for now we have to detect the specific `FastBoot` case first
    //
    // a future version of `fastboot` will detect if this legacy URL setup is required (by
    // inspecting Ember version) and if new enough, it will avoid shadowing the `URL` global
    // constructor with `require('url')`.
    let nodeURL = weirdURL as NodeUrlModule;

    return (url: string) => {
      let protocol = null;

      if (typeof url === 'string') {
        protocol = nodeURL.parse(url).protocol;
      }

      return protocol === null ? ':' : protocol;
    };
  } else if (typeof weirdURL === 'function') {
    return (_url: string) => {
      try {
        let url = new weirdURL(_url);

        return url.protocol;
      } catch {
        // any non-fully qualified url string will trigger an error (because there is no
        // baseURI that we can provide; in that case we **know** that the protocol is
        // "safe" because it isn't specifically one of the `badProtocols` listed above
        // (and those protocols can never be the default baseURI)
        return ':';
      }
    };
  } else {
    throw new Error(`@glimmer/runtime needs a valid "globalThis.URL"`);
  }
}

let _protocolForUrlImplementation: typeof protocolForUrl | undefined;
function protocolForUrl(url: string): string {
  if (!_protocolForUrlImplementation) {
    _protocolForUrlImplementation = findProtocolForURL();
  }
  return _protocolForUrlImplementation(url);
}

export function sanitizeAttributeValue(
  element: SimpleElement,
  attribute: string,
  value: unknown
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (isSafeString(value)) {
    return value.toHTML();
  }

  const tagName = element.tagName.toUpperCase();

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
