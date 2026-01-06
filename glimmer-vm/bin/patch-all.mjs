import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

import fsExtra from 'fs-extra';

const { readJSONSync, writeJSONSync } = fsExtra;

let file;

if (existsSync('.release-plan.json')) {
  let buffer = await readFile('.release-plan.json');
  let string = buffer.toString();
  file = JSON.parse(string);
}

for (let [pkgName, existing] of Object.entries(file.solution)) {
  let [major, minor, patch] = existing.oldVersion.split('.');
  let newVersion = `${major}.${minor}.${Number(patch) + 1}`;

  let pkgJSONPath = `packages/${pkgName}/package.json`;
  file.solution[pkgName] = {
    ...existing,
    newVersion,
    impact: 'patch',
    pkgJSONPath,
  };
}

await writeFile('.release-plan.json', JSON.stringify(file, null, 2));

// copied from release-plan
// This is temporary just fix the VM release, since it's a bit pressing.
// Loneger term fix for this is happening
// https://github.com/embroider-build/release-plan/pull/79
/**
 * @param {any} solution
 */
function updateVersions(solution) {
  for (const entry of Object.values(solution)) {
    if (entry.impact) {
      const pkg = readJSONSync(entry.pkgJSONPath);
      pkg.version = entry.newVersion;
      writeJSONSync(entry.pkgJSONPath, pkg, { spaces: 2 });
    }
  }
}

updateVersions(file.solution);
