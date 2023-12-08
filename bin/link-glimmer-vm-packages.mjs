import { readFileSync } from 'node:fs';
import execa from 'execa';

const packageJsonPath = new URL('../package.json', import.meta.url).pathname;
const packageJson = JSON.parse(await readFileSync(packageJsonPath, { encoding: 'utf8' }));

function shouldLink(dep) {
  return dep.startsWith('@glimmer/') && dep !== '@glimmer/component' && dep !== '@glimmer/env';
}

for (const [dep] of Object.entries(packageJson.dependencies)) {
  if (shouldLink(dep)) {
    await execa('pnpm', ['link', '--global', dep], { stdio: 'inherit' });
  }
}
