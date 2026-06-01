import type { Nullable, SimpleElement } from '@glimmer/interfaces';

import { isSafeString, normalizeStringValue } from '../dom/normalize';

const badProtocols = ['javascript:', 'vbscript:'];

const badTags = ['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM', 'BUTTON', 'INPUT'];

const badTagsForDataURI = ['EMBED'];

// Tags whose URL attribute is loaded as a nested document. A `data:` URL there
// is rendered and can execute script just like `javascript:`, so it has to be
// neutralized even though such tags legitimately point at http(s) resources.
const badTagsForDataProtocol = ['IFRAME', 'OBJECT'];

const badAttributes = ['href', 'src', 'background', 'action', 'formaction', 'xlink:href'];

const badAttributesForDataURI = ['src'];

const badAttributesForDataProtocol = ['src', 'data'];

function has(array: Array<string>, item: string): boolean {
  return array.indexOf(item) !== -1;
}

function checkURI(tagName: Nullable<string>, attribute: string): boolean {
  // SVG element tagNames are lowercase (e.g. `a`), so they never match the
  // uppercase `badTags` entries unless we normalize first.
  return (tagName === null || has(badTags, tagName.toUpperCase())) && has(badAttributes, attribute);
}

function checkDataURI(tagName: Nullable<string>, attribute: string): boolean {
  if (tagName === null) return false;
  return has(badTagsForDataURI, tagName.toUpperCase()) && has(badAttributesForDataURI, attribute);
}

function checkDataProtocol(tagName: Nullable<string>, attribute: string): boolean {
  if (tagName === null) return false;
  return (
    has(badTagsForDataProtocol, tagName.toUpperCase()) &&
    has(badAttributesForDataProtocol, attribute)
  );
}

export function requiresSanitization(tagName: Nullable<string>, attribute: string): boolean {
  return (
    checkURI(tagName, attribute) ||
    checkDataURI(tagName, attribute) ||
    checkDataProtocol(tagName, attribute)
  );
}

interface NodeUrlParseResult {
  protocol: string | null;
}

interface NodeUrlModule {
  parse(url: string): NodeUrlParseResult;
}

type WeirdUrl = { parse: (typeof URL)['parse'] } | typeof URL | undefined | null;

function findProtocolForURL() {
  const weirdURL = URL as WeirdUrl;

  if (
    typeof weirdURL === 'object' &&
    weirdURL !== null &&
    // this is super annoying, TS thinks that URL **must** be a function so `URL.parse` check
    // thinks it is `never` without this `as unknown as any`

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
        // browsers strip ASCII tab/newline/CR from urls before navigating, so
        // `java\nscript:` runs as `javascript:`. `url.parse` keeps them and reports
        // a null protocol, slipping past the badProtocols check. Strip them here to
        // match the WHATWG `URL` parser used on the non-fastboot path.
        protocol = nodeURL.parse(url.replace(/[\t\n\r]/gu, '')).protocol;
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

  const tagName = element.tagName;

  let str = normalizeStringValue(value);

  if (checkURI(tagName, attribute)) {
    let protocol = protocolForUrl(str);
    if (has(badProtocols, protocol)) {
      return `unsafe:${str}`;
    }
  }

  if (checkDataProtocol(tagName, attribute)) {
    let protocol = protocolForUrl(str);
    if (protocol === 'data:' || has(badProtocols, protocol)) {
      return `unsafe:${str}`;
    }
  }

  if (checkDataURI(tagName, attribute)) {
    return `unsafe:${str}`;
  }

  return str;
}
