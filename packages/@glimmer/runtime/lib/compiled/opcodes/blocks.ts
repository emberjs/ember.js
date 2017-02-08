import { APPEND_OPCODES, Op as Op } from '../../opcodes';
import { Block } from '../../scanner';
import { Option, Opaque } from '@glimmer/util';
import { VersionedPathReference } from '@glimmer/reference';

APPEND_OPCODES.add(Op.InvokeBlock, (vm, { op1: positional }) => {
  let stack = vm.evalStack;
  let block = stack.pop<Option<Block>>();

  // FIXME: can we avoid doing this when we don't have a block?
  vm.pushCallerScope();

  if (block) {
    let table = block.symbolTable;
    let locals = table.getSymbols().locals;

    if (locals) {
      for (let i=positional-1; i>=0; i--) {
        let ref = vm.evalStack.pop<VersionedPathReference<Opaque>>();
        vm.scope().bindSymbol(locals[i], ref);
      }
    }

    vm.invokeBlock(block);
  } else {
    for (let i=positional-1; i>=0; i--) {
      vm.evalStack.pop<VersionedPathReference<Opaque>>();
    }
  }
});

APPEND_OPCODES.add(Op.DoneBlock, vm => vm.popScope());
