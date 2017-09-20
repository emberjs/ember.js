const Plugin = require('broccoli-plugin');
const glob = require('glob');
const fs = require('fs');
const path = require('path');

/**
 * Writes a TypeScript file that imports each package. This file can be passed
 * to the TypeScript compiler during testing to verify the types are resolving
 * correctly.
 */
class TypesSmokeTestWriter extends Plugin {
  build() {
    let inputPath = this.inputPaths[0];
    let packages = glob.sync('@glimmer/*', { cwd: inputPath });

    let smokeTestPath = path.join(this.outputPath, 'types-smoke-test.ts');

    let id = 0;
    let source = packages.map(pkg => `import * as Pkg${++id} from './${pkg}';`)
      .join('\n');

    fs.writeFileSync(smokeTestPath, source);
  }
}

module.exports = function(inputPath) {
  return new TypesSmokeTestWriter([inputPath]);
}
