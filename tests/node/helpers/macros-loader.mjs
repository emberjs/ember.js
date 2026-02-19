// ESM loader hook: redirects @embroider/macros imports to the test stub.
import { pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stubUrl = pathToFileURL(`${__dirname}/embroider-macros-stub.mjs`).href;

export function resolve(specifier, context, nextResolve) {
  if (specifier === '@embroider/macros') {
    return { shortCircuit: true, url: stubUrl };
  }
  return nextResolve(specifier, context);
}
