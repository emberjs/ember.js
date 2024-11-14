import type { Scope } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { decodeHandle, VM_DEBUGGER_OP } from '@glimmer/constants';
import { unwrap } from '@glimmer/debug-util';
import { childRefFor, valueForRef } from '@glimmer/reference';
import { dict } from '@glimmer/util';

import { APPEND_OPCODES } from '../../opcodes';

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
  private locals = dict<Reference>();

  constructor(
    private scope: Scope,
    symbols: string[],
    debugInfo: number[]
  ) {
    for (const slot of debugInfo) {
      let name = unwrap(symbols[slot - 1]);
      let ref = scope.getSymbol(slot);
      this.locals[name] = ref;
    }
  }

  get(path: string): Reference {
    let { scope, locals } = this;
    let parts = path.split('.');
    let [head, ...tail] = path.split('.') as [string, ...string[]];

    let debuggerScope = scope.getDebuggerScope()!;
    let ref: Reference;

    if (head === 'this') {
      ref = scope.getSelf();
    } else if (locals[head]) {
      ref = unwrap(locals[head]);
    } else if (head.indexOf('@') === 0 && debuggerScope[head]) {
      ref = debuggerScope[head] as Reference;
    } else {
      ref = this.scope.getSelf();
      tail = parts;
    }

    return tail.reduce((r, part) => childRefFor(r, part), ref);
  }
}

APPEND_OPCODES.add(VM_DEBUGGER_OP, (vm, { op1: _symbols, op2: _debugInfo }) => {
  let symbols = vm.constants.getArray<string>(_symbols);
  let debugInfo = vm.constants.getArray<number>(decodeHandle(_debugInfo));
  let inspector = new ScopeInspector(vm.scope(), symbols, debugInfo);
  callback(valueForRef(vm.getSelf()), (path) => valueForRef(inspector.get(path)));
});
