import type { RecordedConstant, RecordedProgram } from './record';

import { handlerFor } from './handlers';
import { syscallsIn } from './record';
import { BLOCK, LIST, SCOPE, VALUE } from './template';

export const TEMPLATE_MODULE = '@glimmer/opcode-compiler/lib/aot/template';
export const STDLIB_MODULE = '@glimmer/opcode-compiler/lib/opcode-builder/stdlib-data';

export function stdlibExportName(routine: string): string {
  return routine.toUpperCase().replace(/-/g, '_');
}

function lit(value: unknown): string {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

/** Returns the local identifier for an import, adding the import on first use. */
export type Bind = (local: string, module: string, name: string) => string;

/**
 * Prints a recorded block as the `AotBlock` array literal the loader
 * expects. Opcode handlers and stdlib routines print as identifiers that
 * the caller binds to imports; everything else is JSON.
 */
export function printBlock(
  symbols: string[],
  constants: RecordedConstant[],
  programs: RecordedProgram[],
  bind: Bind
): string {
  let handlerLocals = new Set<string>();

  for (const program of programs) {
    for (const type of syscallsIn(program.words)) {
      let handler = handlerFor(type);
      handlerLocals.add(bind(`__op_${handler.name}`, handler.module, handler.name));
    }
  }

  let constantSource = constants.map((entry) => {
    switch (entry.kind) {
      case 'value':
        return `[${VALUE},${lit(entry.value)}]`;
      case 'array':
        return `[${LIST},${lit(entry.value)}]`;
      case 'ref':
        return `[${SCOPE},${entry.ref.index}]`;
      case 'block':
        return `[${BLOCK},${entry.program},${lit(entry.parameters)}]`;
    }
  });

  let programSource = programs.map((program) => {
    let stdlib = program.stdlibRefs.map(
      ([at, routine]) =>
        `[${at},${bind(`__std_${stdlibExportName(routine)}`, STDLIB_MODULE, stdlibExportName(routine))}]`
    );

    return `[[${program.words.join(',')}],${program.size},[${program.constantRefs.join(',')}],[${stdlib.join(',')}]]`;
  });

  return `[${lit(symbols)},[${[...handlerLocals].join(',')}],[${programSource.join(',')}],[${constantSource.join(',')}]]`;
}
