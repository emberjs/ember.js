// Universal WASM wrapper — works in both Node.js and browsers.
//
// Lazy-initialized on first call so rollup can tree-shake the WASM bytes
// when a consumer never calls parseTemplateToJson.

import {
  initSync,
  parseTemplateToJson as rawParseTemplateToJson,
} from './standalone/glimmer_template_parser.js';
import { WASM_BYTES_BASE64 } from './wasm-bytes.mjs';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  initSync({ module: base64ToUint8Array(WASM_BYTES_BASE64) });
}

function base64ToUint8Array(base64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function parseTemplateToJson(source, srcName) {
  ensureInit();
  return rawParseTemplateToJson(source, srcName);
}
