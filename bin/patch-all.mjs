import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

let file;

if (existsSync('.release-plan.json')) {
  let buffer = await readFile('.release-plan.json');
  let string = buffer.toString();
  file = JSON.parse(string);
}

for (let [pkgName, existing] of Object.entries(file.solution)) {
  let [major, minor, patch] = existing.oldVersion.split('.');
  let newVersion = `${major}.${minor}.${Number(patch) + 1}`;

  file.solution[pkgName] = {
    ...existing,
    newVersion,
    impact: 'patch',
    pkgJSONPath: `packages/${pkgName}/package.json`,
  };
}

await writeFile('.release-plan.json', JSON.stringify(file, null, 2));
