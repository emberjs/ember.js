import { Op, JitOrAotBlock, Scope } from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { dict } from '@glimmer/util';
import { APPEND_OPCODES } from '../../opcodes';
import { CONSTANTS } from '../../symbols';

export type DebugGet = ((path: string) => unknown);

export type DebugCallback = ((context: unknown, get: DebugGet) => void);

/* tslint:disable */
function debugCallback(context: unknown, get: DebugGet): void {
  console.info('Use `context`, and `get(<path>)` to debug this template.');

  // for example...
  context === get('this');

  debugger;
}
/* tslint:enable */

let callback = debugCallback;

// For testing purposes
export function setDebuggerCallback(cb: DebugCallback) {
  callback = cb;
}

export function resetDebuggerCallback() {
  callback = debugCallback;
}

class ScopeInspector<C extends JitOrAotBlock> {
  private locals = dict<VersionedPathReference<unknown>>();

  constructor(private scope: Scope<C>, symbols: string[], evalInfo: number[]) {
    for (let i = 0; i < evalInfo.length; i++) {
      let slot = evalInfo[i];
      let name = symbols[slot - 1];
      let ref = scope.getSymbol(slot);
      this.locals[name] = ref;
    }
  }

  get(path: string): VersionedPathReference<unknown> {
    let { scope, locals } = this;
    let parts = path.split('.');
    let [head, ...tail] = path.split('.');

    let evalScope = scope.getEvalScope()!;
    let ref: VersionedPathReference<unknown>;

    if (head === 'this') {
      ref = scope.getSelf();
    } else if (locals[head]) {
      ref = locals[head];
    } else if (head.indexOf('@') === 0 && evalScope[head]) {
      ref = evalScope[head] as VersionedPathReference<unknown>;
    } else {
      ref = this.scope.getSelf();
      tail = parts;
    }

    return tail.reduce((r, part) => r.get(part), ref);
  }
}

APPEND_OPCODES.add(Op.Debugger, (vm, { op1: _symbols, op2: _evalInfo }) => {
  let symbols = vm[CONSTANTS].getStringArray(_symbols);
  let evalInfo = vm[CONSTANTS].getArray(_evalInfo);
  let inspector = new ScopeInspector(vm.scope(), symbols, evalInfo);
  callback(vm.getSelf().value(), path => inspector.get(path).value());
});
