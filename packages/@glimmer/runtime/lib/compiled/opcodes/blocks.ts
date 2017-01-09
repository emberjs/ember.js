import { EvaluatedArgs } from '../expressions/args';
import { APPEND_OPCODES, Op as Op } from '../../opcodes';
import { InlineBlock } from '../../scanner';
import { Option, Opaque, fillNulls } from '@glimmer/util';
import { VersionedPathReference } from '@glimmer/reference';

APPEND_OPCODES.add(Op.InvokeBlock, (vm, { op1: positional }) => {
  let stack = vm.evalStack;
  let block = stack.pop<Option<InlineBlock>>();

  let refs = fillNulls<VersionedPathReference<Opaque>>(positional);

  for (let i=positional; i>0; i--) {
    refs[positional - 1] = vm.evalStack.pop<VersionedPathReference<Opaque>>();
  }

  // FIXME: can we avoid doing this when we don't have a block?
  vm.pushCallerScope();

  if (block) {
    vm.invokeBlock(block);
  }
});

APPEND_OPCODES.add(Op.DoneBlock, vm => vm.popScope());