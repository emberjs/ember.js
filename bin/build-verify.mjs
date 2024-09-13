import { globby } from 'globby';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const currentDir = fileURLToPath(import.meta.url);
const FORBIDDEN = [
  /**
   * import.meta.env is not a platform standard
   */
  'import.meta.env',
  /**
   * These variables are wrapped around code for this repo only
   */
  'VM_LOCAL',
  /**
   * These are for local VM debugging and development, and are not meant to make it to real code
   */
  'check(',
  'CheckInterface',
  'CheckOr',
  'CheckFunction',
  'CheckObject',
];

const IGNORED_DIRS = [`@glimmer/syntax`, `@glimmer/debug`];

let files = await globby(resolve(currentDir, '../../packages/**/dist/**/index.js'), {
  ignore: ['node_modules', '**/node_modules'],
});

files = files.filter((file) => !IGNORED_DIRS.some((dir) => file.includes(dir)));

let errors = [];

console.log(`Found ${files.length} files to check...`);

for (let filePath of files) {
  console.log(`Checking ${filePath}...`);
  let file = await readFile(filePath);
  let content = file.toString();

  for (let searchFor of FORBIDDEN) {
    if (content.includes(searchFor)) {
      errors.push({ filePath, found: searchFor });
    }
  }
}

if (errors.length > 0) {
  console.error(errors);
  throw new Error(`The forbidden texts were encountered in the above files`);
}

console.info('No forbidden texts!');
