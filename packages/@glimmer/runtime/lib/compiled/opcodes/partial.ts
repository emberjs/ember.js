import { Reference, valueForRef } from '@glimmer/reference';
import { APPEND_OPCODES } from '../../opcodes';
import { assert, unwrapHandle, decodeHandle } from '@glimmer/util';
import { check } from '@glimmer/debug';
import { Op, Dict, PartialDefinition, Owner } from '@glimmer/interfaces';
import { CheckReference } from './-debug-strip';
import { CONSTANTS } from '../../symbols';

APPEND_OPCODES.add(Op.InvokePartial, (vm, { op1: _owner, op2: _symbols, op3: _evalInfo }) => {
  let { [CONSTANTS]: constants, stack } = vm;

  let name = valueForRef(check(stack.pop(), CheckReference));
  assert(typeof name === 'string', `Could not find a partial named "${String(name)}"`);

  let owner = constants.getValue<Owner>(decodeHandle(_owner));
  let outerSymbols = constants.getArray<string>(_symbols);
  let evalInfo = constants.getArray<number>(decodeHandle(_evalInfo));

  let handle = vm.runtime.resolver.lookupPartial(name as string, owner);

  assert(handle !== null, `Could not find a partial named "${name}"`);

  let definition = vm.runtime.resolver.resolve<PartialDefinition>(handle!);

  let { symbolTable, handle: vmHandle } = definition.getPartial(vm.context);

  {
    let partialSymbols = symbolTable.symbols;
    let outerScope = vm.scope();
    let partialScope = vm.pushRootScope(partialSymbols.length);
    let evalScope = outerScope.getEvalScope();
    partialScope.bindEvalScope(evalScope);
    partialScope.bindSelf(outerScope.getSelf());

    let locals = Object.create(outerScope.getPartialMap()) as Dict<Reference>;

    for (let i = 0; i < evalInfo.length; i++) {
      let slot = evalInfo[i];

      if (slot !== -1) {
        let name = outerSymbols[slot - 1];
        let ref = outerScope.getSymbol(slot);
        locals[name] = ref;
      }
    }

    if (evalScope) {
      for (let i = 0; i < partialSymbols.length; i++) {
        let name = partialSymbols[i];
        let symbol = i + 1;
        let value = evalScope[name];

        if (value !== undefined) partialScope.bind(symbol, value);
      }
    }

    partialScope.bindPartialMap(locals);

    vm.pushFrame(); // sp += 2
    vm.call(unwrapHandle(vmHandle!));
  }
});
