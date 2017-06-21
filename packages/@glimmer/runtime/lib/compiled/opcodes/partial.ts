import { VersionedReference, VersionedPathReference } from '@glimmer/reference';
import { TemplateMeta } from '@glimmer/wire-format';
import { Op } from '@glimmer/vm';
import { APPEND_OPCODES } from '../../opcodes';
import { PartialDefinition } from '../../partial';
import { assert, dict } from "@glimmer/util";
import { Opaque } from "@glimmer/interfaces";

APPEND_OPCODES.add(Op.InvokePartial, (vm, { op1: _meta, op2: _symbols, op3: _evalInfo }) => {
  let { constants, constants: { resolver }, stack } = vm;

  let name = stack.pop<VersionedReference</*Opaque*/ string>>().value();
  assert(typeof name === 'string', `Could not find a partial named "${String(name)}"`);

  let meta = constants.getSerializable<TemplateMeta>(_meta);
  let outerSymbols = constants.getStringArray(_symbols);
  let evalInfo = constants.getArray(_evalInfo);

  let specifier = resolver.lookupPartial(name, meta);

  assert(specifier, `Could not find a partial named "${name}"`);

  let definition = resolver.resolve<PartialDefinition>(specifier!);

  let { symbolTable, handle } = definition.getPartial();

  {
    let partialSymbols = symbolTable.symbols;
    let outerScope = vm.scope();
    let partialScope = vm.pushRootScope(partialSymbols.length, false);
    partialScope.bindCallerScope(outerScope.getCallerScope());
    partialScope.bindEvalScope(outerScope.getEvalScope());
    partialScope.bindSelf(outerScope.getSelf());

    let locals = dict<VersionedPathReference<Opaque>>();

    for (let i = 0; i < evalInfo.length; i++) {
      let slot = evalInfo[i];
      let name = outerSymbols[slot - 1];
      let ref  = outerScope.getSymbol(slot);
      locals[name] = ref;
    }

    let evalScope = outerScope.getEvalScope()!;

    for (let i = 0; i < partialSymbols.length; i++) {
      let name = partialSymbols[i];
      let symbol = i + 1;
      let value = evalScope[name];

      if (value !== undefined) partialScope.bind(symbol, value);
    }

    partialScope.bindPartialMap(locals);

    vm.pushFrame();
    vm.call(handle!);
  }
});
