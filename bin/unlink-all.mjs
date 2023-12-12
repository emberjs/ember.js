import chalk from 'chalk';
import execa from 'execa';
import glob from 'glob';
import path from 'node:path';

const rootDir = new URL('..', import.meta.url).pathname;

const packageJsonPaths = glob.sync('**/package.json', {
  cwd: rootDir,
  ignore: '**/node_modules/**',
});

for (const packageJsonPath of packageJsonPaths) {
  const packagePath = path.dirname(packageJsonPath);
  // eslint-disable-next-line no-console
  console.log(`Unlinking ${chalk.grey(packagePath)}`);
  await execa('pnpm', ['unlink'], { stdio: 'inherit', cwd: packagePath });
}
