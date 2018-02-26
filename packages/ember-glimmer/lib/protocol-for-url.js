/* globals module, URL */

import { environment as emberEnvironment } from 'ember-environment';
import { IS_NODE, require } from 'node-module';

let nodeURL;
let parsingNode;

export default function installProtocolForURL(environment) {
  let protocol;

  if (emberEnvironment.hasDOM) {
    protocol = browserProtocolForURL.call(environment, 'foobar:baz');
  }

  // Test to see if our DOM implementation parses
  // and normalizes URLs.
  if (protocol === 'foobar:') {
    // Swap in the method that doesn't do this test now that
    // we know it works.
    environment.protocolForURL = browserProtocolForURL;
  } else if (typeof URL === 'object') {
    // URL globally provided, likely from FastBoot's sandbox
    nodeURL = URL;
    environment.protocolForURL = nodeProtocolForURL;
  } else if (IS_NODE) {
    // Otherwise, we need to fall back to our own URL parsing.
    // Global `require` is shadowed by Ember's loader so we have to use the fully
    // qualified `module.require`.
    nodeURL = require('url');
    environment.protocolForURL = nodeProtocolForURL;
  } else {
    throw new Error('Could not find valid URL parsing mechanism for URL Sanitization');
  }
}

function browserProtocolForURL(url) {
  if (!parsingNode) {
    parsingNode = document.createElement('a');
  }

  parsingNode.href = url;
  return parsingNode.protocol;
}

function nodeProtocolForURL(url) {
  let protocol = null;
  if (typeof url === 'string') {
    protocol = nodeURL.parse(url).protocol;
  }
  return (protocol === null) ? ':' : protocol;
}
