/* eslint-disable n/no-process-exit */
import chalk from 'chalk';

import { Emitter } from './opcodes/utils.mjs';

const emitter = Emitter.argv('opcodes.json', import.meta);

const { machine, system } = emitter.opcodes;

const ALL: (string | null)[] = [
  ...machine,
  ...new Array(16 - machine.length).fill(null),
  ...system,
];

const TYPES = ['interface', 'code', 'debug', 'all'] as const;

if (emitter.options.help) {
  usage();
}

if (emitter.type === undefined) {
  usage('Missing type');
}

compute(emitter.type);

function compute(type: string) {
  switch (type) {
    case 'interface': {
      const members = Object.fromEntries(
        ALL.flatMap((name, i) => {
          if (name === null) return [];
          return [[name, i]];
        })
      );

      const INTERFACE_MEMBERS = ALL.flatMap((name, i) => {
        if (name === null) return [];
        return [`  ${name}: ${i};`];
      }).join('\n');

      emitter.writeTarget('interface')([
        `export interface VmOpMap {\n${INTERFACE_MEMBERS}\n}`,
        '',
        `export type VmMachineOp =`,
        ...machine.flatMap((m) => [`// ${m}`, `| ${members[m]}`]),
        '',
        `export type VmSyscallOp =`,
        ...system.flatMap((m) => [`// ${m}`, `| ${members[m]}`]),
        '',
        `export type OpSize = ${ALL.length};`,
      ]);
      break;
    }

    case 'code': {
      const CODE_MEMBERS = ALL.flatMap((name, i) => {
        if (name === null) return [];
        return [`  ${name}: ${i},`];
      }).join('\n');

      emitter.writeTarget('code')([
        `export interface Op {\n${CODE_MEMBERS}\n}`,
        '',
        `export const Op: Op = {\n${CODE_MEMBERS}\n};`,
        '',
        `export const OpSize = ${ALL.length} as const;`,
      ]);
      break;
    }

    case 'debug': {
      emitter.writeTarget('debug')([
        `import type { VmOpMap } from "${emitter.imports.interface}";`,
        '',
        `export const DebugOpList = ${JSON.stringify(
          ALL
        )} as const satisfies { [P in keyof VmOpMap as VmOpMap[P]]: P };`,
        '',
        `export type DebugOpList = ${JSON.stringify(ALL)}`,
      ]);
      break;
    }

    case 'all':
      compute('code');
      compute('interface');
      compute('debug');
      break;

    default:
      usage(`Invalid type ${chalk.cyan(type)}`);
  }
}

function usage(error?: string): never {
  emitter.human(chalk.cyan.inverse('Usage:'), chalk.cyan('node opcodes.mts <type> [target]'));
  emitter.newline();
  emitter.human(
    chalk.yellow(`<type>    `),
    chalk.grey.inverse('one of'),
    chalk.cyanBright(TYPES.join(', '))
  );
  emitter.human(
    chalk.yellow(`[target]  `),
    chalk.grey(`Output path or '-' (defaults to target in opcodes.json).`)
  );
  emitter.newline();
  emitter.human(chalk.yellowBright.inverse('NOTE'));
  emitter.human(
    chalk.yellow(
      `targets in ${chalk.cyan(`opcodes.json`)} are ${chalk.magentaBright(
        'relative to the packages directory'
      )}.`
    )
  );
  emitter.human(
    chalk.yellow(
      `targets ${chalk.cyan('specified on the command-line')} are ${chalk.magentaBright(
        'relative to the workspace root'
      )}.`
    )
  );

  if (error) {
    emitter.newline();
    emitter.human(chalk.red.inverse('ERROR'), chalk.red(error));
  }
  process.exit(error ? 1 : 0);
}
