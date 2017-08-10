const merge = require('broccoli-merge-trees');
const funnel = require('broccoli-funnel');
const UnwatchedDir = require('broccoli-source').UnwatchedDir;

/**
 * The TypeScript compiler doesn't re-emit input `.d.ts` files, so we manually
 * merge type definitions directly from source into the built output.
 */
module.exports = function(jsTree) {
  let definitionsTree = funnel(new UnwatchedDir('packages/@glimmer'), {
    include: ['**/*.d.ts'],
    destDir: '@glimmer'
  });

  return merge([jsTree, definitionsTree]);
}
