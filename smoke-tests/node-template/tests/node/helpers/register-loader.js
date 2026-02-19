/**
 * Node.js module loader hook that intercepts '@embroider/macros' imports
 * and redirects them to our local shim.
 *
 * Usage: node --import ./tests/node/helpers/register-loader.js --test ...
 */
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shimPath = resolve(__dirname, 'macros-shim.js');
const shimURL = pathToFileURL(shimPath).href;

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@embroider/macros') {
    return { url: ${JSON.stringify(shimURL)}, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`), pathToFileURL(import.meta.url));
