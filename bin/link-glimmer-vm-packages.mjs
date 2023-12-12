import { readFileSync } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import execa from 'execa';
import glob from 'glob';

const rootDir = new URL('..', import.meta.url).pathname;

const packageJsonPaths = glob.sync('**/package.json', {
  cwd: rootDir,
  ignore: '**/node_modules/**',
});

function shouldLink(dep) {
  return (
    dep.startsWith('@glimmer/') &&
    dep !== '@glimmer/component' &&
    dep !== '@glimmer/env' &&
    dep !== '@glimmer/tracking'
  );
}

const link = packageJsonPaths.map(async (packageJsonPath) => {
  const packagePath = path.dirname(packageJsonPath);

  try {
    const packageJson = JSON.parse(await readFileSync(packageJsonPath, { encoding: 'utf8' }));

    for (const [dep] of Object.entries(packageJson.dependencies ?? {})) {
      if (shouldLink(dep)) {
        // eslint-disable-next-line no-console
        console.log(`Linking ${chalk.yellow(dep)} from ${chalk.grey(packagePath)}`);
        await execa('pnpm', ['link', '--global', dep], { cwd: packagePath });
      }
    }
  } catch (error) {
    let message = `Failed to link ${packagePath}`;

    if (error instanceof Error) {
      message += `\n\n${error.stack}`;
    }

    throw new Error(message);
  }
});

await Promise.all(link);
