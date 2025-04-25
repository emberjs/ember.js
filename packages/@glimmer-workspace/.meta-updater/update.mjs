import { WORKSPACE_ROOT } from '@glimmer-workspace/repo-metadata';
import { dirname, basename, relative } from 'node:path';
import { $ } from 'zx';
import chalk from 'chalk';

/**
 * @template T
 * @param {string} file
 * @param {T} contents
 * @param {(content: T, file: string) => void | Promise<void>} writer
 */
export async function update(file, contents, writer) {
  // since we're actually writing a file, it's a good place to log that fact that we're updating
  // the file. In `--test` mode, the `meta-updater` harness prints out the dry run information
  // and the `write` function will never be called.
  const dir = dirname(file);
  const base = basename(file);
  const relativeDir = relative(WORKSPACE_ROOT, dir);
  const [prefix, rest] = relativeDir.startsWith('packages/')
    ? ['packages/', relativeDir.slice('packages/'.length)]
    : ['', relativeDir];

  console.error(
    `${chalk.green.bold('updating')} ${chalk.gray.dim(prefix)}${chalk.magenta.underline(
      rest
    )}${chalk.gray(`/`)}${chalk.cyanBright(base)}`
  );

  await writer(contents, file);
  await $({ verbose: false })`eslint --fix ${file}`;
  await $({ verbose: false })`prettier --write ${file}`;
}
