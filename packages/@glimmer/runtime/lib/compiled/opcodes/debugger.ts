import { Op, Scope } from '@glimmer/interfaces';
import { Reference, childRefFor, valueForRef } from '@glimmer/reference';
import { dict, decodeHandle } from '@glimmer/util';
import { APPEND_OPCODES } from '../../opcodes';
import { CONSTANTS } from '../../symbols';

export type DebugGet = (path: string) => unknown;

export type DebugCallback = (context: unknown, get: DebugGet) => void;

function debugCallback(context: unknown, get: DebugGet): void {
  // eslint-disable-next-line no-console
  console.info('Use `context`, and `get(<path>)` to debug this template.');

  // for example...
  // eslint-disable-next-line no-unused-expressions
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

  constructor(private scope: Scope, symbols: string[], evalInfo: number[]) {
    for (let i = 0; i < evalInfo.length; i++) {
      let slot = evalInfo[i];
      let name = symbols[slot - 1];
      let ref = scope.getSymbol(slot);
      this.locals[name] = ref;
    }
  }

  get(path: string): Reference {
    let { scope, locals } = this;
    let parts = path.split('.');
    let [head, ...tail] = path.split('.');

    let evalScope = scope.getEvalScope()!;
    let ref: Reference;

    if (head === 'this') {
      ref = scope.getSelf();
    } else if (locals[head]) {
      ref = locals[head];
    } else if (head.indexOf('@') === 0 && evalScope[head]) {
      ref = evalScope[head] as Reference;
    } else {
      ref = this.scope.getSelf();
      tail = parts;
    }

    return tail.reduce((r, part) => childRefFor(r, part), ref);
  }
}

APPEND_OPCODES.add(Op.Debugger, (vm, { op1: _symbols, op2: _evalInfo }) => {
  let symbols = vm[CONSTANTS].getArray<string>(_symbols);
  let evalInfo = vm[CONSTANTS].getValue<number[]>(decodeHandle(_evalInfo));
  let inspector = new ScopeInspector(vm.scope(), symbols, evalInfo);
  callback(valueForRef(vm.getSelf()), (path) => valueForRef(inspector.get(path)));
});
