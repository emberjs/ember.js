#!/usr/bin/env node
// @ts-check

import fs from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const TYPES_DIR = join(cwd(), 'types', 'stable');

fs.writeFileSync(
  join(TYPES_DIR, 'tsconfig.json'),
  `{
  "extends": "@tsconfig/ember/tsconfig.json",
  "compilerOptions": {
    "baseUrl": "."
  }
}
`
);

fs.writeFileSync(
  join(TYPES_DIR, 'ember', 'tsconfig.json'),
  `{
  "extends": "../tsconfig.json"
}
`
);

const NAMESPACE_CONFIG = `{
  "extends": "../../tsconfig.json"
}
`;

[join(TYPES_DIR, '@ember'), join(TYPES_DIR, '@glimmer')]
  .flatMap((dirName) =>
    fs.readdirSync(dirName, { withFileTypes: true }).map((dirent) => ({ dirName, dirent }))
  )
  .filter(({ dirent }) => dirent.isDirectory())
  .forEach(({ dirName, dirent: { name } }) => {
    let fileName = join(dirName, name, 'tsconfig.json');
    // eslint-disable-next-line no-console, no-undef
    console.log(`printing to ${fileName}`);
    try {
      fs.writeFileSync(fileName, NAMESPACE_CONFIG);
    } catch (e) {
      // eslint-disable-next-line no-console, no-undef
      console.error(`error writing to ${fileName}: ${e}`);
    }
  });
