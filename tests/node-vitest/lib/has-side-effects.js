import { hasNoSideEffects } from './detect.js';

/**
 * does this have side effects?
 *
 * why is this not a lint?
 * it's not possible to algorithimically know if a module is truely side-effect free
 * (generically, anyway)
 *
 * even this has a ton of hacks, and is generally meant as a tool only to help point us toward things that
 * we need to look at, add annotations, or just declare as side-effect free.
 */
export async function doesHaveSideEffects(filePath) {
  let isGood = await hasNoSideEffects(filePath);

  return !isGood;
}
