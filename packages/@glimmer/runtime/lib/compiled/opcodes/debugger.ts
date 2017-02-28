import { Scope } from '../../environment';
import { VersionedPathReference } from '@glimmer/reference';
import { APPEND_OPCODES, Op } from '../../opcodes';
import { Opaque } from '@glimmer/interfaces';
import { dict } from '@glimmer/util';

export type DebugGet = ((path: string) => Opaque);

export type DebugCallback = ((context: Opaque, get: DebugGet) => void);

/* tslint:disable */
function debugCallback(context: Opaque, get: DebugGet): void {
  console.info('Use `context`, and `get(<path>)` to debug this template.');

  debugger;
}
/* tslint:enable */

let callback = debugCallback;

// For testing purposes
export function setDebuggerCallback(cb: debugCallback) {
  callback = cb;
}

export function resetDebuggerCallback() {
  callback = debugCallback;
}

class ScopeInspector {
  private locals = dict<VersionedPathReference<Opaque>>();

  constructor(private scope: Scope, symbols: string[], evalInfo: number[]) {
    evalInfo.forEach(slot => {
      let name = symbols[slot - 1];
      let ref  = scope.getSymbol(slot);
      this.locals[name] = ref;
    });
  }

  get(path: string): VersionedPathReference<Opaque> {
    let { scope, locals } = this;
    let parts = path.split('.');
    let [head, ...tail] = path.split('.');

    let evalScope = scope.getEvalScope()!;
    let ref: VersionedPathReference<Opaque>;

    if (head === 'this') {
      ref = scope.getSelf();
    } else if (locals[head]) {
      ref = locals[head];
    } else if (head.indexOf('@') === 0 && evalScope[head]) {
      ref = evalScope[head] as VersionedPathReference<Opaque>;
    } else {
      ref = this.scope.getSelf();
      tail = parts;
    }

    return tail.reduce((ref, part) => ref.get(part), ref);
  }
}

APPEND_OPCODES.add(Op.Debugger, (vm, { op1: _symbols, op2: _evalInfo }) => {
  let symbols = vm.constants.getOther<string[]>(_symbols);
  let evalInfo = vm.constants.getArray(_evalInfo);
  let inspector = new ScopeInspector(vm.scope(), symbols, evalInfo);
  callback(vm.getSelf().value(), path => inspector.get(path).value());
});
