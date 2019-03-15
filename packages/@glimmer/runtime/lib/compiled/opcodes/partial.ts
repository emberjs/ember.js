import { VersionedPathReference } from '@glimmer/reference';
import { APPEND_OPCODES } from '../../opcodes';
import { PartialDefinition } from '@glimmer/opcode-compiler';
import { assert } from '@glimmer/util';
import { check } from '@glimmer/debug';
import { Op, Dict } from '@glimmer/interfaces';
import { CheckReference } from './-debug-strip';
import { CONSTANTS } from '../../symbols';

APPEND_OPCODES.add(
  Op.InvokePartial,
  (vm, { op1: _meta, op2: _symbols, op3: _evalInfo }) => {
    let { [CONSTANTS]: constants, stack } = vm;

    let name = check(stack.pop(), CheckReference).value();
    assert(typeof name === 'string', `Could not find a partial named "${String(name)}"`);

    let meta = constants.getTemplateMeta(_meta);
    let outerSymbols = constants.getStringArray(_symbols);
    let evalInfo = constants.getArray(_evalInfo);

    let handle = vm.runtime.resolver.lookupPartial(name as string, meta);

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

      let locals = Object.create(outerScope.getPartialMap()) as Dict<
        VersionedPathReference<unknown>
      >;

      for (let i = 0; i < evalInfo.length; i++) {
        let slot = evalInfo[i];
        let name = outerSymbols[slot - 1];
        let ref = outerScope.getSymbol(slot);
        locals[name] = ref;
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
      vm.call(vmHandle!);
    }
  },
  'jit'
);
