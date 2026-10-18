import type { DebuggerInfo, Scope } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { decodeHandle } from '@glimmer/constants/lib/immediate';
import { VM_DEBUGGER_OP } from '@glimmer/constants/lib/syscall-ops';
import { unwrap } from '@glimmer/debug-util/lib/platform-utils';
import { childRefFor, valueForRef } from '@glimmer/reference/lib/reference';

import { getDebuggerCallback } from '../../debugger-callback';
import { APPEND_OPCODES } from '../../opcodes';

// The callback lives in lib/debugger-callback.ts (shared with renderers
// without the VM); these are its public names.
export {
  type DebugCallback,
  type DebugGet,
  resetDebuggerCallback,
  setDebuggerCallback,
} from '../../debugger-callback';

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

APPEND_OPCODES.add(VM_DEBUGGER_OP, (vm, { op1: _debugInfo }) => {
  let debuggerInfo = vm.constants.getValue<DebuggerInfo>(decodeHandle(_debugInfo));
  let inspector = new ScopeInspector(vm.scope(), debuggerInfo);
  getDebuggerCallback()(valueForRef(vm.getSelf()), (path) => valueForRef(inspector.get(path)));
});
