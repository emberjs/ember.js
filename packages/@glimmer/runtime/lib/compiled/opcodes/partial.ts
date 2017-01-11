import { Opaque, Dict } from 'glimmer-util';
import { ReferenceCache, isConst, map } from 'glimmer-reference';
import { Assert } from './vm';
import { PartialDefinition } from '../../partial';
import { SymbolTable } from 'glimmer-interfaces';
import { PartialBlock } from '../../scanner';
import { APPEND_OPCODES, OpcodeName as Op } from '../../opcodes';

APPEND_OPCODES.add(Op.PutDynamicPartial, (vm, { op1: _symbolTable }) => {
  let env = vm.env;
  let symbolTable = vm.constants.getOther<SymbolTable>(_symbolTable);

  function lookupPartial(name: Opaque) {
    let normalized = String(name);

    if (!env.hasPartial(normalized, symbolTable)) {
      throw new Error(`Could not find a partial named "${normalized}"`);
    }

    return env.lookupPartial(normalized, symbolTable);
  }

  let reference = map(vm.frame.getOperand<Opaque>(), lookupPartial);
  let cache = isConst(reference) ? undefined : new ReferenceCache(reference);
  let definition = cache ? cache.peek() : reference.value();

  vm.frame.setImmediate(definition);

  if (cache) {
    vm.updateWith(new Assert(cache));
  }
});

APPEND_OPCODES.add(Op.PutPartial, (vm, { op1: _definition }) => {
  let definition = vm.constants.getOther<PartialDefinition<Opaque>>(_definition);
  vm.frame.setImmediate(definition);
});

APPEND_OPCODES.add(Op.EvaluatePartial, (vm, { op1: _symbolTable, op2: _cache }) => {
  let symbolTable = vm.constants.getOther<SymbolTable>(_symbolTable);
  let cache = vm.constants.getOther<Dict<PartialBlock>>(_cache);

  let { template } = vm.frame.getImmediate<PartialDefinition<Opaque>>();

  let block = cache[template.id];

  if (!block) {
    block = template.asPartial(symbolTable);
  }

  vm.invokePartial(block);
});