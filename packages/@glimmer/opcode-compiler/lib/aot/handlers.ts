import * as component from '@glimmer/runtime/lib/compiled/opcodes/component';
import * as content from '@glimmer/runtime/lib/compiled/opcodes/content';
import * as debugger_ from '@glimmer/runtime/lib/compiled/opcodes/debugger';
import * as dom from '@glimmer/runtime/lib/compiled/opcodes/dom';
import * as expressions from '@glimmer/runtime/lib/compiled/opcodes/expressions';
import * as lists from '@glimmer/runtime/lib/compiled/opcodes/lists';
import * as vm from '@glimmer/runtime/lib/compiled/opcodes/vm';

export interface HandlerImport {
  module: string;
  name: string;
}

const MODULES: Array<[string, Record<string, unknown>]> = [
  ['@glimmer/runtime/lib/compiled/opcodes/component', component],
  ['@glimmer/runtime/lib/compiled/opcodes/content', content],
  ['@glimmer/runtime/lib/compiled/opcodes/debugger', debugger_],
  ['@glimmer/runtime/lib/compiled/opcodes/dom', dom],
  ['@glimmer/runtime/lib/compiled/opcodes/expressions', expressions],
  ['@glimmer/runtime/lib/compiled/opcodes/lists', lists],
  ['@glimmer/runtime/lib/compiled/opcodes/vm', vm],
];

let table: Map<number, HandlerImport> | null = null;

/**
 * Maps a syscall opcode number to the export that handles it. Build-time
 * only: this module imports every handler.
 */
export function handlerImports(): Map<number, HandlerImport> {
  if (table === null) {
    table = new Map();

    for (const [module, exports] of MODULES) {
      for (const [name, value] of Object.entries(exports)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          typeof (value as { type?: unknown }).type === 'number' &&
          typeof (value as { evaluate?: unknown }).evaluate === 'function'
        ) {
          table.set((value as { type: number }).type, { module, name });
        }
      }
    }
  }

  return table;
}

export function handlerFor(type: number): HandlerImport {
  let found = handlerImports().get(type);

  if (found === undefined) {
    throw new Error(`No runtime handler is exported for opcode ${type}`);
  }

  return found;
}
