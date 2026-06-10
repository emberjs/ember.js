// Allow the contents of `debugCallback` without extra annotations
/* eslint-disable @typescript-eslint/no-unused-expressions */
import type { DebuggerInfo, Scope } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { decodeHandle } from '@glimmer/constants/lib/immediate';
import { VM_DEBUGGER_OP } from '@glimmer/constants/lib/syscall-ops';
import { unwrap } from '@glimmer/debug-util/lib/platform-utils';
import { childRefFor, valueForRef } from '@glimmer/reference/lib/reference';

import type { AppendOpcodes } from '../../opcodes';

export type DebugGet = (path: string) => unknown;

export type DebugCallback = (context: unknown, get: DebugGet) => void;

function debugCallback(context: unknown, get: DebugGet): void {
  // eslint-disable-next-line no-console
  console.info('Use `context`, and `get(<path>)` to debug this template.');

  // for example...
  context === get('this');

  // eslint-disable-next-line no-debugger
  debugger;
}

let callback = debugCallback;

// For testing purposes
export function setDebuggerCallback(cb: DebugCallback) {
  callback = cb;
}

export function resetDebuggerCallback() {
  callback = debugCallback;
}

class ScopeInspector {
  #symbols: DebuggerInfo;

  constructor(
    private scope: Scope,
    symbols: DebuggerInfo
  ) {
    this.#symbols = symbols;
  }

  get(path: string): Reference {
    let { scope } = this;
    let symbols = this.#symbols;

    let parts = path.split('.');
    let [head, ...tail] = path.split('.') as [string, ...string[]];

    let ref: Reference;

    if (head === 'this') {
      ref = scope.getSelf();
    } else if (symbols.locals[head]) {
      ref = unwrap(scope.getSymbol(symbols.locals[head]));
    } else {
      ref = this.scope.getSelf();
      tail = parts;
    }

    return tail.reduce((r, part) => childRefFor(r, part), ref);
  }
}

export function defineDebuggerOpcodes(APPEND_OPCODES: AppendOpcodes): void {
  APPEND_OPCODES.add(VM_DEBUGGER_OP, (vm, { op1: _debugInfo }) => {
    let debuggerInfo = vm.constants.getValue<DebuggerInfo>(decodeHandle(_debugInfo));
    let inspector = new ScopeInspector(vm.scope(), debuggerInfo);
    callback(valueForRef(vm.getSelf()), (path) => valueForRef(inspector.get(path)));
  });
}
