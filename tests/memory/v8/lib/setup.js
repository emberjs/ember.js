/**
 * Shared setup for each bench script:
 * a happy-dom window on `globalThis`, `gc()`, and the ember-source modules.
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { Window } from 'happy-dom';

/**
 * mitata runs `gc()` before each iteration only when it exists.
 * This makes each script work with a plain `node <file>`.
 */
if (typeof globalThis.gc !== 'function') {
  setFlagsFromString('--expose-gc');
  globalThis.gc = runInNewContext('gc');
}

/**
 * Ember reads these globals when its modules load,
 * so they must exist before the first import below.
 */
const window = new Window({ url: 'http://localhost/' });
const GLOBALS = [
  'window',
  'document',
  'Node',
  'Element',
  'HTMLElement',
  'SVGElement',
  'Text',
  'Comment',
  'DocumentFragment',
  'Event',
  'CustomEvent',
  'MutationObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'navigator',
  'location',
];

for (let key of GLOBALS) {
  Object.defineProperty(globalThis, key, {
    value: key === 'window' ? window : window[key],
    configurable: true,
    writable: true,
  });
}

/**
 * `EMBER_SOURCE` is a checkout of ember-source with a built `dist/`.
 * Without it, the scripts use the ember-source of this workspace.
 */
const EMBER_SOURCE = process.env['EMBER_SOURCE'];

function load(path) {
  if (EMBER_SOURCE) {
    let file = resolve(EMBER_SOURCE, 'dist/prod/packages', path);

    return import(pathToFileURL(file).href);
  }

  return import(`ember-source/${path}`);
}

export const { renderComponent } = await load('@ember/renderer/index.js');
export const { template } = await load('@ember/template-compiler/runtime.js');
export const { trackedObject } = await load('@ember/reactive/collections.js');
export const { run } = await load('@ember/runloop/index.js');
export const { destroy } = await load('@ember/destroyable/index.js');

export const emberSource = EMBER_SOURCE ?? 'workspace';

/**
 * A new element in the document, for one render.
 */
export function makeElement() {
  let element = document.createElement('div');

  document.body.append(element);

  return element;
}
